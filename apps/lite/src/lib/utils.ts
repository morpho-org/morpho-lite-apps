import { getTokenSymbolURI as getTokenSymbolURIFromCdn } from "@morpho-org/uikit/lib/utils";
import { Address } from "viem";
import { plumeMainnet } from "viem/chains";

type TokenList = {
  name: string;
  logoURI: string;
  timestamp: string;
  keywords: string[];
  version: { major: number; minor: number; patch: number };
  tokens: { name: string; symbol: string; decimals: number; chainId: number; address: Address; logoURI: string }[];
};

export async function getTokenURI(
  token: { symbol?: string; address: Address; chainId?: number },
  tokenListPaths: { [chainId: number]: string[] } = { [plumeMainnet.id]: ["/assets/token-lists/plume_v1.json"] },
) {
  if (token.chainId !== undefined) {
    try {
      const tokenLists = (await Promise.all(
        tokenListPaths[token.chainId].map((tokenListPath) =>
          fetch(tokenListPath, { cache: "force-cache" }).then((resp) => resp.json()),
        ),
      )) as TokenList[];

      const match = tokenLists
        .map((tokenList) => tokenList.tokens)
        .flat()
        .find((candidate) => candidate.address === token.address && candidate.chainId === token.chainId)?.logoURI;

      if (match) return match;
    } catch {
      /* empty */
    }
  }

  return token.symbol ? getTokenSymbolURIFromCdn(token.symbol) : "";
}
