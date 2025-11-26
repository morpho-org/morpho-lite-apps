import { createViemTest } from "@morpho-org/test/vitest";
import { base, mainnet, optimism, polygon, soneium } from "viem/chains";

export const chains = [mainnet, base, optimism, polygon, soneium] as const;

export const rpcUrls: { [K in (typeof chains)[number]["id"]]: `https://${string}` } = {
  [mainnet.id]: `https://rpc.mevblocker.io`,
  [base.id]: `https://base.gateway.tenderly.co`,
  [optimism.id]: `https://optimism.gateway.tenderly.co`,
  [polygon.id]: `https://polygon.gateway.tenderly.co`,
  [soneium.id]: `https://rpc.soneium.org`,
};

export const testWithMainnetFork = createViemTest(mainnet, {
  forkUrl: rpcUrls[mainnet.id],
  forkBlockNumber: 22_000_000,
});

export const testWithPolygonFork = createViemTest(polygon, {
  forkUrl: rpcUrls[polygon.id],
  forkBlockNumber: 79_501_383,
});
