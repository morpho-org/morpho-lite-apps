import * as customChains from "@morpho-org/uikit/lib/chains";
import type { Chain, HttpTransportConfig } from "viem";
import {
  CreateConnectorFn,
  createConfig as createWagmiConfig,
  fallback,
  http,
  injected,
  unstable_connector,
  type Transport,
} from "wagmi";
import {
  abstract,
  arbitrum,
  base,
  bsc,
  celo,
  corn,
  etherlink,
  flame,
  fraxtal,
  hemi,
  ink,
  lisk,
  mainnet,
  mode as modeMainnet,
  optimism,
  plumeMainnet,
  polygon,
  scroll as scrollMainnet,
  sei,
  soneium,
  sonic,
  unichain,
  worldchain,
  zircuit,
} from "wagmi/chains";
import { walletConnect } from "wagmi/connectors";

const httpConfig: HttpTransportConfig = {
  retryDelay: 0,
  timeout: 30_000,
};

function createFallbackTransport(rpcs: ({ url: string } & HttpTransportConfig)[]) {
  return fallback(
    [
      ...rpcs.map((rpc) => http(rpc.url, { ...httpConfig, ...(({ url, ...rest }) => rest)(rpc) })),
      unstable_connector(injected, { key: "injected", name: "Injected", retryCount: 0 }),
    ],
    { retryCount: 6, retryDelay: 100 },
  );
}

function createPonderHttp(chainId: number) {
  return [
    {
      url: `https://v1-indexer.marble.live/rpc/${chainId}`,
      batch: false,
      methods: { include: ["eth_getLogs"] },
    },
  ];
}
const chains = [
  // full support
  mainnet,
  base,
  polygon,
  unichain,
  customChains.katana,
  arbitrum,
  customChains.hyperevm,
  // fallback support (alphabetical)
  abstract,
  bsc,
  celo,
  corn,
  etherlink,
  flame,
  fraxtal,
  hemi,
  ink,
  lisk,
  modeMainnet,
  optimism,
  plumeMainnet,
  scrollMainnet,
  sei,
  soneium,
  sonic,
  customChains.tac,
  worldchain,
  zircuit,
  // NOTE: Disabled because RPC rate limits are too strict
  // customChains.basecamp,
  // bitlayer,
] as const;

