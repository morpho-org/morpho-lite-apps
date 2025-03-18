import { useGhDeployments } from "@/hooks/use-gh-deployments";
import { cn } from "@/lib/utils";
import { BadgeAlert, BadgeCheck, CheckCheck, Copy, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { GITHUB_OWNER, GITHUB_REPO, GITHUB_REPO_URL } from "@/lib/constants";

export function Footer() {
  const [recentlyCopiedText, setRecentlyCopiedText] = useState("");
  useEffect(() => {
    if (recentlyCopiedText === "") return;
    const id = setTimeout(() => setRecentlyCopiedText(""), 300);
    return () => clearTimeout(id);
  }, [recentlyCopiedText]);

  const { data: ghDeployments } = useGhDeployments({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    environment: "IPFS",
  });

  const ipfsDeployments = useMemo(
    () =>
      ghDeployments?.filter(
        (deployment) => deployment.status === "success" && deployment.environment_url !== undefined,
      ),
    [ghDeployments],
  );

  const isLikelyIpfs = useMemo(() => {
    if (window.location.protocol.startsWith("ipfs")) return true;
    if (!ipfsDeployments) return false;

    for (const deployment of ipfsDeployments) {
      if (!deployment.environment_url) continue;
      const cid = deployment.environment_url.replace("https://", "").split(".")[0];
      if (window.location.host.includes(cid)) return true;
    }

    return false;
  }, [ipfsDeployments]);

  return (
    <div className="bg-secondary fixed bottom-0 z-[51] h-[12px] w-full overflow-visible">
      <div
        className={cn(
          "bg-secondary absolute right-[128px] bottom-[12px] h-min w-min rounded-t-lg border-1 border-b-0",
          isLikelyIpfs ? "border-green-400 text-green-400" : "border-amber-300 text-amber-300",
        )}
      >
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex cursor-pointer items-center justify-center gap-1 px-4 pt-1 text-xs font-bold text-nowrap">
              IPFS {isLikelyIpfs ? <BadgeCheck className="h-4 w-4" /> : <BadgeAlert className="h-4 w-4" />}
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-full overflow-y-scroll sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>IPFS Versions</DialogTitle>
              <DialogDescription>
                For better reliability and security, you can use this app through IPFS. It gives you a cryptographic
                guarantee that you're using a specific version of the app, which can help prevent future{" "}
                <a
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://www.bleepingcomputer.com/news/security/lazarus-hacked-bybit-via-breached-safe-wallet-developer-machine/"
                >
                  supply chain attacks.
                </a>
                <br />
                <br />
                Simply click a version number to access the app through dweb. You can also add it to{" "}
                <a
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://rabby.io/?platform=desktop"
                >
                  Rabby Desktop
                </a>{" "}
                by following the tutorial{" "}
                <a
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://github.com/morpho-org/morpho-blue-offchain-public/wiki/IPFS#access-with-rabby-desktop"
                >
                  here.
                </a>
              </DialogDescription>
            </DialogHeader>
            <div className="flex min-w-full">
              <Table className="border-separate border-spacing-y-3">
                <TableHeader className="bg-secondary">
                  <TableRow>
                    <TableHead className="text-primary rounded-l-lg pl-4 text-xs font-light">Version</TableHead>
                    <TableHead className="text-primary text-xs font-light text-nowrap">Source Code</TableHead>
                    <TableHead className="text-primary text-xs font-light text-nowrap">Changelog</TableHead>
                    <TableHead className="text-primary rounded-r-lg text-xs font-light text-nowrap">IPFS CID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ipfsDeployments?.map((deployment, idx) => {
                    const version = ipfsDeployments.length - idx;
                    const cid = deployment.environment_url?.replace("https://", "").split(".")[0];
                    const githubLink = `${GITHUB_REPO_URL}/tree/${deployment.sha}`;
                    const githubDiffLink =
                      idx < ipfsDeployments.length - 1
                        ? `${GITHUB_REPO_URL}/compare/${ipfsDeployments[idx + 1].sha}...${deployment.sha}`
                        : undefined;

                    return (
                      <TableRow className="bg-secondary" key={cid}>
                        <TableCell className="rounded-l-lg p-5">
                          <a
                            className="hover:text-primary/70 flex cursor-pointer items-center gap-1"
                            target="_blank"
                            rel="noopener noreferrer"
                            href={deployment.environment_url}
                          >
                            {version}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </TableCell>
                        <TableCell className="font-mono">
                          <a
                            className="text-blue-300 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                            href={githubLink}
                          >
                            {deployment.sha.slice(0, 7)}
                          </a>
                        </TableCell>
                        <TableCell>
                          {githubDiffLink ? (
                            <a
                              className="text-blue-300 underline"
                              target="_blank"
                              rel="noopener noreferrer"
                              href={githubDiffLink}
                            >
                              {`v${version - 1} → v${version}`}
                            </a>
                          ) : (
                            "－"
                          )}
                        </TableCell>
                        <TableCell className="rounded-r-lg font-mono">
                          {cid ? (
                            <div
                              className="hover:text-primary/70 flex cursor-pointer items-center gap-1"
                              onClick={() => {
                                navigator.clipboard.writeText(cid);
                                setRecentlyCopiedText(cid);
                              }}
                            >
                              {`${cid.slice(0, 4)}..${cid.slice(-4)}`}
                              {cid === recentlyCopiedText ? (
                                <CheckCheck className="h-4 w-4 text-green-400" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </div>
                          ) : (
                            "－"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
