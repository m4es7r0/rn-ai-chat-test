# Positioning behaviors

After a send, where should the thread settle? Three behaviors, chosen per-send
and passed **into** the engine — never hard-coded.

| `SendBehavior` | Result | Use it for |
|---|---|---|
| `default` | the sent user message pins to the **top**, the reply streams below | normal Q→A, reading the reply from its start |
| `over` | the user message slides **off the top** by its own height; the reply leads at the top | "show me the answer", the question is implied |
| `down` | **no repositioning** — the message just appends | casual chat where you don't want the view to jump |

`big` in the demo is just `default` plus a long reply from the backend — it
tests that a tall reply is read top-down and isn't scrolled to its end.

## How a behavior becomes a position

`useChat` turns a `SendBehavior` into a declarative `ChatAnchor` and nothing more:

```ts
// useChat.ts
setAnchor(behavior === 'down' ? null : { index: userIndex, hide: behavior === 'over' });
```

- `default` → `{ index: userIndex, hide: false }`
- `over`    → `{ index: userIndex, hide: true }`
- `down`    → `null`

`KeyboardChatList` consumes that directive. The engine has no `if (over)`
branches sprinkled through it — the behavior is data.

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
