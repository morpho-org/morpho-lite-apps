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
import { useEffect, useState } from "react";

import { CHAIN_DEPRECATION_INFO } from "@/lib/constants";

export function DeprecationModal({ chainId }: { chainId: number | undefined }) {
  const deprecationInfo = chainId !== undefined ? CHAIN_DEPRECATION_INFO[chainId] : undefined;
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
          <AlertDialogTitle className="mb-3 text-2xl font-light">Lite App Deprecation Notice</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="bg-secondary text-secondary-foreground rounded-lg p-4 font-light">
              <p>
                Lite is being deprecated across all ecosystems, including {deprecationInfo.chain.name}, and is now in reduce-only mode.
                Your positions are safe, Morpho vaults and markets are not going away - all positions remain fully accessible from {" "}
                  <SafeLink className="underline" href={deprecationInfo.ecosystemBuilderUrl}>
                    {deprecationInfo.ecosystemBuilder}
                  </SafeLink>{" "}.
              </p> 

              <p className="mt-4">
                <strong className="font-medium">
                  You can still use the Lite app on {deprecationInfo.chain.name} until {deprecationInfo.cutoffDate} to repay, withdraw and close positions, but you can&apos;t open new ones.
                </strong>{" "}
              </p>
              <p className="mt-4 font-medium">What to do next:</p>
              <ul className="mt-2 list-disc pl-5">
                <li>
                  Use{" "}
                  <SafeLink className="underline" href={deprecationInfo.ecosystemBuilderUrl}>
                    {deprecationInfo.ecosystemBuilder}
                  </SafeLink>{" "}
                  to keep using {deprecationInfo.chain.name} with full functionality. Your positions will show there
                  automatically.
                </li>
                <li className="mt-1">
                  Need to exit later? The{" "}
                  <SafeLink className="underline" href="https://fallback.morpho.org">
                    fallback app
                  </SafeLink>{" "}
                  will always let you reduce positions.
                </li>
              </ul>
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
