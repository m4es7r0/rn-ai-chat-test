# rn-ai-chat-test

Тестовое чат-приложение с AI — фокус на **UI/UX и анимациях**. Бэкенд — локальный
mock (без сети и ключей), который имитирует потоковый ответ модели по словам.

## Стек

| Что | Версия | Зачем |
|---|---|---|
| Expo SDK | 56 | каркас, New Architecture (Fabric) по умолчанию |
| React Native | 0.85.3 | пара, закреплённая SDK 56 |
| react-native-reanimated | 4.x | анимации на UI-потоке (worklets) |
| react-native-worklets | 0.x | обязательный отдельный пакет для Reanimated 4 |
| react-native-keyboard-controller | 1.21.x | плавная синхронизация ввода с клавиатурой |
| react-native-gesture-handler | 2.x | корневой провайдер жестов |
| react-native-safe-area-context | 5.x | безопасные зоны (вырез, home-indicator) |
| @legendapp/list | 3.x | виртуализированный список с measurement-API (anchor/blankSpace) |

> **О версиях.** Библиотеки стоят в версиях, которые `expo install` подбирает как
> совместимые с SDK 56 (reanimated 4.3.1, keyboard-controller 1.21.6) — это чуть
> ниже абсолютного «latest» из npm (4.5.0 / 1.21.13). Так и нужно: матрица
> совместимости Expo важнее свежести минорной версии. Поднять SDK → поднимутся и эти.

## Запуск

```bash
npm install
npx expo start          # затем i (iOS), a (Android), либо QR в Expo Go
# или сразу:
npm run ios
npm run android
```

Нативные модули (reanimated, keyboard-controller, gesture-handler) требуют
**dev build** или Expo Go с подходящей версией. Под Expo Go SDK 56 всё работает.

## Сборка APK (локальный EAS build)

Версия APK берётся из `app.json` → `expo.version` (сейчас **0.0.1**) — единый
источник правды. Эта же версия попадает в имя файла.

```bash
make apk        # = npx eas build --platform android --profile preview --local \
                #     --output build/rn-ai-chat-test-0.0.1.apk
```

Результат: `build/rn-ai-chat-test-0.0.1.apk` (versionName `0.0.1`, versionCode `1`).
Поднять версию — поменять `expo.version` в `app.json`, имя APK подхватится само.

**Требуется для локального билда:** `eas login`, JDK 17 и Android SDK
(`ANDROID_HOME`). Первый запуск предложит сгенерировать keystore.

### Dev build (живые изменения)

Для разработки с Fast Refresh используется **development build** (`expo-dev-client`):
APK ставится на девайс **один раз**, дальше JS-изменения прилетают вживую.

```bash
make apk-dev    # собрать dev-client APK -> build/rn-ai-chat-test-0.0.1-dev.apk
                # установить этот APK на девайс (один раз)
make dev        # npx expo start --dev-client — открыть приложение, оно подцепит Metro
```

Пересобирать `make apk-dev` нужно только при изменении **нативных** зависимостей
(новый native-модуль, версия SDK). Правки в JS/TS подхватываются без пересборки.

`make apk` (preview) — это, наоборот, самодостаточный APK без Metro, для раздачи на тест.

Команды Makefile: `make help` (список), `make version`, `make start`, `make dev`,
`make apk`, `make apk-dev`, `make clean`.

## Архитектура

Чат вынесен в **переиспользуемый модуль [`src/chat/`](src/chat)** (бэкенд за
интерфейсом, headless-логика, UI-части, собранный `<ChatThread>`).
Экран [`src/screens/ChatScreen.tsx`](src/screens/ChatScreen.tsx) — только **демо**
(ключевые слова, переключатель lift, выбор mock-бэкенда).

```tsx
import { ChatThread, mockBackend } from './chat';
<ChatThread backend={mockBackend} />
```

```
App.tsx                       провайдеры: GestureHandlerRootView → SafeArea → KeyboardProvider
src/
  chat/                       ← переиспользуемый модуль
    types.ts  theme.ts  index.ts
    backend/  ChatBackend (контракт) · mockBackend · backendFromAsyncIterable
    core/     useChat (headless: messages, send, streaming, anchor)
    ui/       KeyboardChatList · MessageBubble · Composer · TypingDots
    ChatThread.tsx            собранный компонент
  screens/ChatScreen.tsx      демо: resolveBehavior + lift switcher
```

## Документация

Подробно — в [`docs/`](docs/README.md):

- [Архитектура и интеграция](docs/01-architecture.md) — слои, поток данных, 3 уровня интеграции, провайдеры.
- [Клавиатура](docs/02-keyboard-handling.md) — почему трекинг без layout-thrash.
- [Поведения позиционирования](docs/03-positioning-behaviors.md) — `default/over/down`, математика `anchor`/`blankSpace`.
- [Интеграция бэкенда](docs/04-backend-integration.md) — контракт `ChatBackend`, mock, реальный стриминг.
- [Производительность](docs/05-performance.md) — что держит 120 FPS, как сохранить и улучшить, **почему**.

## Что намеренно опущено (YAGNI)

Навигация, персист истории, реальная сеть/ключи, юнит-тесты — это ручной UI-тест.
Тема настраивается пропсом `theme` у `<ChatThread>`.
