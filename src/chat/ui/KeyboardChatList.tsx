import { useCallback, useEffect, useRef } from 'react';
import type { ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import { AnimatedLegendList } from '@legendapp/list/reanimated';
import type { LegendListRef } from '@legendapp/list/react-native';
import { KeyboardChatScrollView } from 'react-native-keyboard-controller';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useCombinedRef } from './useCombinedRef';
import type { ChatAnchor, ChatMessage, LiftBehavior } from '../types';

// The positioning engine. Renders messages with a virtualized LegendList and
// keeps a chosen message glued to the top via KeyboardChatScrollView's
// `blankSpace` inset — computed from LegendList's measurement API
// (getState / sizeAtIndex / scrollLength / reportContentInset).
//
// Behavior is data-driven: pass an `anchor` directive and the list does the
// rest. It never animates layout, so the keyboard stays at full FPS.
interface Props {
  data: ChatMessage[];
  renderItem: (info: { item: ChatMessage; index: number }) => React.ReactElement;
  /** Positioning directive (from useChat). null = no anchoring. */
  anchor: ChatAnchor | null;
  keyExtractor?: (item: ChatMessage, index: number) => string;
  /** How content reacts to the keyboard. Default 'always'. */
  lift?: LiftBehavior;
  /** Distance between the list bottom and the screen bottom (safe-area inset). */
  offset?: number;
  /** Breathing room so the anchored message isn't clipped at the top edge. */
  topGap?: number;
  /** Shared value of the composer height — keeps the last message above it. */
  extraContentPadding?: SharedValue<number>;
  listRef?: React.Ref<LegendListRef>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

const defaultKeyExtractor = (item: ChatMessage) => item.id;

export function KeyboardChatList({
  data,
  renderItem,
  anchor,
  keyExtractor = defaultKeyExtractor,
  lift = 'always',
  offset = 0,
  topGap = 12,
  extraContentPadding,
  listRef,
  contentContainerStyle,
  style,
}: Props) {
  const innerRef = useRef<LegendListRef | null>(null);
  const combinedRef = useCombinedRef<LegendListRef>(listRef, innerRef);
  const blankSpace = useSharedValue(0);

  const anchorIndex = anchor?.index;
  const hideAnchor = anchor?.hide ?? false;

  // Reserve exactly enough bottom inset so the anchored item sits at the top:
  // blankSpace = viewportHeight - (heights from anchor to end). For 'over' we
  // add the anchored bubble's own height so it scrolls fully off the top.
  const calculateTopItemInset = useCallback(() => {
    if (anchorIndex === undefined || anchorIndex < 0) {
      blankSpace.value = 0;
      innerRef.current?.reportContentInset(null);
      return;
    }
    const state = innerRef.current?.getState();
    if (!state || anchorIndex >= state.data.length || state.scrollLength <= 0) return;

    let contentBelow = 0;
    for (let i = anchorIndex; i < state.data.length; i++) {
      const size = state.sizeAtIndex(i);
      if (size > 0) contentBelow += size;
    }
    const anchorHeight = hideAnchor ? Math.max(state.sizeAtIndex(anchorIndex), 0) : 0;
    const inset = Math.max(0, state.scrollLength - contentBelow - topGap + anchorHeight);

    blankSpace.value = inset;
    innerRef.current?.reportContentInset({ bottom: inset });
  }, [anchorIndex, hideAnchor, topGap, blankSpace]);

  // Recompute when the anchor changes and as item sizes settle during streaming.
  const onMetricsChange = useCallback(() => calculateTopItemInset(), [calculateTopItemInset]);
  const onItemSizeChanged = useCallback(
    (info: { index: number }) => {
      if (anchorIndex !== undefined && info.index >= anchorIndex) calculateTopItemInset();
    },
    [anchorIndex, calculateTopItemInset],
  );

  useEffect(() => calculateTopItemInset(), [calculateTopItemInset]);

  // On a new anchored send, scroll to the end so the inset can pull the anchor
  // to the top. 'down' (anchor === null) intentionally stays in place.
  useEffect(() => {
    if (!anchor) return;
    const id = setTimeout(() => innerRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [anchor]);

  const renderScroll = useCallback(
    (scrollProps: ScrollViewProps) => (
      <KeyboardChatScrollView
        {...scrollProps}
        applyWorkaroundForContentInsetHitTestBug
        blankSpace={blankSpace}
        extraContentPadding={extraContentPadding}
        keyboardLiftBehavior={lift}
        offset={offset}
      />
    ),
    [blankSpace, extraContentPadding, lift, offset],
  );

  return (
    <AnimatedLegendList<ChatMessage>
      ref={combinedRef}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={contentContainerStyle}
      style={style}
      initialScrollAtEnd
      maintainVisibleContentPosition
      renderScrollComponent={renderScroll}
      onMetricsChange={onMetricsChange}
      onItemSizeChanged={onItemSizeChanged}
    />
  );
}
