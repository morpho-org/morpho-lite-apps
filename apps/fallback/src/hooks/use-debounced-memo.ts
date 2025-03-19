import { useEffect, useState } from "react";

export function useDebouncedMemo<T>(factory: () => T, deps: unknown[], delay: number): T {
  const [state, setState] = useState<{ value: T; lastUpdated: number }>(() => ({
    value: factory(),
    lastUpdated: Date.now(),
  }));

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - state.lastUpdated;

    if (elapsed >= delay) {
      // If enough time has passed since the last update, update immediately.
      setState({ value: factory(), lastUpdated: now });
      return;
    }

    // Otherwise, schedule an update for the remaining time.
    const timer = setTimeout(() => {
      setState({ value: factory(), lastUpdated: now });
    }, delay - elapsed);

    // Clean up the timer if the effect is re-run before the delay expires.
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);

  return state.value;
}
