import { defineChain } from "viem";

export const basecamp = defineChain({
  id: 123420001114,
  name: "Basecamp",
  network: "basecamp",
  nativeCurrency: {
    symbol: "CAMP",
    name: "CAMP",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.basecamp.t.raas.gelato.cloud/", "https://rpc-campnetwork.xyz/"],
    },
  },
  blockExplorers: {
    default: {
      name: "Basecamp Explorer",
      url: "https://basecamp.cloud.blockscout.com",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0,
    },
  },
});
