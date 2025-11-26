import { createViemTest } from "@morpho-org/test/vitest";
import { base, mainnet, optimism, polygon, soneium } from "viem/chains";

export const chains = [mainnet, base, optimism, polygon, soneium] as const;

export const rpcUrls: { [K in (typeof chains)[number]["id"]]: `https://${string}` } = {
  [mainnet.id]: `https://curator.morpho.org/api/rpc/${mainnet.id}`,
  [base.id]: `https://curator.morpho.org/api/rpc/${base.id}`,
  [optimism.id]: `https://curator.morpho.org/api/rpc/${optimism.id}`,
  [polygon.id]: `https://curator.morpho.org/api/rpc/${polygon.id}`,
  [soneium.id]: `https://curator.morpho.org/api/rpc/${soneium.id}`,
};

export const testWithMainnetFork = createViemTest(mainnet, {
  forkUrl: rpcUrls[mainnet.id],
  forkBlockNumber: 22_000_000,
});

export const testWithPolygonFork = createViemTest(polygon, {
  forkUrl: rpcUrls[polygon.id],
  forkBlockNumber: 79_501_383,
});
