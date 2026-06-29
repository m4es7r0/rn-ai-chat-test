import type { ChatBackend, SendParams } from './ChatBackend';

// Adapter: wrap an async-generator that yields token DELTAS into a ChatBackend.
// This is how you plug a modern streaming source (fetch + ReadableStream, SSE,
// or a vendor SDK that returns an async iterator) into the callback-handle
// contract the UI expects.
//
// Example:
//   const backend = backendFromAsyncIterable(async function* ({ text }, signal) {
//     const res = await fetch(url, { signal, ... });
//     for await (const delta of parseSSE(res.body)) yield delta;
//   });
export function backendFromAsyncIterable(
  produce: (params: SendParams, signal: AbortSignal) => AsyncIterable<string>,
): ChatBackend {
  return {
    send(params, { onToken, onDone, onError }) {
      const controller = new AbortController();
      let cancelled = false;

      (async () => {
        let full = '';
        try {
          for await (const delta of produce(params, controller.signal)) {
            if (cancelled) return;
            full += delta;
            onToken(full);
          }
          if (!cancelled) onDone();
        } catch (error) {
          if (!cancelled) onError?.(error);
        }
      })();

      return {
        cancel: () => {
          if (cancelled) return;
          cancelled = true;
          controller.abort();
        },
      };
    },
  };
}
