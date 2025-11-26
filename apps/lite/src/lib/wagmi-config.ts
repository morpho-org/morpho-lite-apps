import * as customChains from "@morpho-org/uikit/lib/chains";
import { getDefaultConfig as createConnectKitConfigParams } from "connectkit";
import type { Chain, HttpTransportConfig } from "viem";
import { CreateConnectorFn, createConfig as createWagmiConfig, fallback, http, type Transport } from "wagmi";
import {
  abstract,
  arbitrum,
  base,
  celo,
  corn,
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
} from "wagmi/chains";

import { APP_DETAILS } from "@/lib/constants";

const httpConfig: HttpTransportConfig = {
  retryDelay: 0,
  timeout: 30_000,
};

function createFallbackTransport(rpcs: ({ url: string } & HttpTransportConfig)[]) {
  return fallback(
    rpcs.map((rpc) => http(rpc.url, { ...httpConfig, ...(({ url, ...rest }) => rest)(rpc) })),
    {
      retryCount: 6,
      retryDelay: 100,
    },
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

function createPrivateProxyHttp(chainId: number, hasArchive = true): ({ url: string } & HttpTransportConfig)[] {
  const url = `https://curator.morpho.org/api/rpc/${chainId}`;
  return [
    {
      url,
      batch: { batchSize: 10, wait: 20 },
      methods: { exclude: ["eth_getLogs"] },
      key: "proxy-maxNum-0", // NOTE: Ensures `useContractEvents` won't try to use this
    },
    // NOTE: If proxy has archive nodes, disable batching and make block range unconstrained.
    // Otherwise, enable batching and set max block range = 2000.
    {
      url,
      batch: hasArchive ? false : { batchSize: 20, wait: 50 },
      methods: { include: ["eth_getLogs"] },
      ...(hasArchive ? {} : { key: "proxy-maxNum-2000" }),
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
  // lite support (alphabetical)
  // abstract,
  celo,
  // corn,
  // fraxtal,
  hemi,
  // ink,
  lisk,
  // modeMainnet,
  optimism,
  plumeMainnet,
  // scrollMainnet,
  sei,
  soneium,
  // sonic,
  customChains.tac,
  worldchain,
] as const;

const transports: { [K in (typeof chains)[number]["id"]]: Transport } & { [k: number]: Transport } = {
  // full support
  [mainnet.id]: createFallbackTransport([
    ...createPonderHttp(mainnet.id),
    ...createPrivateProxyHttp(mainnet.id),
    { url: "https://rpc.mevblocker.io", batch: { batchSize: 10 } },
    { url: "https://rpc.ankr.com/eth", batch: { batchSize: 10 } },
    { url: "https://eth.drpc.org", batch: false },
    { url: "https://eth.merkle.io", batch: false },
  ]),
  [base.id]: createFallbackTransport([
    ...createPonderHttp(base.id),
    ...createPrivateProxyHttp(base.id),
    { url: "https://base.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://base.drpc.org", batch: false },
    { url: "https://mainnet.base.org", batch: { batchSize: 10 } },
    { url: "https://base.lava.build", batch: false },
  ]),
  [polygon.id]: createFallbackTransport([
    ...createPonderHttp(polygon.id),
    ...createPrivateProxyHttp(polygon.id),
    { url: "https://polygon.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://polygon.drpc.org", batch: false },
  ]),
  [unichain.id]: createFallbackTransport([
    ...createPonderHttp(unichain.id),
    ...createPrivateProxyHttp(unichain.id),
    { url: "https://unichain.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://unichain.drpc.org", batch: false },
  ]),
  [customChains.katana.id]: createFallbackTransport([
    ...createPonderHttp(customChains.katana.id),
    { url: `https://rpc-katana.t.conduit.xyz/${import.meta.env.VITE_CONDUIT_API_KEY}`, batch: false },
    ...customChains.katana.rpcUrls.default.http.map((url) => ({ url, batch: false })),
  ]),
  [arbitrum.id]: createFallbackTransport([
    ...createPonderHttp(arbitrum.id),
    ...createPrivateProxyHttp(arbitrum.id),
    { url: "https://arbitrum.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://rpc.ankr.com/arbitrum", batch: { batchSize: 10 } },
    { url: "https://arbitrum.drpc.org", batch: false },
  ]),
  [customChains.hyperevm.id]: createFallbackTransport([
    ...createPonderHttp(customChains.hyperevm.id),
    ...createPrivateProxyHttp(customChains.hyperevm.id),
    { url: "https://rpc.hyperlend.finance/archive", batch: false },
  ]),
  // lite support (alphabetical)
  [abstract.id]: createFallbackTransport([
    ...createPrivateProxyHttp(abstract.id),
    { url: "https://api.mainnet.abs.xyz", batch: false },
  ]),
  [celo.id]: createFallbackTransport([
    ...createPrivateProxyHttp(celo.id),
    { url: "https://celo.drpc.org", batch: false },
  ]),
  [corn.id]: createFallbackTransport([
    { url: "https://corn.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://mainnet.corn-rpc.com", batch: false },
    { url: "https://maizenet-rpc.usecorn.com", batch: false },
  ]),
  [fraxtal.id]: createFallbackTransport([
    ...createPrivateProxyHttp(fraxtal.id),
    { url: "https://fraxtal.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://fraxtal.drpc.org", batch: false },
  ]),
  [hemi.id]: createFallbackTransport([{ url: "https://rpc.hemi.network/rpc", batch: false }]),
  [ink.id]: createFallbackTransport([
    ...createPrivateProxyHttp(ink.id),
    { url: "https://ink.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://ink.drpc.org", batch: false },
  ]),
  [lisk.id]: createFallbackTransport([
    { url: "https://lisk.gateway.tenderly.co", batch: { batchSize: 10 } },
    ...lisk.rpcUrls.default.http.map((url) => ({ url, batch: false })),
  ]),
  [modeMainnet.id]: createFallbackTransport([
    ...createPrivateProxyHttp(modeMainnet.id),
    { url: "https://mode.gateway.tenderly.co", batch: false },
    { url: "https://mainnet.mode.network", batch: false },
    { url: "https://mode.drpc.org", batch: false },
  ]),
  [optimism.id]: createFallbackTransport([
    ...createPrivateProxyHttp(optimism.id),
    { url: "https://optimism.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://op-pokt.nodies.app", batch: { batchSize: 10 } },
    { url: "https://optimism.drpc.org", batch: false },
    { url: "https://optimism.lava.build", batch: false },
  ]),
  [plumeMainnet.id]: createFallbackTransport([
    { url: `https://rpc-plume-mainnet-1.t.conduit.xyz/${import.meta.env.VITE_CONDUIT_API_KEY}`, batch: false },
    { url: "https://rpc.plume.org", batch: false },
  ]),
  [scrollMainnet.id]: createFallbackTransport([
    ...createPrivateProxyHttp(scrollMainnet.id),
    { url: "https://scroll-mainnet.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://scroll.drpc.org", batch: false },
  ]),
  [sei.id]: createFallbackTransport([
    ...createPonderHttp(sei.id),
    ...createPrivateProxyHttp(sei.id, false),
    { url: "https://sei-public.nodies.app", batch: false, key: "sei-nodies-maxNum-2000" },
    { url: "https://sei.therpc.io", batch: false, key: "sei-therpc-maxNum-2000" },
    { url: "https://sei.drpc.org", batch: false, key: "sei-drpc-maxNum-2000" },
  ]),
  [soneium.id]: createFallbackTransport([
    ...createPrivateProxyHttp(soneium.id),
    { url: "https://soneium.gateway.tenderly.co", batch: { batchSize: 10 } },
    ...soneium.rpcUrls.default.http.map((url) => ({ url, batch: false })),
  ]),
  [sonic.id]: createFallbackTransport([
    ...createPrivateProxyHttp(sonic.id),
    { url: "https://sonic.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://rpc.soniclabs.com", batch: false },
    { url: "https://rpc.ankr.com/sonic_mainnet", batch: false },
    { url: "https://sonic.drpc.org", batch: false },
  ]),
  [customChains.tac.id]: createFallbackTransport([
    ...createPonderHttp(customChains.tac.id),
    ...createPrivateProxyHttp(customChains.tac.id),
    { url: "https://rpc.tac.build/", batch: false },
    { url: "https://tac.therpc.io", batch: false },
  ]),
  [worldchain.id]: createFallbackTransport([
    ...createPrivateProxyHttp(worldchain.id),
    { url: "https://worldchain-mainnet.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://worldchain.drpc.org", batch: false },
  ]),
};

export function createConfig(args: {
  chains?: readonly [Chain, ...Chain[]];
  transports?: { [k: number]: Transport };
  connectors?: CreateConnectorFn[];
}) {
  return createWagmiConfig(
    createConnectKitConfigParams({
      chains: args.chains ?? chains,
      transports: args.transports ?? transports,
      connectors: args.connectors,
      walletConnectProjectId: import.meta.env.VITE_WALLET_KIT_PROJECT_ID,
      appName: APP_DETAILS.name,
      appDescription: APP_DETAILS.description,
      appUrl: APP_DETAILS.url,
      appIcon: APP_DETAILS.icon,
      batch: {
        multicall: {
          batchSize: 2 ** 16,
          wait: 100,
        },
      },
      cacheTime: 500,
      pollingInterval: 4000,
      ssr: import.meta.env.SSR,
    }),
  );
}
