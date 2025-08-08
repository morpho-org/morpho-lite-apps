import { SafeLink } from "@morpho-org/uikit/components/safe-link";
import { type Deployments } from "@morpho-org/uikit/lib/deployments";
import { ReactNode } from "react";
import { optimism, plumeMainnet, polygon, worldchain } from "wagmi/chains";

export const APP_DETAILS = {
  // NOTE: Should always match the title in `index.html` (won't break anything, but should be correct)
  name: import.meta.env.VITE_APP_TITLE,
  description: "A minimal and open-source version of the main Morpho App",
  url: "https://lite.morpho.org",
  icon: "/favicon.svg",
};

export const WORDMARK = ""; // Replace with "/your-wordmark.svg" to customize interface

export const MIN_TIMELOCK = 3 * 24 * 60 * 60; // For filtering vaults

export const DEFAULT_CHAIN = plumeMainnet;

export const TRANSACTION_DATA_SUFFIX = "0x117E"; // (L I T E)

export const TERMS_OF_USE = "https://cdn.morpho.org/documents/Morpho_Terms_of_Use.pdf";
export const RISKS_DOCUMENTATION = "https://docs.morpho.org/learn/resources/risks/";
export const ADDRESSES_DOCUMENTATION = "https://docs.morpho.org/getting-started/resources/addresses/";
export const SHARED_LIQUIDITY_DOCUMENTATION = "https://docs.morpho.org/build/borrow/concepts/public-allocator";

export const BANNERS: Record<keyof Deployments, { color: string; text: ReactNode }> = {
  [plumeMainnet.id]: {
    color: "bg-[rgb(255,61,0)]",
    text: (
      <span className="grow py-2 text-center">
        Access additional features and explore incentives via the interfaces offered by{" "}
        <SafeLink className="underline" href="https://app.mysticfinance.xyz">
          Mystic
        </SafeLink>
        {" and "}
        <SafeLink className="underline" href="https://morpho.solera.market/">
          Solera
        </SafeLink>
        .
      </span>
    ),
  },
  [polygon.id]: {
    color: "bg-purple-500",
    text: (
      <span className="grow py-2 text-center">
        Claim rewards and access enhanced features on the external{" "}
        <SafeLink className="underline" href="https://compound.blue">
          Compound Blue
        </SafeLink>{" "}
        interface.
      </span>
    ),
  },
  [optimism.id]: {
    color: "bg-red-500",
    text: (
      <span className="grow py-2 text-center">
        The most popular OP Mainnet markets are also accessible on{" "}
        <SafeLink className="underline" href="https://moonwell.fi">
          Moonwell
        </SafeLink>
        .
      </span>
    ),
  },
  [worldchain.id]: {
    color: "bg-black",
    text: (
      <span className="grow py-2 text-center">
        Claim rewards and access enhanced features on the external{" "}
        <SafeLink className="underline" href="https://oku.trade/morpho/vaults?inputChain=worldchain">
          Oku Trade
        </SafeLink>{" "}
        interface.
      </span>
    ),
  },
};
