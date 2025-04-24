import { Button } from "@morpho-blue-offchain-public/uikit/components/shadcn/button";
import { cn } from "@morpho-blue-offchain-public/uikit/lib/utils";
import { XIcon } from "lucide-react";
import { useState } from "react";

import { GITHUB_REPO_URL } from "@/lib/constants";

export function Header({ className, children, ...props }: React.ComponentProps<"div">) {
  const [shouldShowBanner, setShouldShowBanner] = useState(true);

  return (
    <div className="pointer-events-none fixed top-0 z-50 flex h-screen w-screen flex-col">
      {shouldShowBanner && (
        <aside className="pointer-events-auto flex items-center bg-pink-500 px-1 text-sm font-light italic">
          <span className="grow py-2 text-center">
            This app is built for emergencies, so it prioritizes resilience over speed. Please be patient as it loads.
            You can also run it yourself{" "}
            <a className="underline" href={GITHUB_REPO_URL} rel="noopener noreferrer" target="_blank">
              here.
            </a>
          </span>
          <Button size="sm" variant="ghost" onClick={() => setShouldShowBanner(false)}>
            <XIcon />
          </Button>
        </aside>
      )}
      <header className={cn("bg-primary pointer-events-auto h-16", className)} {...props}>
        {children}
      </header>

      <aside className="flex shrink grow basis-auto flex-col">
        <div className="apply-rounding-blur -z-10 m-[-2px] mt-[-12px] flex grow">
          <svg className="hidden h-0 w-0">
            <defs>
              <filter id="rounding_blur">
                <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -14"
                  result="rounding_blur"
                />
                <feComposite in="SourceGraphic" in2="rounding_blur" operator="atop" />
              </filter>
            </defs>
          </svg>
          <div className="is-frame bg-primary w-full"></div>
        </div>
        {/* <div className="mt-[-10px] h-[12px] bg-slate-100 dark:bg-slate-700"></div> */}
      </aside>
    </div>
  );
}
