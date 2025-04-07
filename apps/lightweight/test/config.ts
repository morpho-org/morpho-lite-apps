import { createViemTest } from "@morpho-org/test/vitest";
import { base, mainnet } from "viem/chains";

export const chains = [mainnet, base] as const;

export const rpcUrls: { [K in (typeof chains)[number]["id"]]: `https://${string}` } = {
  [mainnet.id]: `https://eth-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
  [base.id]: `https://base-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
};

export const forkedTest = createViemTest(mainnet, {
  forkUrl: rpcUrls[mainnet.id],
  forkBlockNumber: 22_000_000,
});
