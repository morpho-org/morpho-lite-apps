import { defineChain } from "viem";

export const tac = defineChain({
  id: 239,
  name: "TAC",
  network: "tac",
  nativeCurrency: {
    symbol: "TAC",
    name: "TAC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.tac.build/", "https://rpc.ankr.com/tac"],
    },
  },
  blockExplorers: {
    default: {
      name: "TAC Explorer",
      url: "https://explorer.tac.build",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0,
    },
  },
});
