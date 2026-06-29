# Performance

This chat holds 120 FPS during the keyboard animation and during token
streaming, on a list of arbitrary length. That isn't luck — it's four
deliberate choices. This doc explains **why** each works, **how to keep** it, and
**how to push further**.

## The mental model: two threads

React Native runs JavaScript (your state, `renderItem`, diffing) on the **JS
thread**, and rendering/animation on the **UI thread**. Jank happens when the
work needed to draw the next frame is stuck behind the JS thread.

Everything below is about keeping per-frame work off the JS thread and off the
layout system.

---

## 1. Keyboard tracking never touches layout

**Why it's fast.** Following the keyboard by animating `height`/`padding`/`flex`
re-measures and re-lays-out the list **every frame** (~16ms × the whole
animation). That's the single biggest jank source in chat UIs — it took this
project from 120 → ~50 FPS in an early version.

The module instead uses `contentInset` (`KeyboardChatScrollView`) and
`transform: translateY` (`KeyboardStickyView`), driven by Reanimated keyboard
values on the **UI thread**. These are post-layout, compositor-level — no
re-measure, no JS round-trip.

**Keep it.** Never animate a layout prop to follow the keyboard. Don't add a
`KeyboardAvoidingView`. Don't put `LinearTransition` layout animations on bubbles.
See [keyboard handling](./02-keyboard-handling.md).

---

## 2. Virtualization (LegendList)

**Why it's fast.** Only on-screen items (plus a small buffer) exist as native
views; views are **recycled** as you scroll. Memory and per-frame cost stay
constant whether the thread has 20 messages or 20,000.

**Keep it.** Render items through the list's `renderItem`; don't `.map()` a huge
array into a `ScrollView`. Keep item components light.

**Push further.**
- Provide `estimatedItemSize` (or `getFixedItemSize`) so the first frame renders
  only what's visible instead of a screenful of guesses.
- Enable `recycleItems` for simple, uniform bubbles.
- Raise `drawDistance` only if you see blank flashes during fast scroll — higher
  values pre-render more (more work), so tune, don't max it.

---

## 3. Memoization — streaming touches one bubble

During streaming, a token arrives every ~16–60ms and calls `setMessages`. The
trick is that **only the assistant message's identity changes**:

```ts
// useChat onToken
setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: full } : m));
```

Every other message keeps the same object reference. Because `MessageBubble` is
`React.memo`, those bubbles **skip re-render entirely**. The user's message, the
history — none of them re-render while the reply streams.

**Keep it.**
- Keep `MessageBubble` memoized (it is).
- Keep `renderItem` and `keyExtractor` stable with `useCallback` (they are) — a
  new function identity defeats the list's own memoization.
- Don't recreate message objects you didn't change (the `.map` above only
  replaces the streaming one).
- `useChat`'s `send` is stable (depends only on `backend`) and reads the latest
  messages from a ref — so streaming updates never re-create the composer's
  handlers.

**Degrade it (don't):** passing inline objects/arrays/functions as props to
memoized children, spreading new style arrays each render, or storing the backend
in a variable that's re-created on every render (memoize it or define it at
module scope, like `mockBackend`).

---

## 4. UI-thread animations (Reanimated worklets)

**Why it's fast.** The typing dots (`TypingDots`) and the keyboard interpolation
run as **worklets on the UI thread**. They keep animating at full FPS even while
the JS thread is busy applying streaming `setMessages` updates. A
`setInterval`/`Animated` (non-native) indicator would stutter exactly when the
chat is busiest.

**Keep it.** Animate with Reanimated shared values + `useAnimatedStyle`, not JS
timers driving `setState`. Prefer `transform`/`opacity` (compositor) over
animating layout.

---

## The streaming-specific gotchas

- **Full text vs deltas.** `onToken` passes the full text so the UI update is a
  pure replace. If you instead append per token with string concatenation inside
  `renderItem`, you move work into render. Keep accumulation in the backend
  adapter.
- **Composer growth is a shared value**, not state. A growing multiline input
  extends the scroll reserve (`extraContentPadding`) on the UI thread — it does
  **not** re-render the list.
- **Anchor recompute is guarded.** The `blankSpace` inset is recomputed in
  `onItemSizeChanged` only when the changed index is at/after the anchor — not on
  every unrelated size change.

---

## Checklist

Keep these true and the chat stays smooth:

- [ ] No layout prop (`height`/`padding`/`margin`/`flex`/`top`) is animated to
      follow the keyboard.
- [ ] Messages render through LegendList's `renderItem`, not a mapped ScrollView.
- [ ] `MessageBubble` stays `React.memo`; `renderItem`/`keyExtractor` stay
      `useCallback`.
- [ ] `setMessages` during streaming replaces only the streaming message object.
- [ ] The backend instance is stable across renders (module scope or memoized).
- [ ] Indicators/animations use Reanimated worklets, not JS-timer `setState`.
- [ ] App runs on Hermes + the New Architecture (Expo SDK 56 default — required
      by Reanimated 4 and FlashList/LegendList anyway).

## How to verify

- Toggle the FPS overlay in the Expo/RN dev menu and watch it during keyboard
  open/close and during a long streamed reply.
- React DevTools "Highlight updates": while streaming, only the assistant bubble
  should flash. If others flash, a memoization seam is broken.
- A production/release build (`make apk`) is the real measurement — dev builds
  carry extra overhead.
