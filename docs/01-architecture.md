# Architecture & integration

## Layers

The module is split into layers with one responsibility each, so any layer can
be used, replaced, or tested on its own.

```
 backend  ─ ChatBackend          where replies come from (mock / fetch / SDK)
   │        (interface only)      knows nothing about React or the keyboard
   ▼
 core     ─ useChat              messages, send(), streaming, anchor directive
   │        (headless hook)       knows nothing about rendering or the keyboard
   ▼
 ui       ─ KeyboardChatList     positioning engine (list + keyboard + anchor)
            MessageBubble        presentational, themeable
            Composer             controlled input
   │
   ▼
 ChatThread                      wires the three together (dismiss-on-send, theme)
   │
   ▼
 demo (src/screens/ChatScreen)   keyword resolver, lift switcher, seed data
```

The arrows are dependencies. Nothing points upward: the backend doesn't import
React, `useChat` doesn't import the keyboard library, and the UI doesn't know
which backend is in use.

## Data flow of one send

```
user types ──▶ Composer ──▶ ChatThread.handleSend
                               │  resolveBehavior(text) -> SendBehavior
                               │  KeyboardController.dismiss()   (stable anchoring)
                               ▼
                            useChat.send(text, { behavior })
                               │  append user message
                               │  derive anchor (ChatAnchor | null)
                               │  append empty assistant message (streaming)
                               │  backend.send(history, callbacks) -> handle
                               ▼
              backend streams ── onToken(fullText) ──▶ setMessages (assistant only)
                               ── onDone()          ──▶ streaming = false
                               ▼
                            KeyboardChatList reacts to `anchor`
                               │  anchor -> anchorToTopIndex + hideAnchor
                               │  compute blankSpace from LegendList measurements
                               │  scrollToEnd so the inset pulls the anchor to top
```

The key seam: **`useChat` produces a declarative `anchor`; `KeyboardChatList`
consumes it.** The engine never calls scroll APIs; the UI never decides
behavior. Behavior is data passed between them.

## The three integration levels

### 1. Whole thread

```tsx
import { ChatThread, mockBackend } from './chat';

<ChatThread
  backend={mockBackend}
  lift="always"
  resolveBehavior={(t) => (t === 'over' ? 'over' : 'default')}
  theme={{ userBubble: '#10A37F' }}
/>
```

### 2. Individual UI parts (your own layout/state)

```tsx
import { KeyboardChatList, Composer, useChat, mockBackend } from './chat';

const { messages, anchor, send } = useChat({ backend: mockBackend });
// render KeyboardChatList + Composer wherever you want
```

### 3. Headless (your own UI entirely)

```tsx
import { useChat, mockBackend } from './chat';

const { messages, isStreaming, send, cancel } = useChat({ backend: mockBackend });
// render with any list / bubble you like; ignore `anchor` if you don't need it
```

## Required providers

`ChatThread` (and `KeyboardChatList`) must be mounted inside these, at the app
root — see [`App.tsx`](../App.tsx):

```tsx
<GestureHandlerRootView style={{ flex: 1 }}>
  <SafeAreaProvider>
    <KeyboardProvider>
      {/* ChatThread here */}
    </KeyboardProvider>
  </SafeAreaProvider>
</GestureHandlerRootView>
```

- `KeyboardProvider` — required by every keyboard-controller component.
- `SafeAreaProvider` — `ChatThread` reads the bottom inset for the composer/offset.
- `GestureHandlerRootView` — needed for the interactive swipe-to-dismiss gesture.

## What lives in the demo vs the module

| Concern | Where | Why |
|---|---|---|
| `big`/`over`/`down` keyword mapping | demo (`resolveBehavior`) | app policy, not chat policy |
| lift switcher UI | demo | a dev affordance |
| seed messages | demo | app data |
| which backend | demo | app choice |
| streaming, positioning, keyboard, theming | module | reusable mechanics |
