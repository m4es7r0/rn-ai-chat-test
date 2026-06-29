import { useCallback, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  KeyboardController,
  KeyboardGestureArea,
  KeyboardStickyView,
} from 'react-native-keyboard-controller';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChatBackend } from './backend/ChatBackend';
import { useChat } from './core/useChat';
import { resolveTheme, type ChatTheme } from './theme';
import type { ChatMessage, LiftBehavior, SendBehavior } from './types';
import { Composer } from './ui/Composer';
import { KeyboardChatList } from './ui/KeyboardChatList';
import { MessageBubble } from './ui/MessageBubble';

export interface ChatThreadProps {
  /** Where replies come from (mock, fetch/SSE, SDK…). */
  backend: ChatBackend;
  initialMessages?: ChatMessage[];
  /** Keyboard reaction; can be changed at runtime. Default 'always'. */
  lift?: LiftBehavior;
  /** Map the sent text to a positioning behavior. Default: always 'default'. */
  resolveBehavior?: (text: string) => SendBehavior;
  /** Dismiss the keyboard before positioning (stable anchoring). Default true. */
  dismissKeyboardOnSend?: boolean;
  /** Override the bubble renderer. */
  renderMessage?: (message: ChatMessage) => React.ReactElement;
  theme?: Partial<ChatTheme>;
  placeholder?: string;
  topGap?: number;
}

// Batteries-included thread: wires useChat + KeyboardChatList + Composer.
// Must be rendered inside KeyboardProvider, SafeAreaProvider, and (for the
// interactive gesture) GestureHandlerRootView.
export function ChatThread({
  backend,
  initialMessages,
  lift = 'always',
  resolveBehavior,
  dismissKeyboardOnSend = true,
  renderMessage,
  theme,
  placeholder = 'Message…',
  topGap = 12,
}: ChatThreadProps) {
  const t = resolveTheme(theme);
  const insets = useSafeAreaInsets();
  const { messages, isStreaming, anchor, send } = useChat({ backend, initialMessages });
  const [input, setInput] = useState('');

  // Composer height drives the bottom reserve on the UI thread.
  const composerHeight = useSharedValue(90);
  const onComposerLayout = useCallback(
    (e: LayoutChangeEvent) => {
      composerHeight.value = e.nativeEvent.layout.height;
    },
    [composerHeight],
  );

  const handleSend = useCallback(() => {
    const text = input;
    if (!text.trim() || isStreaming) return;
    setInput('');
    const behavior = resolveBehavior?.(text) ?? 'default';
    const run = () => send(text, { behavior });
    if (dismissKeyboardOnSend) KeyboardController.dismiss().then(run).catch(run);
    else run();
  }, [input, isStreaming, resolveBehavior, send, dismissKeyboardOnSend]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) =>
      renderMessage ? renderMessage(item) : <MessageBubble message={item} theme={t} />,
    [renderMessage, t],
  );

  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <KeyboardGestureArea interpolator="ios" offset={60} style={styles.flex}>
        <KeyboardChatList
          data={messages}
          renderItem={renderItem}
          anchor={anchor}
          lift={lift}
          offset={insets.bottom}
          topGap={topGap}
          extraContentPadding={composerHeight}
          style={styles.flex}
          contentContainerStyle={styles.content}
        />

        <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }} style={styles.composer}>
          <Composer
            value={input}
            onChangeText={setInput}
            onSend={handleSend}
            theme={t}
            disabled={isStreaming}
            placeholder={placeholder}
            bottomInset={insets.bottom}
            nativeID="chat-input"
            onLayout={onComposerLayout}
          />
        </KeyboardStickyView>
      </KeyboardGestureArea>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingVertical: 10 },
  composer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
