import { SafeLink } from "@morpho-org/uikit/components/safe-link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@morpho-org/uikit/components/shadcn/alert-dialog";
import { useEffect, useMemo, useState } from "react";

import { CHAIN_DEPRECATION_INFO } from "@/lib/constants";

export function DeprecationModal({ chainId }: { chainId: number | undefined }) {
  const deprecationInfo = useMemo(
    () => (chainId !== undefined ? CHAIN_DEPRECATION_INFO[chainId] : undefined),
    [chainId],
  );
  const [open, setOpen] = useState(true);

  // Reset to open when chainId changes
  useEffect(() => {
    setOpen(true);
  }, [chainId]);

  if (!deprecationInfo) {
    return null;
  }

  return (
    <AlertDialog key={chainId} open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="mb-3 text-2xl font-light">
            The Morpho app now supports {deprecationInfo.chain.name}!
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="bg-secondary text-secondary-foreground rounded-lg p-4 font-light">
              <p>
                Users can now manage their position on the{" "}
                <SafeLink className="underline" href={deprecationInfo.dashboardUrl}>
                  Dashboard
                </SafeLink>
                .
              </p>
              <p className="mt-4 font-medium">The Lite app has now been sunsetted.</p>
              <p className="mt-4">
                Need to exit later? The{" "}
                <SafeLink className="underline" href="https://fallback.morpho.org">
                  fallback app
                </SafeLink>{" "}
                will always let you reduce positions.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <SafeLink
            href="https://help.morpho.org/en/articles/13560956-morpho-lite-app-deprecation"
            target="_blank"
            className="bg-morpho-gray hover:bg-secondary inline-flex h-9 items-center justify-center rounded-full px-4 py-2 text-sm font-medium"
          >
            Learn More
          </SafeLink>
          <AlertDialogAction className="bg-morpho-error rounded-full hover:bg-red-500">I Understand</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
