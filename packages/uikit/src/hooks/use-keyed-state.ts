import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Similar to `React.useState` except the state is determined by `key`.
 *
 * If you pass `{ persist: false }` (the default), state will be reset to its initial value anytime the `key` changes.
 * Passing `{ persist: true }` will instead return the last known value for the current `key`, only using the
 * initial value if that `key` has never been set.
 */
export function useKeyedState<S>(
  initialState: S | (() => S),
  key: PropertyKey | undefined,
  { persist }: { persist: boolean } = { persist: false },
) {
  const [state, setState] = useState<{ s: Map<typeof key, S>; key: typeof key } | undefined>(() => undefined);

  const defaultValue = useRef(typeof initialState === "function" ? (initialState as () => S)() : initialState);

  const currentValue = useMemo(() => {
    const lookup = state !== undefined && (persist || state.key === key);
    return lookup ? (state.s.get(key) ?? defaultValue.current) : defaultValue.current;
  }, [persist, key, state]);

  const setValue = useCallback(
    (update: S | ((prevValue: S) => S)) => {
      setState((prevState) => {
        const lookup = prevState !== undefined && (persist || prevState.key === key);

        const prevValue = lookup ? (prevState.s.get(key) ?? defaultValue.current) : defaultValue.current;
        const newValue = typeof update === "function" ? (update as (prevValue: S) => S)(prevValue) : update;

        if (prevState !== undefined && prevState.key === key && newValue === prevValue) {
          return prevState;
        }

        const newMap = prevState?.s ? new Map(prevState.s) : new Map<typeof key, S>();
        newMap.set(key, newValue);
        return { s: newMap, key };
      });
    },
    [persist, key],
  );

  return [currentValue, setValue] as [S, React.Dispatch<React.SetStateAction<S>>];
}
