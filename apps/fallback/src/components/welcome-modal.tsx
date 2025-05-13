import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@morpho-org/uikit/components/shadcn/alert-dialog";
import { useLocalStorage } from "@morpho-org/uikit/hooks/use-local-storage";

import { GITHUB_REPO_URL, TERMS_OF_USE } from "@/lib/constants";

export function WelcomeModal() {
  const [hasSeenWelcome, setHasSeenWelcome] = useLocalStorage<boolean>("hasSeenWelcome", false);

  const onClose = () => {
    setHasSeenWelcome(true);
  };

  return (
    <AlertDialog open={!hasSeenWelcome}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="mb-3 text-2xl font-light">Welcome!</AlertDialogTitle>
          <AlertDialogDescription className="bg-secondary text-secondary-foreground rounded-lg p-4 font-light">
            You are using the Fallback App.
            <br />
            <br />
            This tool is built for emergencies, so it prioritizes resilience over speed. Please be patient as it loads.
            You can also run it yourself{" "}
            <a className="underline" href={GITHUB_REPO_URL} rel="noopener noreferrer" target="_blank">
              here
            </a>
            .
            <br />
            <br />
            {window.location.host.includes("morpho") ? (
              // Terms for apps hosted by Morpho
              <span>
                By continuing, you agree to Morpho's{" "}
                <a className="underline" href={TERMS_OF_USE} rel="noopener noreferrer" target="_blank">
                  Terms of Use
                </a>
                .
              </span>
            ) : (
              // External OSS disclaimer
              <i>
                This tool is provided “as is”, at your own risk, and without warranties of any kind. No developer or
                entity involved in creating the tool will be liable for any claims or damages whatsoever associated with
                your use, inability to use, or your interaction with other users of, the tool, including any direct,
                indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits,
                cryptocurrencies, tokens, or anything else of value.
              </i>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="w-full rounded-full" onClick={onClose}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
