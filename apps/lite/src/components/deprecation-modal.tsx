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
import { useCallback, useEffect, useState } from "react";

import { CHAIN_DEPRECATION_INFO } from "@/lib/constants";

function getStorageKey(chainId: number | undefined) {
  return `hasSeenDeprecation_${chainId}`;
}

function readFromStorage(chainId: number | undefined): boolean {
  try {
    const item = window.localStorage.getItem(getStorageKey(chainId));
    return item ? (JSON.parse(item) as boolean) : false;
  } catch {
    return false;
  }
}

export function DeprecationModal({ chainId }: { chainId: number | undefined }) {
  const deprecationInfo = chainId !== undefined ? CHAIN_DEPRECATION_INFO[chainId] : undefined;

  const [hasSeenDeprecation, setHasSeenDeprecation] = useState(() => readFromStorage(chainId));

  // Re-read from localStorage when chainId changes
  useEffect(() => {
    setHasSeenDeprecation(readFromStorage(chainId));
  }, [chainId]);

  const onClose = useCallback(() => {
    setHasSeenDeprecation(true);
    try {
      window.localStorage.setItem(getStorageKey(chainId), JSON.stringify(true));
    } catch {
      // Ignore storage errors
    }
  }, [chainId]);

  if (!deprecationInfo) {
    return null;
  }

  return (
    <AlertDialog key={chainId} open={!hasSeenDeprecation}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="mb-3 text-2xl font-light">Important Notice</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="bg-secondary text-secondary-foreground rounded-lg p-4 font-light">
              <p>
                Lite is now reduce-only on {deprecationInfo.chain.name}. You can still repay, withdraw, and close
                positions, but you can&apos;t open new ones.
              </p>
              <p className="mt-4">
                On {deprecationInfo.cutoffDate}, {deprecationInfo.chain.name} will be removed. After that, this chain
                won&apos;t be available in the Lite app.
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
          <AlertDialogAction className="w-full rounded-full" onClick={onClose}>
            I Understand
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
