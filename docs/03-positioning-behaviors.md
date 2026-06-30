# Positioning behaviors

After a send, where should the thread settle? Three behaviors, chosen per-send
and passed **into** the engine — never hard-coded.

| `SendBehavior` | Result | Use it for |
|---|---|---|
| `default` | the sent user message pins to the **top**, the reply streams below | normal Q→A, reading the reply from its start |
| `over` | the user message slides **off the top** by its own height; the reply leads at the top | "show me the answer", the question is implied |
| `down` | **no top anchor** — append and stick to the **bottom** (scroll into view if off-screen, follow the streaming reply) | casual chat where the newest stays above the input |

`big` in the demo is just `default` plus a long reply from the backend — it
tests that a tall reply is read top-down and isn't scrolled to its end.

## How a behavior becomes a position

`useChat` turns a `SendBehavior` into a declarative `ChatAnchor` and nothing more:

```ts
// useChat.ts
setAnchor(
  behavior === 'down'
    ? { mode: 'bottom' }
    : { mode: 'top', index: userIndex, hide: behavior === 'over' },
);
```

- `default` → `{ mode: 'top', index: userIndex, hide: false }`
- `over`    → `{ mode: 'top', index: userIndex, hide: true }`
- `down`    → `{ mode: 'bottom' }`

`KeyboardChatList` consumes that directive. The engine has no `if (over)`
branches sprinkled through it — the behavior is data. A new object is set per
send, so the list reacts (and scrolls) even when the same behavior repeats.

## `down` — follow the bottom

`down` uses no top anchor. The list instead **sticks to the bottom**:

- On send, it `scrollToEnd` once, so a message that landed off-screen comes into
  view above the input.
- `maintainScrollAtEnd` then follows the streaming reply as it grows, keeping the
  newest content above the input — but only while you're near the bottom, so
  scrolling up to read history isn't interrupted.
- Crucially, `down` disables LegendList's **data-change anchoring**
  (`maintainVisibleContentPosition={{ data: false }}`). With it on (the `top`
  default), adding the reply re-anchors an earlier item and the just-sent message
  visibly jumps up — exactly the bug this avoids.

## The anchor math (`blankSpace`)

LegendList exposes a measurement API (`getState()`, `sizeAtIndex(i)`,
`scrollLength`, `reportContentInset()`). `KeyboardChatScrollView` exposes a
`blankSpace` shared value: a **minimum bottom inset**. To pin item *A* to the top
we reserve enough empty space below the content so that scrolling to the end puts
*A*'s top at the viewport's top:

```ts
// KeyboardChatList.calculateTopItemInset()
contentBelow  = Σ sizeAtIndex(i)  for i in [anchorIndex .. end]
anchorHeight  = hide ? sizeAtIndex(anchorIndex) : 0
blankSpace    = max(0, scrollLength − contentBelow − topGap + anchorHeight)
```

- `scrollLength − contentBelow` puts the anchored item's **top** at the viewport top.
- `− topGap` (default 12) drops it a hair below the edge so it isn't clipped.
- `+ anchorHeight` (only for `over`) pushes the anchored item up by exactly its
  own height, so it leaves the screen and the **next** message (the reply) leads.

That last line is the whole difference between `default` and `over`. Because
`over` keeps the anchor on the *user* message (which already exists at send time)
and just adds its height, there's no mid-stream re-anchoring and no jump.

The inset is recomputed as the reply streams in (`onItemSizeChanged` /
`onMetricsChange`), so the anchored message stays put while the reply grows.

## Why the keyboard is dismissed on send

`ChatThread` calls `KeyboardController.dismiss()` before `send()`
(`dismissKeyboardOnSend`, default `true`). Positioning is then computed against
the **full** viewport.

Without it, the inset is computed against the keyboard-reduced viewport; when the
keyboard later closes from a partially-scrolled position, the content shifts and
the anchored message ends up near the center instead of the top. Dismissing first
removes that whole class of bug. Set `dismissKeyboardOnSend={false}` if you want
the keyboard to stay (and accept the trade-off).

## Tuning

- `topGap` (prop on `ChatThread`/`KeyboardChatList`) — gap above the anchored
  message. 12 is a good default.
- These behaviors rely on LegendList's measurement API. They are **not** portable
  to plain `FlatList`/`FlashList`, which don't expose `getState`/`sizeAtIndex`.
  That's why the module standardizes on LegendList.
