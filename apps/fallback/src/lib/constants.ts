import { tac } from "@morpho-org/uikit/lib/chains";
import {
  abstract,
  bsc,
  celo,
  corn,
  etherlink,
  fraxtal,
  hemi,
  ink,
  lisk,
  mode as modeMainnet,
  scroll as scrollMainnet,
  sei,
  soneium,
  sonic,
  zircuit,
} from "wagmi/chains";

export const GITHUB_OWNER = "morpho-org";
export const GITHUB_REPO = "morpho-lite-apps";
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;

export const TERMS_OF_USE = "https://cdn.morpho.org/documents/Morpho_Terms_of_Use.pdf";

/**
 * Chains scheduled to be removed from the fallback app, mapped to the date
 * after which they will no longer be supported. Chains in this map show a
 * deprecation banner with the given date; after the date, remove the chain
 * from `wagmi-config.ts` entirely.
 *
 * Format: `[chainId]: "Month DD, YYYY"` (e.g. `"May 15, 2026"`)
 */
const DEPRECATION_DATE = "May 7, 2026";
export const CHAIN_DEPRECATION_DATES: Record<number, string> = {
  [abstract.id]: DEPRECATION_DATE,
  [bsc.id]: DEPRECATION_DATE,
  [celo.id]: DEPRECATION_DATE,
  [corn.id]: DEPRECATION_DATE,
  [etherlink.id]: DEPRECATION_DATE,
  [fraxtal.id]: DEPRECATION_DATE,
  [hemi.id]: DEPRECATION_DATE,
  [ink.id]: DEPRECATION_DATE,
  [lisk.id]: DEPRECATION_DATE,
  [modeMainnet.id]: DEPRECATION_DATE,
  [scrollMainnet.id]: DEPRECATION_DATE,
  [sei.id]: DEPRECATION_DATE,
  [soneium.id]: DEPRECATION_DATE,
  [sonic.id]: DEPRECATION_DATE,
  [tac.id]: DEPRECATION_DATE,
  [zircuit.id]: DEPRECATION_DATE,
};