const transports: Record<(typeof chains)[number]["id"], Transport> = {
  // full support
  [mainnet.id]: createFallbackTransport([
    ...createPonderHttp(mainnet.id),
    { url: "https://rpc.mevblocker.io", batch: { batchSize: 10 } },
    { url: "https://rpc.ankr.com/eth", batch: { batchSize: 10 } },
    { url: "https://eth-pokt.nodies.app", batch: false },
    { url: "https://eth.drpc.org", batch: false },
    { url: "https://eth.merkle.io", batch: false },
  ]),
  [base.id]: createFallbackTransport([
    ...createPonderHttp(base.id),
    { url: "https://base.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://base.drpc.org", batch: false },
    { url: "https://mainnet.base.org", batch: { batchSize: 10 } },
    { url: "https://base.lava.build", batch: false },
  ]),
  [polygon.id]: createFallbackTransport([
    ...createPonderHttp(polygon.id),
    { url: "https://polygon.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://polygon.drpc.org", batch: false },
  ]),
  [unichain.id]: createFallbackTransport([
    ...createPonderHttp(unichain.id),
    { url: "https://unichain.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://mainnet.unichain.org", batch: false },
    { url: "https://unichain.drpc.org", batch: false },
  ]),
  [customChains.katana.id]: createFallbackTransport([
    ...createPonderHttp(customChains.katana.id),
    { url: "https://katana.gateway.tenderly.co", batch: { batchSize: 10 } },
    ...customChains.katana.rpcUrls.default.http.map((url) => ({ url, batch: false })),
  ]),
  [arbitrum.id]: createFallbackTransport([
    ...createPonderHttp(arbitrum.id),
    { url: "https://arbitrum.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://rpc.ankr.com/arbitrum", batch: { batchSize: 10 } },
    { url: "https://arbitrum.drpc.org", batch: false },
  ]),
  [customChains.hyperevm.id]: createFallbackTransport([
    ...createPonderHttp(customChains.hyperevm.id),
    ...customChains.hyperevm.rpcUrls.default.http.map((url) => ({ url, batch: false })),
  ]),
  // fallback support
  [ink.id]: createFallbackTransport([
    { url: "https://ink.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://rpc-gel.inkonchain.com", batch: false },
    { url: "https://rpc-qnd.inkonchain.com", batch: false },
    { url: "https://ink.drpc.org", batch: false },
  ]),
  [optimism.id]: createFallbackTransport([
    { url: "https://optimism.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://op-pokt.nodies.app", batch: { batchSize: 10 } },
    { url: "https://optimism.drpc.org", batch: false },
    { url: "https://optimism.lava.build", batch: false },
  ]),
  [abstract.id]: createFallbackTransport([{ url: "https://api.mainnet.abs.xyz", batch: false }]),
  [bsc.id]: createFallbackTransport([
    { url: "https://bnb.rpc.subquery.network/public", batch: false },
    { url: "https://bsc.rpc.blxrbdn.com", batch: false },
    { url: "https://bsc-dataseed.bnbchain.org", batch: false },
    { url: "https://bsc.drpc.org", batch: false },
  ]),
  [celo.id]: createFallbackTransport([{ url: "https://celo.drpc.org", batch: false }]),
  [etherlink.id]: createFallbackTransport([{ url: "https://node.mainnet.etherlink.com", batch: false }]),
  [zircuit.id]: createFallbackTransport([
    { url: "https://zircuit-mainnet.drpc.org", batch: false },
    { url: "https://mainnet.zircuit.com", batch: false },
  ]),
  [plumeMainnet.id]: createFallbackTransport([{ url: "https://rpc.plume.org", batch: false }]),
  [worldchain.id]: createFallbackTransport([
    { url: "https://worldchain-mainnet.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://worldchain.drpc.org", batch: false },
  ]),
  [scrollMainnet.id]: createFallbackTransport([
    { url: "https://scroll-mainnet.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://rpc.ankr.com/scroll", batch: false },
    { url: "https://scroll.drpc.org", batch: false },
  ]),
  [fraxtal.id]: createFallbackTransport([
    { url: "https://fraxtal.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://fraxtal.drpc.org", batch: false },
  ]),
  [sonic.id]: createFallbackTransport([
    { url: "https://sonic.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://rpc.soniclabs.com", batch: false },
    { url: "https://rpc.ankr.com/sonic_mainnet", batch: false },
    { url: "https://sonic.drpc.org", batch: false },
  ]),
  [corn.id]: createFallbackTransport([
    { url: "https://corn.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://mainnet.corn-rpc.com", batch: false },
    { url: "https://maizenet-rpc.usecorn.com", batch: false },
    { url: "https://rpc.ankr.com/corn_maizenet", batch: false },
  ]),
  [modeMainnet.id]: createFallbackTransport([
    { url: "https://mode.gateway.tenderly.co", batch: false },
    { url: "https://mainnet.mode.network", batch: false },
    { url: "https://mode.drpc.org", batch: false },
  ]),
  [hemi.id]: createFallbackTransport([{ url: "https://rpc.hemi.network/rpc", batch: false }]),
  [flame.id]: createFallbackTransport(flame.rpcUrls.default.http.map((url) => ({ url, batch: false }))),
  [lisk.id]: createFallbackTransport([
    { url: "https://lisk.gateway.tenderly.co", batch: { batchSize: 10 } },
    ...lisk.rpcUrls.default.http.map((url) => ({ url, batch: false })),
  ]),
  [soneium.id]: createFallbackTransport([
    { url: "https://soneium.gateway.tenderly.co", batch: { batchSize: 10 } },
    ...soneium.rpcUrls.default.http.map((url) => ({ url, batch: false })),
  ]),
  [sei.id]: createFallbackTransport([
    ...createPonderHttp(sei.id),
    { url: "https://sei-public.nodies.app", batch: false, key: "sei-nodies-maxNum-2000" },
    { url: "https://sei.therpc.io", batch: false, key: "sei-therpc-maxNum-2000" },
    { url: "https://sei.drpc.org", batch: false, key: "sei-drpc-maxNum-2000" },
  ]),
  [customChains.tac.id]: createFallbackTransport([
    ...createPonderHttp(customChains.tac.id),
    ...customChains.tac.rpcUrls.default.http.map((url) => ({ url, batch: false })),
  ]),
  // [customChains.basecamp.id]: createFallbackTransport(
  //   customChains.basecamp.rpcUrls.default.http.map((url) => ({ url, batch: false })),
  // ),
  // [bitlayer.id]: createFallbackTransport([
  //   { url: "https://rpc.bitlayer.org", batch: false },
  //   { url: "https://rpc-bitlayer.rockx.com", batch: false },
  // ]),
};

export function createConfig(args: {
  chains?: readonly [Chain, ...Chain[]];
  transports?: { [k: number]: Transport };
  connectors?: CreateConnectorFn[];
}) {
  return createWagmiConfig({
    chains: args.chains ?? chains,
    transports: args.transports ?? transports,
    connectors:
      args.connectors ??
      (import.meta.env.VITE_WALLET_KIT_PROJECT_ID
        ? [injected({ shimDisconnect: true }), walletConnect({ projectId: import.meta.env.VITE_WALLET_KIT_PROJECT_ID })]
        : [injected({ shimDisconnect: true })]),
    batch: {
      multicall: {
        batchSize: 16383, // (2^14 - 1) works across all RPCs tested
        wait: 100,
      },
    },
    cacheTime: 250,
    pollingInterval: 4000,
  });
}
