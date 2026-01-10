import { Button } from "@morpho-org/uikit/components/shadcn/button";
import { useKeyedState } from "@morpho-org/uikit/hooks/use-keyed-state";
import { cn } from "@morpho-org/uikit/lib/utils";
import { Download, XIcon } from "lucide-react";

import { usePWAInstall } from "@/hooks/use-pwa-install";

export function InstallBanner() {
  const { isInstallable, install } = usePWAInstall();
  const [shouldShowBanner, setShouldShowBanner] = useKeyedState(true, "pwa-install-banner", { persist: true });

  if (!isInstallable || !shouldShowBanner) {
    return null;
  }

  const handleInstall = async () => {
    const installed = await install();
    if (installed) {
      setShouldShowBanner(false);
    }
  };

  return (
    <aside
      className={cn(
        "pointer-events-auto flex h-10 min-h-min items-center justify-between px-1 text-sm font-light italic",
        "text-primary-foreground bg-[var(--morpho-banner)]",
      )}
    >
      <div className="flex items-center gap-2 px-2">
        <Download className="h-4 w-4" />
        <span>Install Morpho Lite for a better experience</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="rounded-sm px-2 py-1 text-xs font-medium"
          onClick={handleInstall}
        >
          Install
        </Button>
        <XIcon
          className="hover:bg-accent mx-2 h-6 w-6 cursor-pointer rounded-sm p-1"
          onClick={() => setShouldShowBanner(false)}
        />
      </div>
    </aside>
  );
}
