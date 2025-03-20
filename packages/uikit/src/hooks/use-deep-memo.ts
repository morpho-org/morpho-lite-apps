import { useRef } from "react";
import { deepEqual as defaultDeepEqual } from "wagmi";

export function useDeepMemo<T, D extends unknown[]>(
  factory: () => T,
  deps: D,
  deepEqual: (a: D, b: D) => boolean = defaultDeepEqual,
): T {
  // Store both the memoized value and the deps it was computed with.
  const memoized = useRef<{ value: T; deps: D } | null>(null);

  if (memoized.current === null || !deepEqual(memoized.current.deps, deps)) {
    memoized.current = { value: factory(), deps };
  }

  return memoized.current.value;
}
