import { defineChain } from "viem";

export const tac = defineChain({
  id: 2390,
  name: "TAC",
  network: "tac",
  nativeCurrency: {
    symbol: "TAC",
    name: "TAC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://turin.rpc.tac.build/"],
    },
  },
  blockExplorers: {
    default: {
      name: "TAC Explorer",
      url: "https://turin.explorer.tac.build",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0,
    },
  },
});
