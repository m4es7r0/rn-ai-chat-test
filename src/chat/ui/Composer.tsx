import { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import type { ChatTheme } from '../theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  theme: ChatTheme;
  disabled?: boolean;
  placeholder?: string;
  bottomInset?: number;
  /** `nativeID` links the input to KeyboardGestureArea for interactive dismiss. */
  nativeID?: string;
  onLayout?: (e: LayoutChangeEvent) => void;
}

// Controlled composer. Owns no message state — it just reports text + send, so
// it drops into any state container (useChat or your own).
export function Composer({
  value,
  onChangeText,
  onSend,
  theme,
  disabled,
  placeholder = 'Message…',
  bottomInset = 0,
  nativeID,
  onLayout,
}: Props) {
  const canSend = !!value.trim() && !disabled;
  const handleSend = useCallback(() => {
    if (canSend) onSend();
  }, [canSend, onSend]);

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.bar,
        {
          paddingBottom: bottomInset + 8,
          backgroundColor: theme.composerBackground,
          borderTopColor: theme.border,
        },
      ]}
    >
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBackground,
            borderColor: theme.inputBorder,
            color: theme.inputText,
          },
        ]}
        nativeID={nativeID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.placeholder}
        editable={!disabled}
        multiline
      />
      <Pressable
        style={[styles.send, { backgroundColor: theme.sendButton, opacity: canSend ? 1 : 0.4 }]}
        onPress={handleSend}
        disabled={!canSend}
      >
        <Text style={[styles.sendIcon, { color: theme.sendIcon }]}>↑</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { fontSize: 20, fontWeight: '700' },
});
