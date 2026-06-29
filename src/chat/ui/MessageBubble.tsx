import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { ChatMessage } from '../types';
import type { ChatTheme } from '../theme';
import { TypingDots } from './TypingDots';

interface Props {
  message: ChatMessage;
  theme: ChatTheme;
}

// Presentational, themeable, and memoized: re-renders only when its own message
// object changes. During streaming only the assistant bubble's message identity
// changes, so user bubbles never re-render.
function MessageBubbleBase({ message, theme }: Props) {
  const isUser = message.role === 'user';
  const isTyping = message.streaming && message.text.length === 0;

  return (
    <Animated.View
      entering={message.isNew ? FadeIn.duration(180) : undefined}
      style={[styles.row, isUser ? styles.rowUser : styles.rowAi]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: theme.userBubble }]
            : [styles.aiBubble, { backgroundColor: theme.assistantBubble }],
        ]}
      >
        {isTyping ? (
          <TypingDots color={isUser ? theme.userText : theme.muted} />
        ) : (
          <Text style={[styles.text, { color: isUser ? theme.userText : theme.assistantText }]}>
            {message.text}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

export const MessageBubble = memo(MessageBubbleBase);

const styles = StyleSheet.create({
  row: { width: '100%', paddingHorizontal: 14, marginVertical: 4 },
  rowUser: { alignItems: 'flex-end' },
  rowAi: { alignItems: 'flex-start' },
  bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  userBubble: { borderBottomRightRadius: 6 },
  aiBubble: { borderBottomLeftRadius: 6 },
  text: { fontSize: 16, lineHeight: 22 },
});
