import { type MutableRefObject, useCallback } from 'react';

type RefItem<T> =
  | ((element: T | null) => void)
  | MutableRefObject<T | null>
  | null
  | undefined;

// Merge several refs (callback or object) into one ref callback.
export function useCombinedRef<T>(...refs: RefItem<T>[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((element: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(element);
      else ref.current = element;
    }
  }, refs);
}
