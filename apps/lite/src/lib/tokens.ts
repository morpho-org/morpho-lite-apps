import { getTokenSymbolURI as getTokenSymbolURIFromCdn } from "@morpho-org/uikit/lib/utils";
import { Address } from "viem";
import { plumeMainnet } from "viem/chains";

type TokenList = {
  name: string;
  logoURI: string;
  timestamp: string;
  keywords: string[];
  version: { major: number; minor: number; patch: number };
  tokens: { name: string; symbol: string; decimals: number; chainId: number; address: Address; logoURI: string }[];
};

export function getTokenURI(
  token: { symbol?: string; address: Address; chainId?: number },
  tokenLists: { [chainId: number]: TokenList[] } = { [plumeMainnet.id]: [plumeTokenList] },
) {
  if (token.chainId !== undefined) {
    const match = tokenLists[token.chainId]
      ?.map((tokenList) => tokenList.tokens)
      .flat()
      .find((candidate) => candidate.address === token.address && candidate.chainId === token.chainId)?.logoURI;

    if (match) return match;
  }

  return token.symbol ? getTokenSymbolURIFromCdn(token.symbol) : undefined;
}

const plumeTokenList: TokenList = {
  name: "Plume Token List",
  logoURI: "https://assets.plume.org/images/logos/plume/plume.svg",
  timestamp: "2024-03-26T12:00:00.000Z",
  keywords: ["plume", "rwa", "defi"],
  version: {
    major: 1,
    minor: 0,
    patch: 0,
  },
  tokens: [
    {
      name: "PLUME",
      symbol: "PLUME",
      decimals: 18,
      chainId: 98866,
      address: "0x0000000000000000000000000000000000000000",
      logoURI: "https://assets.plume.org/images/logos/plume/plume-token.svg",
    },
    {
      name: "Wrapped PLUME",
      symbol: "WPLUME",
      decimals: 18,
      chainId: 98866,
      address: "0xEa237441c92CAe6FC17Caaf9a7acB3f953be4bd1",
      logoURI: "https://assets.plume.org/images/logos/WPLUME/WPLUME-token.svg",
    },
    {
      name: "Wrapped Ether (Stargate)",
      symbol: "WETH",
      decimals: 18,
      chainId: 98866,
      address: "0xca59cA09E5602fAe8B629DeE83FfA819741f14be",
      logoURI: "https://assets.plume.org/images/logos/general/ether-token.svg",
    },
    {
      name: "Plume USD",
      symbol: "pUSD",
      decimals: 6,
      chainId: 98866,
      address: "0xdddD73F5Df1F0DC31373357beAC77545dC5A6f3F",
      logoURI: "https://assets.plume.org/images/logos/pUSD/pUSD-token.svg",
    },
    {
      name: "Plume ETH",
      symbol: "pETH",
      decimals: 18,
      chainId: 98866,
      address: "0x39d1F90eF89C52dDA276194E9a832b484ee45574",
      logoURI: "https://assets.plume.org/images/logos/pETH/pETH-token.svg",
    },
    {
      name: "Bridged USDC (Stargate)",
      symbol: "USDC.e",
      decimals: 6,
      chainId: 98866,
      address: "0x78adD880A697070c1e765Ac44D65323a0DcCE913",
      logoURI: "https://assets.plume.org/images/logos/general/usdc-token.svg",
    },
    {
      name: "Bridged USDT (Stargate)",
      symbol: "USDT",
      decimals: 6,
      chainId: 98866,
      address: "0xda6087E69C51E7D31b6DBAD276a3c44703DFdCAd",
      logoURI: "https://assets.plume.org/images/logos/general/usdt-token.svg",
    },
    {
      name: "PayUSD",
      symbol: "PayUSD",
      decimals: 6,
      chainId: 98866,
      address: "0xe9e8330a71912F03E54E7D93795acD9a56f070Aa",
      logoURI: "https://assets.plume.org/images/logos/PayUSD/PayUSD-token.svg",
    },
    {
      name: "Nest ALPHA Vault",
      symbol: "nALPHA",
      decimals: 6,
      chainId: 98866,
      address: "0x593cCcA4c4bf58b7526a4C164cEEf4003C6388db",
      logoURI: "https://assets.plume.org/images/logos/nest/nALPHA/nALPHA-token.svg",
    },
    {
      name: "Nest Treasuries Vault",
      symbol: "nTBILL",
      decimals: 6,
      chainId: 98866,
      address: "0xe72fe64840f4ef80e3ec73a1c749491b5c938cb9",
      logoURI: "https://assets.plume.org/images/logos/nest/nTBILL/nTBILL-token.svg",
    },
    {
      name: "Nest Institutional Core Vault",
      symbol: "nELIXIR",
      decimals: 6,
      chainId: 98866,
      address: "0x9fbC367B9Bb966a2A537989817A088AFCaFFDC4c",
      logoURI: "https://assets.plume.org/images/logos/nest/nELIXIR/nELIXIR-token.svg",
    },
    {
      name: "Nest Basis Vault",
      symbol: "nBASIS",
      decimals: 6,
      chainId: 98866,
      address: "0x11113Ff3a60C2450F4b22515cB760417259eE94B",
      logoURI: "https://assets.plume.org/images/logos/nest/nBASIS/nBASIS-token.svg",
    },
    {
      name: "Nest Credit Vault",
      symbol: "nCREDIT",
      decimals: 6,
      chainId: 98866,
      address: "0xa5f78b2a0ab85429d2dfbf8b60abc70f4cec066c",
      logoURI: "https://assets.plume.org/images/logos/nest/nCREDIT/nCREDIT-token.svg",
    },
    {
      name: "Nest Institutional Vault",
      symbol: "nINSTO",
      decimals: 6,
      chainId: 98866,
      address: "0xbfc5770631641719cd1cf809d8325b146aed19de",
      logoURI: "https://assets.plume.org/images/logos/nest/nINSTO/nINSTO-token.svg",
    },
    {
      name: "Nest PayFi Vault",
      symbol: "nPAYFI",
      decimals: 6,
      chainId: 98866,
      address: "0xb52b090837a035f93A84487e5A7D3719C32Aa8A9",
      logoURI: "https://assets.plume.org/images/logos/nest/nPAYFI/nPAYFI-token.svg",
    },
    {
      name: "Nest ETF Vault",
      symbol: "nETF",
      decimals: 8,
      chainId: 98866,
      address: "0xdeA736937d464d288eC80138bcd1a2E109A200e3",
      logoURI: "https://assets.plume.org/images/logos/nest/nETF/nETF-token.svg",
    },
    {
      name: "Nest BTC Vault",
      symbol: "nBTC",
      decimals: 6,
      chainId: 98866,
      address: "0x02cdb5ccc97d5dc7ed2747831b516669eb635706",
      logoURI: "https://assets.plume.org/images/logos/nest/nBTC/nBTC-token.svg",
    },
    {
      name: "USD+",
      symbol: "USD+",
      decimals: 6,
      chainId: 98866,
      address: "0x1fA3671dF7300DF728858B88c7216708f22dA3Fb",
      logoURI: "https://assets.plume.org/images/logos/USD+/USDplus-token.png",
    },
    {
      name: "Wrapped USD+",
      symbol: "wUSD+",
      decimals: 6,
      chainId: 98866,
      address: "0x6B7e283D5098F3213d01D6cDcc35A217e1a3549f",
      logoURI: "https://assets.plume.org/images/logos/USD+/wUSDplus-token.png",
    },
    {
      name: "Lorenzo stBTC",
      symbol: "stBTC",
      decimals: 6,
      chainId: 98866,
      address: "0xf6718b2701D4a6498eF77D7c152b2137Ab28b8A3",
      logoURI: "https://assets.plume.org/images/logos/lorenzo/stbtc-token.svg",
    },
    {
      name: "Lorenzo Wrapped BTC",
      symbol: "enzoBTC",
      decimals: 6,
      chainId: 98866,
      address: "0x6A9A65B84843F5fD4aC9a0471C4fc11AFfFBce4a",
      logoURI: "https://assets.plume.org/images/logos/lorenzo/enzobtc-token.svg",
    },
    {
      name: "Superstate Crypto Carry Fund",
      symbol: "USCC",
      decimals: 6,
      chainId: 98866,
      address: "0x4c21B7577C8FE8b0B0669165ee7C8f67fa1454Cf",
      logoURI: "https://assets.plume.org/images/logos/superstate/uscc-token.svg",
    },
    {
      name: "Superstate Short Duration US Government Securities Fund",
      symbol: "USTB",
      decimals: 6,
      chainId: 98866,
      address: "0xE4fA682f94610cCd170680cc3B045d77D9E528a8",
      logoURI: "https://assets.plume.org/images/logos/superstate/ustb-token.svg",
    },
    {
      name: "Bridged wOETH",
      symbol: "wOETH",
      decimals: 18,
      chainId: 98866,
      address: "0xD8724322f44E5c58D7A815F542036fb17DbbF839",
      logoURI: "https://assets.plume.org/images/logos/origin/woeth.svg",
    },
    {
      name: "Super OETH",
      symbol: "superOETHp",
      decimals: 18,
      chainId: 98866,
      address: "0xFCbe50DbE43bF7E5C88C6F6Fb9ef432D4165406E",
      logoURI: "https://assets.plume.org/images/logos/origin/superoeth.svg",
    },
    {
      name: "Wrapped Super OETH",
      symbol: "wsuperOETHp",
      decimals: 18,
      chainId: 98866,
      address: "0x2dE8A403f7A5c6C5161D4a129918Ec9f0b653918",
      logoURI: "https://assets.plume.org/images/logos/origin/wsuperoeth.svg",
    },
    {
      name: "f(x) USD",
      symbol: "fxUSD",
      decimals: 18,
      chainId: 98866,
      address: "0xc608Dfb90A430Df79a8a1eDBC8be7f1A0Eb4E763",
      logoURI: "https://assets.plume.org/images/logos/f(x)/fxUSD.svg",
    },
    {
      name: "f(x) USD Saving",
      symbol: "fxSAVE",
      decimals: 18,
      chainId: 98866,
      address: "0x535f7Ca9637A5099DB568b79a3624CFd6B5fc833",
      logoURI: "https://assets.plume.org/images/logos/f(x)/fxSAVE.svg",
    },
    {
      name: "Midas mEDGE",
      symbol: "mEDGE",
      decimals: 18,
      chainId: 98866,
      address: "0x69020311836D29BA7d38C1D3578736fD3dED03ED",
      logoURI: "https://assets.plume.org/images/logos/Midas/mEDGE.svg",
    },
    {
      name: "Midas mBASIS",
      symbol: "mBASIS",
      decimals: 18,
      chainId: 98866,
      address: "0x0c78Ca789e826fE339dE61934896F5D170b66d78",
      logoURI: "https://assets.plume.org/images/logos/Midas/mBASIS.svg",
    },
    {
      name: "Matrixdock Gold",
      symbol: "XAUM",
      decimals: 18,
      chainId: 98866,
      address: "0xA0C4F78A29ead4ABf6b7f5B3F0d05C0f3EAb8DDf",
      logoURI: "https://assets.plume.org/images/logos/Matrixdock/XAUm-token.svg",
    },
  ],
};
