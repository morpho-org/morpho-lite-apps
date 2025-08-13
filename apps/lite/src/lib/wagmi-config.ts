import * as customChains from "@morpho-org/uikit/lib/chains";
import { getDefaultConfig as createConnectKitConfigParams } from "connectkit";
import type { Chain, HttpTransportConfig } from "viem";
import { CreateConnectorFn, createConfig as createWagmiConfig, fallback, http, type Transport } from "wagmi";
import {
  arbitrum,
  base,
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

function createPrivateAlchemyHttp(slug: string): ({ url: string } & HttpTransportConfig)[] {
  const alchemyApiKey = import.meta.env.VITE_ALCHEMY_API_KEY;
  const url = `https://${slug}.g.alchemy.com/v2/${alchemyApiKey}`;
  return [
    {
      url,
      batch: { batchSize: 10, wait: 20 },
      methods: { exclude: ["eth_getLogs"] },
      key: "alchemy-no-events", // NOTE: Ensures `useContractEvents` won't try to use this
    },
    {
      url,
      batch: false,
      methods: { include: ["eth_getLogs"] },
    },
  ];
}

function createPrivateAnkrHttp(slug: string): ({ url: string } & HttpTransportConfig)[] {
  const ankrApiKey = import.meta.env.VITE_ANKR_API_KEY;
  const url = `https://rpc.ankr.com/${slug}/${ankrApiKey}`;
  return [
    {
      url,
      batch: { batchSize: 10, wait: 20 },
      methods: { exclude: ["eth_getLogs"] },
      key: "ankr-no-events", // NOTE: Ensures `useContractEvents` won't try to use this
    },
    {
      url,
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
  // lite support (alphabetical)
  // arbitrum,
  // corn,
  // fraxtal,
  // hemi,
  // ink,
  lisk,
  // modeMainnet,
  optimism,
  plumeMainnet,
  // scrollMainnet,
  soneium,
  // sonic,
  customChains.tac,
  worldchain,
] as const;

const transports: { [K in (typeof chains)[number]["id"]]: Transport } & { [k: number]: Transport } = {
  [mainnet.id]: createFallbackTransport([
    ...createPrivateAlchemyHttp("eth-mainnet"),
    { url: "https://rpc.mevblocker.io", batch: { batchSize: 10 } },
    { url: "https://rpc.ankr.com/eth", batch: { batchSize: 10 } },
    { url: "https://eth.drpc.org", batch: false },
    { url: "https://eth.merkle.io", batch: false },
  ]),
  [base.id]: createFallbackTransport([
    ...createPrivateAlchemyHttp("base-mainnet"),
    { url: "https://base.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://base.drpc.org", batch: false },
    { url: "https://mainnet.base.org", batch: { batchSize: 10 } },
    { url: "https://base.lava.build", batch: false },
  ]),
  [ink.id]: createFallbackTransport([
    ...createPrivateAlchemyHttp("ink-mainnet"),
    { url: "https://ink.drpc.org", batch: false },
  ]),
  [lisk.id]: createFallbackTransport(lisk.rpcUrls.default.http.map((url) => ({ url, batch: false }))),
  [optimism.id]: createFallbackTransport([
    ...createPrivateAlchemyHttp("opt-mainnet"),
    { url: "https://op-pokt.nodies.app", batch: { batchSize: 10 } },
    { url: "https://optimism.drpc.org", batch: false },
    { url: "https://optimism.lava.build", batch: false },
  ]),
  [arbitrum.id]: createFallbackTransport([
    ...createPrivateAlchemyHttp("arb-mainnet"),
    { url: "https://arbitrum.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://rpc.ankr.com/arbitrum", batch: { batchSize: 10 } },
    { url: "https://arbitrum.drpc.org", batch: false },
  ]),
  [polygon.id]: createFallbackTransport([
    ...createPrivateAlchemyHttp("polygon-mainnet"),
    { url: "https://polygon.drpc.org", batch: false },
  ]),
  [unichain.id]: createFallbackTransport([
    ...createPrivateAlchemyHttp("unichain-mainnet"),
    { url: "https://unichain.drpc.org", batch: false },
  ]),
  [worldchain.id]: createFallbackTransport([
    ...createPrivateAlchemyHttp("worldchain-mainnet"),
    { url: "https://worldchain.drpc.org", batch: false },
  ]),
  [scrollMainnet.id]: createFallbackTransport([
    ...createPrivateAlchemyHttp("scroll-mainnet"),
    { url: "https://scroll.drpc.org", batch: false },
  ]),
  [fraxtal.id]: createFallbackTransport([{ url: "https://fraxtal.drpc.org", batch: false }]),
  [sonic.id]: createFallbackTransport([
    ...createPrivateAlchemyHttp("sonic-mainnet"),
    { url: "https://rpc.soniclabs.com", batch: false },
    { url: "https://rpc.ankr.com/sonic_mainnet", batch: false },
    { url: "https://sonic.drpc.org", batch: false },
  ]),
  [corn.id]: createFallbackTransport([
    { url: "https://mainnet.corn-rpc.com", batch: false },
    { url: "https://maizenet-rpc.usecorn.com", batch: false },
  ]),
  [soneium.id]: createFallbackTransport([
    ...createPrivateAlchemyHttp("soneium-mainnet"),
    ...soneium.rpcUrls.default.http.map((url) => ({ url, batch: false })),
  ]),
  [modeMainnet.id]: createFallbackTransport([{ url: "https://mode.drpc.org", batch: false }]),
  [hemi.id]: createFallbackTransport([{ url: "https://rpc.hemi.network/rpc", batch: false }]),
  [plumeMainnet.id]: createFallbackTransport([{ url: "https://phoenix-rpc.plumenetwork.xyz", batch: false }]),
  [customChains.katana.id]: createFallbackTransport([
    { url: `https://rpc-katana.t.conduit.xyz/${import.meta.env.VITE_KATANA_KEY}`, batch: false },
    ...customChains.katana.rpcUrls.default.http.map((url) => ({ url, batch: false })),
  ]),
  [customChains.tac.id]: createFallbackTransport([
    {
      url: `https://v1-indexer.marble.live/rpc/${customChains.tac.id}`,
      batch: false,
      methods: { include: ["eth_getLogs"] },
    },
    ...createPrivateAnkrHttp("tac"),
    { url: "https://rpc.tac.build/", batch: false },
    { url: "https://tac.therpc.io", batch: false },
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
