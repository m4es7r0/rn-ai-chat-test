# Backend integration

The chat talks to exactly one interface. Implement it and you can stream from a
mock, `fetch`/SSE, a WebSocket, or a vendor SDK — the UI never changes.

## The contract

```ts
// chat/backend/ChatBackend.ts
interface SendParams { messages: ChatMessage[]; text: string }
interface StreamCallbacks {
  onToken: (fullText: string) => void;   // FULL text so far, not the delta
  onDone: () => void;
  onError?: (error: unknown) => void;
}
interface ChatStreamHandle { cancel: () => void }

interface ChatBackend {
  send(params: SendParams, callbacks: StreamCallbacks): ChatStreamHandle;
}
```

Design choices that make integration simple and stable:

- **Callback + handle**, not a Promise: streaming is a series of events with a
  cancel, which maps cleanly to `onToken`/`onDone` + `cancel()`.
- **`onToken` receives the full text**, not deltas. The UI update becomes a pure
  replace (`m.id === id ? { ...m, text: full } : m`) — idempotent and trivial.
  Your adapter accumulates deltas; the UI never has to.
- **`cancel()` must be idempotent.** `useChat` calls it on unmount and before a
  new send.

## Level 1 — the mock (reference implementation)

[`mockBackend.ts`](../src/chat/backend/mockBackend.ts) streams a canned reply
word-by-word with a "thinking" pause. Use `createMockBackend({ thinkingMs, minWordMs, maxWordMs })`
to tune timing. It is the template for any timer/event-driven source.

## Level 2 — an async generator (recommended for real APIs)

Most streaming HTTP sources are naturally async iterators. Wrap one with
`backendFromAsyncIterable` — it handles accumulation, completion, errors, and
cancellation (via `AbortSignal`) for you:

```ts
import { backendFromAsyncIterable } from './chat';

const apiBackend = backendFromAsyncIterable(async function* ({ messages, text }, signal) {
  const res = await fetch('https://your.api/chat', {
    method: 'POST',
    signal,                                  // cancel() aborts the fetch
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // yield token DELTAS as they arrive (parse SSE / NDJSON from res.body)
  for await (const delta of parseTokenStream(res.body)) {
    yield delta;
  }
});

<ChatThread backend={apiBackend} />
```

`yield` deltas; the adapter accumulates and calls `onToken(full)`. A thrown error
becomes `onError`. `cancel()` aborts the signal and stops iteration.

## Level 3 — a raw callback source (WebSocket, SDK with listeners)

Implement `ChatBackend` directly when the source is event-based:

```ts
const wsBackend: ChatBackend = {
  send({ messages }, { onToken, onDone, onError }) {
    let full = '';
    const sub = socket.subscribe(messages, {
      data: (delta) => onToken((full += delta)),
      end: onDone,
      error: onError,
    });
    return { cancel: () => sub.unsubscribe() };
  },
};
```

## Where to map your message shape

`SendParams.messages` is `ChatMessage[]` (`{ id, role, text }`). Translate to your
API's shape inside the adapter (e.g. Anthropic's `{ role, content }`). Keep that
translation in the backend layer so the UI stays vendor-neutral.

## Secrets

Never ship provider keys in the app. Point the backend at **your** server (a thin
proxy that holds the key and forwards the stream). The adapter above already
assumes that — it calls your endpoint, not the vendor directly.

## Errors & cancellation

- `onError` → `useChat` stops streaming and clears the assistant message's
  `streaming` flag. Render an error state from your `renderMessage` if you want.
- A new send cancels the previous stream automatically.
- Unmount cancels the active stream (`useChat` cleanup).
