import { useContext } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shadcn/alert-dialog";
import { SafeLinksContext } from "@/hooks/use-safe-links";

export function SafeLinkModal() {
  const { isOpen, href, hideWarning, confirmNavigation } = useContext(SafeLinksContext);

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="border-morpho-yellow bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-morpho-yellow">You're about to leave morpho.org.</AlertDialogTitle>
          <AlertDialogDescription className="text-primary-foreground">
            Morpho is not responsible for the content or security of external websites.
            <br />
            <br />
            Destination: <span className="break-all font-mono underline">{href}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-tertiary hover:bg-tertiary-foreground/25 border-none" onClick={hideWarning}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction className="bg-morpho-brand border-none" onClick={confirmNavigation}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
