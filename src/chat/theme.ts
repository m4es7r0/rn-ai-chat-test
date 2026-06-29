// Visual tokens for the default UI. Pass a partial override to ChatThread to
// retheme without forking the components.

export interface ChatTheme {
  background: string;
  userBubble: string;
  userText: string;
  assistantBubble: string;
  assistantText: string;
  composerBackground: string;
  inputBackground: string;
  inputText: string;
  inputBorder: string;
  placeholder: string;
  sendButton: string;
  sendIcon: string;
  border: string;
  muted: string;
}

export const defaultTheme: ChatTheme = {
  background: '#FFFFFF',
  userBubble: '#007AFF',
  userText: '#FFFFFF',
  assistantBubble: '#EAEAEF',
  assistantText: '#0B0B0F',
  composerBackground: '#FFFFFF',
  inputBackground: '#F2F2F7',
  inputText: '#0B0B0F',
  inputBorder: '#C7C7CC',
  placeholder: '#999999',
  sendButton: '#007AFF',
  sendIcon: '#FFFFFF',
  border: '#D9D9DE',
  muted: '#8A8A8E',
};

export function resolveTheme(overrides?: Partial<ChatTheme>): ChatTheme {
  return overrides ? { ...defaultTheme, ...overrides } : defaultTheme;
}
