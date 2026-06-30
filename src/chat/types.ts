// Public types for the reusable chat module.

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  /** Transient: set on a just-added message so the bubble can fade in once. */
  isNew?: boolean;
  /** Assistant message that is currently being streamed. */
  streaming?: boolean;
}

/**
 * How the thread repositions itself after a send.
 * - 'default': the sent user message is pinned to the top, the reply streams below.
 * - 'over':    the sent user message slides off the top by its own height, so the
 *              reply leads at the top.
 * - 'down':    no repositioning — the message just appends in place.
 */
export type SendBehavior = 'default' | 'over' | 'down';

/** How content reacts when the keyboard appears (see keyboard-controller). */
export type LiftBehavior = 'always' | 'whenAtEnd' | 'persistent' | 'never';

/**
 * Positioning directive consumed by KeyboardChatList. Derived from SendBehavior
 * by useChat — UI layers don't build it by hand. A new object per send so the
 * list always reacts.
 * - { mode: 'top', index, hide } — glue a message to the top (default/over).
 *     hide: also push it off the top by its own height (for 'over').
 * - { mode: 'bottom' } — no top anchor; just follow the bottom so the newest
 *     content stays visible above the input (down).
 */
export type ChatAnchor =
  | { mode: 'top'; index: number; hide: boolean }
  | { mode: 'bottom' };
