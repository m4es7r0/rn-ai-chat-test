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
 * by useChat — UI layers don't build it by hand.
 * - index: the message that should be glued to the top.
 * - hide:  also push that message off the top by its own height (for 'over').
 * - null:  no anchoring ('down').
 */
export interface ChatAnchor {
  index: number;
  hide: boolean;
}
