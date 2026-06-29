import type { ChatMessage } from '../types';

// The contract every backend implements. The chat UI talks ONLY to this — it
// never knows whether the reply comes from a mock, fetch/SSE, a WebSocket, or a
// vendor SDK. Swap implementations without touching the UI or state.

export interface SendParams {
  /** Full history INCLUDING the just-sent user message. */
  messages: ChatMessage[];
  /** Convenience: the new user message text. */
  text: string;
}

export interface StreamCallbacks {
  /**
   * Called with the FULL assistant text so far on every update (not the delta).
   * Passing the full text keeps the UI update idempotent and trivial.
   */
  onToken: (fullText: string) => void;
  /** The stream finished successfully. */
  onDone: () => void;
  /** The stream failed. Optional — useChat stops streaming either way. */
  onError?: (error: unknown) => void;
}

export interface ChatStreamHandle {
  /** Stop the in-flight stream. Must be safe to call multiple times. */
  cancel: () => void;
}

export interface ChatBackend {
  /**
   * Start producing a reply. Returns a handle so the caller can cancel
   * (on unmount, on a new send, or on user action).
   */
  send(params: SendParams, callbacks: StreamCallbacks): ChatStreamHandle;
}
