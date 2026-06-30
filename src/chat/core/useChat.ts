import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatBackend, ChatStreamHandle } from '../backend/ChatBackend';
import type { ChatAnchor, ChatMessage, SendBehavior } from '../types';

let counter = 0;
function newId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter.toString(36)}_${Date.now().toString(36)}`;
}

export interface UseChatOptions {
  backend: ChatBackend;
  initialMessages?: ChatMessage[];
}

export interface SendOptions {
  behavior?: SendBehavior;
}

export interface UseChatResult {
  messages: ChatMessage[];
  isStreaming: boolean;
  /** Positioning directive for KeyboardChatList. New object per send. */
  anchor: ChatAnchor | null;
  send: (text: string, options?: SendOptions) => void;
  /** Cancel the in-flight stream. */
  cancel: () => void;
}

/**
 * Headless chat engine. Owns messages, streaming state, and the positioning
 * directive — but knows nothing about the keyboard, scrolling, or rendering.
 * Pair it with KeyboardChatList + Composer, or drive your own UI.
 *
 * `send` is stable (depends only on `backend`); it reads the latest messages
 * from a ref, so streaming token updates never invalidate the callback or cause
 * the composer to re-create handlers.
 */
export function useChat({ backend, initialMessages = [] }: UseChatOptions): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [anchor, setAnchor] = useState<ChatAnchor | null>(null);

  const handle = useRef<ChatStreamHandle | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => () => handle.current?.cancel(), []);

  const send = useCallback(
    (text: string, options?: SendOptions) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const behavior: SendBehavior = options?.behavior ?? 'default';
      const userIndex = messagesRef.current.length;

      // SendBehavior -> positioning directive. New object identity each time so
      // the list reacts even if the same behavior repeats.
      setAnchor(
        behavior === 'down'
          ? { mode: 'bottom' }
          : { mode: 'top', index: userIndex, hide: behavior === 'over' },
      );

      const userMessage: ChatMessage = {
        id: newId('u'),
        role: 'user',
        text: trimmed,
        isNew: true,
      };
      const assistantId = newId('a');
      const history = [...messagesRef.current, userMessage];

      setMessages([
        ...history,
        { id: assistantId, role: 'assistant', text: '', isNew: true, streaming: true },
      ]);
      setIsStreaming(true);

      const finish = () =>
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
        );

      handle.current?.cancel();
      handle.current = backend.send(
        { messages: history, text: trimmed },
        {
          onToken: (full) =>
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, text: full } : m)),
            ),
          onDone: () => {
            finish();
            setIsStreaming(false);
          },
          onError: () => {
            finish();
            setIsStreaming(false);
          },
        },
      );
    },
    [backend],
  );

  const cancel = useCallback(() => {
    handle.current?.cancel();
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, anchor, send, cancel };
}
