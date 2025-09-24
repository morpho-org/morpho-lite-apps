import { defineChain } from "viem";

export const hyperevm = defineChain({
  id: 999,
  name: "HyperEVM",
  network: "hyperevm",
  nativeCurrency: {
    symbol: "HYPE",
    name: "HYPE",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        "https://hyperliquid.drpc.org",
        "https://rpc.hyperliquid.xyz/evm",
        "http://rpc.hypurrscan.io/",
        "https://rpc.purroofgroup.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Purrsec",
      url: "https://purrsec.com",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0,
    },
  },
});
