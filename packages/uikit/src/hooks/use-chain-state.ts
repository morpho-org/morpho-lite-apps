import { useCallback, useMemo, useRef, useState } from "react";

export function useChainState<S>(initialState: S | (() => S), chainId: number | undefined) {
  const [map, setMap] = useState(() => new Map<typeof chainId, S>());

  const defaultValue = useRef(typeof initialState === "function" ? (initialState as () => S)() : initialState);

  const currentValue = useMemo(() => map.get(chainId) ?? defaultValue.current, [chainId, map]);

  const setValue = useCallback(
    (update: S | ((prevValue: S) => S)) => {
      setMap((prevMap) => {
        const prevValue = prevMap.get(chainId) ?? defaultValue.current;
        const newValue = typeof update === "function" ? (update as (prevValue: S) => S)(prevValue) : update;

        if (newValue === prevValue) return prevMap;

        const newMap = new Map(prevMap);
        newMap.set(chainId, newValue);
        return newMap;
      });
    },
    [chainId],
  );

  return [currentValue, setValue] as [S, React.Dispatch<React.SetStateAction<S>>];
}

export function useChainStateR<S>(initialState: S | (() => S), chainId: number | undefined) {
  const [state, setState] = useState<{ s: S; chainId: typeof chainId } | undefined>(() => undefined);

  const defaultValue = useRef(typeof initialState === "function" ? (initialState as () => S)() : initialState);

  const currentValue = useMemo(
    () => (state !== undefined && state.chainId === chainId ? state.s : defaultValue.current),
    [chainId, state],
  );

  const setValue = useCallback(
    (update: S | ((prevValue: S) => S)) => {
      setState((prevState) => {
        const chainIdMatches = prevState !== undefined && prevState.chainId === chainId;
        const prevValue = chainIdMatches ? prevState.s : defaultValue.current;
        const newValue = typeof update === "function" ? (update as (prevValue: S) => S)(prevValue) : update;

        return chainIdMatches && newValue === prevValue ? prevState : { s: newValue, chainId };
      });
    },
    [chainId],
  );

  return [currentValue, setValue] as [S, React.Dispatch<React.SetStateAction<S>>];
}
