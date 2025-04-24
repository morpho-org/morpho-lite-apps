import { useEffect, useState } from "react";

/**
 * Tracks whether a modifier key is currently being held.
 *
 * @param modifier One of "Meta", "Control", "Shift", or "Alt".
 *                 - "Meta" = ⌘ on macOS, Windows key on Windows.
 */
export function useModifierKey(modifier: "Meta" | "Control" | "Shift" | "Alt" = "Meta") {
  const [isHeld, setIsHeld] = useState(false);

  useEffect(() => {
    // —— helpers ——————————————————————————
    const updateFromEvent = (e: KeyboardEvent) => setIsHeld(e.getModifierState(modifier));
    const reset = () => setIsHeld(false); // if the tab loses focus

    // —— listeners ————————————————————————
    window.addEventListener("keydown", updateFromEvent);
    window.addEventListener("keyup", updateFromEvent);
    window.addEventListener("blur", reset);

    return () => {
      window.removeEventListener("keydown", updateFromEvent);
      window.removeEventListener("keyup", updateFromEvent);
      window.removeEventListener("blur", reset);
    };
  }, [modifier]);

  return isHeld;
}
