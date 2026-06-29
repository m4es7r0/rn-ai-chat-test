import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChatThread,
  mockBackend,
  type ChatMessage,
  type LiftBehavior,
  type SendBehavior,
} from '../chat';

// ── DEMO layer ───────────────────────────────────────────────────────────────
// Everything app-specific lives here: the keyword → behavior resolver, the lift
// switcher, the seed messages, and the choice of backend. The reusable chat
// module (src/chat) knows nothing about any of it.

const LIFTS: LiftBehavior[] = ['always', 'whenAtEnd', 'persistent', 'never'];

const INITIAL: ChatMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    text: 'Привет! Напиши big / over / down — или любой текст. Сверху можно менять keyboardLiftBehavior.',
  },
  { id: 'm2', role: 'user', text: 'А что делают эти слова?' },
  {
    id: 'm3',
    role: 'assistant',
    text: 'default — твоё сообщение к верху, ответ ниже. big — большой ответ, читается сверху. over — твоё сообщение уходит за верх, ответ ведёт. down — без позиционирования.',
  },
];

// Keyword → positioning behavior. This is the only place the keywords live.
const resolveBehavior = (text: string): SendBehavior => {
  const kw = text.trim().toLowerCase();
  if (kw === 'over') return 'over';
  if (kw === 'down') return 'down';
  return 'default';
};

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [lift, setLift] = useState<LiftBehavior>('always');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Switcher values={LIFTS} active={lift} onSelect={(v) => setLift(v as LiftBehavior)} />
      <ChatThread
        backend={mockBackend}
        initialMessages={INITIAL}
        lift={lift}
        resolveBehavior={resolveBehavior}
        placeholder="big / over / down — или любой текст"
      />
    </View>
  );
}

function Switcher({
  values,
  active,
  onSelect,
}: {
  values: readonly string[];
  active: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.switcher}>
      <Text style={styles.switcherLabel}>lift</Text>
      {values.map((v) => (
        <Text
          key={v}
          onPress={() => onSelect(v)}
          style={[styles.chip, v === active && styles.chipActive]}
        >
          {v}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  switcherLabel: { width: 30, fontSize: 11, color: '#8A8A8E' },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: '#3C3C43',
    backgroundColor: '#E6E6EB',
    overflow: 'hidden',
  },
  chipActive: { backgroundColor: '#007AFF', color: '#FFFFFF' },
});
