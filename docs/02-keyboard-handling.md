# Keyboard handling

This is the mechanism that makes the chat feel native: the input and the message
list track the keyboard frame-for-frame, with no jank, on both platforms.

## The three pieces

| Component | Role | How it moves |
|---|---|---|
| `KeyboardChatScrollView` | scrolls the messages, keeps the last one visible above the keyboard | **`contentInset`** (iOS) / `ClippingScrollView` (Android) |
| `KeyboardStickyView` | holds the composer just above the keyboard | **`transform: translateY`** |
| `KeyboardGestureArea` | interactive swipe-to-dismiss | native gesture |

All three are from `react-native-keyboard-controller`. In this module they live
inside [`KeyboardChatList`](../src/chat/ui/KeyboardChatList.tsx) (the scroll view,
via `renderScrollComponent`) and [`ChatThread`](../src/chat/ChatThread.tsx) (the
sticky composer and gesture area).

## Why it's smooth — the one rule

> **Never animate layout properties to follow the keyboard.**

Animating `height`, `padding`, `margin`, `flex`, or `top` forces React Native to
re-measure and re-lay-out the subtree **every frame** of the keyboard animation.
With a list on screen that means re-measuring the list frame ~16ms apart for the
whole 250ms animation — the classic cause of the FPS drop from 120 → ~50.

`KeyboardChatScrollView` instead **extends the scrollable range via
`contentInset`**, and `KeyboardStickyView` **translates** the composer. Both are
post-layout, compositor-level operations driven by Reanimated keyboard values on
the UI thread. Nothing re-lays-out, so the keyboard animation stays at the
device's full refresh rate.

This project went through the wrong version first (animating a spacer's `height`,
then translating a clipped block) before switching to the official
`KeyboardChatScrollView` pattern — the switch is exactly what fixed the jank.

## `extraContentPadding` — keeping the last message above the input

The composer floats over the list (absolutely positioned, lifted by
`KeyboardStickyView`). To stop it covering the newest message, `KeyboardChatList`
gets `extraContentPadding`: a Reanimated **`SharedValue<number>`** holding the
composer's measured height.

```tsx
// ChatThread.tsx
const composerHeight = useSharedValue(90);
const onComposerLayout = (e) => { composerHeight.value = e.nativeEvent.layout.height; };
// ...
<KeyboardChatList extraContentPadding={composerHeight} ... />
<Composer onLayout={onComposerLayout} ... />
```

Because it's a shared value, a growing multiline composer extends the scroll
reserve **on the UI thread** — no React re-render of the list, no layout
animation.

## `offset` — accounting for the safe area

`KeyboardChatList` receives `offset={insets.bottom}`. It tells
`KeyboardChatScrollView` how far the scroll view bottom sits from the screen
bottom, so it only pushes content by `keyboardHeight - offset` instead of the
full keyboard height. Without it, content over-scrolls by the home-indicator
inset.

## Interactive dismiss

`KeyboardGestureArea` (`interpolator="ios"`) plus `keyboardDismissMode="interactive"`
on the scroll view let the user swipe the list down to dismiss the keyboard, with
the composer and content following the finger. The composer's `TextInput` carries
`nativeID="chat-input"` so the gesture can tie to it.

## Pitfalls

- **Don't** wrap the list in a `KeyboardAvoidingView` as well — it will fight the
  `contentInset` approach and reintroduce layout animation.
- **Don't** give message bubbles `layout` animations (`LinearTransition`) — they
  can conflict with the inset adjustments during the keyboard animation. Bubbles
  here use only a cheap opacity `FadeIn` on first mount.
- **Do** keep `ChatThread` inside `KeyboardProvider`, or none of this is active.
