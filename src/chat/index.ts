// Public surface of the reusable chat module.
// Integrate at any level: <ChatThread/> (all-in-one), the individual UI parts,
// or just the useChat hook with your own UI.

// Types
export type {
  ChatRole,
  ChatMessage,
  SendBehavior,
  LiftBehavior,
  ChatAnchor,
} from './types';

// Backend contract + helpers
export type {
  ChatBackend,
  SendParams,
  StreamCallbacks,
  ChatStreamHandle,
} from './backend/ChatBackend';
export { backendFromAsyncIterable } from './backend/backendFromAsyncIterable';
export { createMockBackend, mockBackend, type MockBackendOptions } from './backend/mockBackend';

// Headless engine
export {
  useChat,
  type UseChatOptions,
  type UseChatResult,
  type SendOptions,
} from './core/useChat';

// UI building blocks
export { KeyboardChatList } from './ui/KeyboardChatList';
export { MessageBubble } from './ui/MessageBubble';
export { Composer } from './ui/Composer';
export { TypingDots } from './ui/TypingDots';

// Theming
export { defaultTheme, resolveTheme, type ChatTheme } from './theme';

// Assembled component
export { ChatThread, type ChatThreadProps } from './ChatThread';
