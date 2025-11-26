import { defineChain } from "viem";

export const stable = defineChain({
  id: 988,
  name: "Stable Mainnet",
  network: "stable",
  nativeCurrency: {
    symbol: "gUSDT",
    name: "gasUSDT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.stable.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Stable Explorer",
      url: "https://explorer.stable.xyz/",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 2423647,
    },
  },
});
