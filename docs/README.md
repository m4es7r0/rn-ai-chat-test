# Chat module — documentation

A reusable, backend-agnostic AI chat thread for React Native. Smooth keyboard
handling, streaming replies, and configurable post-send positioning — packaged
so you can drop in the whole thread, individual parts, or just the logic.

## Documents

1. [Architecture & integration](./01-architecture.md) — module map, data flow, the three integration levels, provider setup.
2. [Keyboard handling](./02-keyboard-handling.md) — how the input and list track the keyboard without layout thrash.
3. [Positioning behaviors](./03-positioning-behaviors.md) — `default` / `over` / `down`, the anchor/`blankSpace` math.
4. [Backend integration](./04-backend-integration.md) — the `ChatBackend` contract, the mock, and wiring a real streaming API.
5. [Performance](./05-performance.md) — what keeps it at 120 FPS, how to keep it that way, how to push further, and **why**.

## TL;DR

```tsx
import { ChatThread, mockBackend } from './chat';

<ChatThread backend={mockBackend} />
```

Everything else — keyword behaviors, the lift switcher, seed messages — is demo
glue in [`src/screens/ChatScreen.tsx`](../src/screens/ChatScreen.tsx). The
reusable module lives entirely under [`src/chat/`](../src/chat) and depends only
on its public surface in [`src/chat/index.ts`](../src/chat/index.ts).

## Module layout

```
src/chat/
  types.ts                     ChatMessage, SendBehavior, LiftBehavior, ChatAnchor
  theme.ts                     ChatTheme + defaultTheme
  backend/
    ChatBackend.ts             the backend contract (interface only)
    backendFromAsyncIterable   adapter: async-generator -> ChatBackend
    mockBackend.ts             reference implementation (no network)
  core/
    useChat.ts                 headless engine: messages, send(), streaming, anchor
  ui/
    KeyboardChatList.tsx       LegendList + keyboard + anchor/blankSpace mechanism
    MessageBubble.tsx          themeable bubble (+ typing dots)
    Composer.tsx               controlled input + send
    TypingDots.tsx             UI-thread typing indicator
  ChatThread.tsx               assembled, batteries-included component
  index.ts                     public exports
```
