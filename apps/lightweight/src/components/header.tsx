import { useKeyedState } from "@morpho-blue-offchain-public/uikit/hooks/use-keyed-state";
import { cn } from "@morpho-blue-offchain-public/uikit/lib/utils";
import { XIcon } from "lucide-react";

import { BANNERS } from "@/lib/constants";

function Banner(chainId: number | undefined) {
  const [shouldShowBanner, setShouldShowBanner] = useKeyedState(true, chainId, { persist: true });

  if (chainId === undefined || !BANNERS[chainId] || !shouldShowBanner) {
    return { placeholder: undefined, banner: undefined };
  }
  const banner = BANNERS[chainId];

  return {
    placeholder: <div className="h-10 min-h-min"></div>,
    banner: (
      <aside
        className={cn(
          "pointer-events-auto flex h-10 min-h-min items-center px-1 text-sm font-light italic",
          banner.color,
        )}
      >
        {banner.text}
        <XIcon className="hover:bg-accent mx-2 h-6 w-6 rounded-sm p-1" onClick={() => setShouldShowBanner(false)} />
      </aside>
    ),
  };
}

export function Header({ className, children, chainId, ...props }: React.ComponentProps<"div"> & { chainId?: number }) {
  const { placeholder, banner } = Banner(chainId);
  return (
    <>
      {placeholder}
      <div className="pointer-events-none fixed top-0 z-50 flex h-screen w-screen flex-col">
        {banner}
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
    </>
  );
}
