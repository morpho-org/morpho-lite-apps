import { useContext, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shadcn/alert-dialog";
import { AddressScreeningContext } from "@/hooks/use-address-screening";

export function AddressScreeningModal() {
  const { isAuthorized, screen } = useContext(AddressScreeningContext);
  const { disconnectAsync } = useDisconnect();

  const { address } = useAccount();

  useEffect(() => {
    if (!address) return;

    void (async () => {
      // Screen newly-connected wallet, and if it's not authorized, disconnect it programmatically.
      if (!(await screen(address))) return disconnectAsync();
    })();
  }, [address, screen, disconnectAsync]);

  return (
    <AlertDialog open={!isAuthorized}>
      <AlertDialogContent className="border-destructive bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-500">Access Denied</AlertDialogTitle>
          <AlertDialogDescription className="text-primary-foreground">
            We&apos;re sorry, but your address is not permitted to use this application for compliance reasons.
            <br />
            <br />
            If you believe this is an error, please contact us at contact@morpho.org.
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
}
