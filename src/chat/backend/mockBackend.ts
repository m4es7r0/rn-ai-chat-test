import type { ChatBackend } from './ChatBackend';

// Reference ChatBackend implementation: no network, no keys. Streams a canned
// reply word-by-word with a small "thinking" pause, so the UI exercises the same
// incremental-render path a real streaming backend would drive.

const BIG_REPLY = [
  'Это намеренно большой ОТВЕТ от чата — чтобы проверить поведение «читать сверху вниз».',
  '',
  'Пользователь читает длинный ответ от начала, поэтому список НЕ должен доскролливаться к его концу: видно начало ответа, а низ уходит за нижний край.',
  '',
  '1. Первый абзац — добираем высоту.',
  '2. Второй абзац — продолжаем, чтобы ответ заведомо переполнил экран.',
  '3. Третий абзац — теперь точно видно, фиксируется ли верх и не прыгает ли список к концу во время стриминга.',
  '4. Четвёртый абзац — ещё немного текста для надёжности.',
  '',
  'Если ты видишь начало этого ответа сразу после отправки и оно не уезжает вниз по мере печати — поведение работает правильно.',
].join('\n');

const REPLIES = [
  'Принял! Это потоковый ответ от локального mock-AI — слова появляются по одному, как при настоящем стриминге токенов.',
  'Хороший вопрос. Вот пара мыслей:\n\n1. Первое соображение.\n2. Второе — у задачи несколько углов.\n3. Третье — не забывай про практические последствия.\n\nЧто-нибудь ещё?',
];

export interface MockBackendOptions {
  /** Delay before the first token (the "thinking" pause), ms. */
  thinkingMs?: number;
  /** Per-word delay range, ms. */
  minWordMs?: number;
  maxWordMs?: number;
}

function pickReply(text: string, turn: number): string {
  if (text.trim().toLowerCase() === 'big') return BIG_REPLY;
  return REPLIES[turn % REPLIES.length];
}

export function createMockBackend(options: MockBackendOptions = {}): ChatBackend {
  const { thinkingMs = 300, minWordMs = 26, maxWordMs = 62 } = options;
  let turn = 0;

  return {
    send({ text }, { onToken, onDone }) {
      const reply = pickReply(text, turn++);
      const words = reply.split(' ');
      let i = 1;
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      onToken(words[0] ?? '');

      const step = () => {
        if (cancelled) return;
        i += 1;
        if (i <= words.length) {
          onToken(words.slice(0, i).join(' '));
          const jitter = minWordMs + Math.floor(Math.random() * (maxWordMs - minWordMs));
          timer = setTimeout(step, jitter);
        } else {
          onDone();
        }
      };

      timer = setTimeout(step, thinkingMs);

      return {
        cancel: () => {
          cancelled = true;
          if (timer) clearTimeout(timer);
        },
      };
    },
  };
}

/** Ready-to-use default instance. */
export const mockBackend: ChatBackend = createMockBackend();
