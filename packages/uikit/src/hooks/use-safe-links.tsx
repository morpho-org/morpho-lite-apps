import { createContext, useState, ReactNode, useCallback } from "react";

type SafeLinksContextType = {
  isOpen: boolean;
  href: string | null;
  showWarning: (href: string) => void;
  hideWarning: () => void;
  confirmNavigation: () => void;
};

// eslint-disable-next-line react-refresh/only-export-components
export const SafeLinksContext = createContext<SafeLinksContextType>({
  isOpen: false,
  href: null,
  showWarning: () => {},
  hideWarning: () => {},
  confirmNavigation: () => {},
});

export function SafeLinksProvider({ children }: { children: ReactNode }) {
  const [href, setHref] = useState<string | null>(null);

  const showWarning = useCallback((href: string) => {
    setHref(href);
  }, []);

  const hideWarning = useCallback(() => {
    setHref(null);
  }, []);

  const confirmNavigation = useCallback(() => {
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
    }
    hideWarning();
  }, [href, hideWarning]);

  return (
    <SafeLinksContext
      value={{
        isOpen: href != null,
        href,
        showWarning,
        hideWarning,
        confirmNavigation,
      }}
    >
      {children}
    </SafeLinksContext>
  );
}
