import { AnchorHTMLAttributes, ReactNode, useMemo, MouseEvent, useContext } from "react";

import { SafeLinksContext } from "@/hooks/use-safe-links";

export interface SafeLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
}

export function SafeLink({ href, children, className, ...props }: SafeLinkProps) {
  const { showWarning } = useContext(SafeLinksContext);

  const isExternal = useMemo(() => {
    try {
      const url = new URL(href, window.location.origin);
      return !url.hostname.endsWith("morpho.org");
    } catch {
      return false;
    }
  }, [href]);

  return (
    <a
      href={href}
      className={className}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        if (isExternal) {
          e.preventDefault();
          showWarning(href);
        }
      }}
      rel={isExternal ? "noopener noreferrer" : undefined}
      target={isExternal ? "_blank" : undefined}
      {...props}
    >
      {children}
    </a>
  );
}
