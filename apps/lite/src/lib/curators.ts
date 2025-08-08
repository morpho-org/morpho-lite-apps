import * as customChains from "@morpho-org/uikit/lib/chains";
import { Address, isAddressEqual } from "viem";
import { lisk, optimism, plumeMainnet, soneium } from "wagmi/chains";

import { graphql, FragmentOf } from "@/graphql/graphql";

export const CuratorFragment = graphql(`
  fragment Curator on Curator @_unmask {
    addresses {
      address
      chainId
    }
    image
    name
    url
  }
`);

export const MANUALLY_WHITELISTED_CURATORS: FragmentOf<typeof CuratorFragment>[] = [
  {
    addresses: [
      { address: "0x6D3AB84Fb7Fc04961a15663C980feC275b889402", chainId: customChains.tac.id },
      { address: "0xd6316AE37dDE77204b9A94072544F1FF9f3d6d54", chainId: plumeMainnet.id },
      { address: "0x4681fbeD0877815D5869Cf16e8A6C6Ceee365c02", chainId: lisk.id },
      { address: "0x6D3AB84Fb7Fc04961a15663C980feC275b889402", chainId: soneium.id },
    ],
    image: "https://cdn.morpho.org/v2/assets/images/re7.png",
    name: "RE7 Labs",
    url: "https://www.re7labs.xyz/",
  },
  {
    addresses: [{ address: "0x4F08D2A771aCe406C733EC3E722827E857A33Db5", chainId: plumeMainnet.id }],
    image: "https://cdn.morpho.org/v2/assets/images/mevcapital.png",
    name: "MEV Capital",
    url: "https://mevcapital.com/",
  },
  // {
  //   addresses: [{ address: "0xB2b9a27a6160Bf9ffbD1a8d245f5de75541b1DDD", chainId: customChains.tac.id }],
  //   image: "https://cdn.morpho.org/v2/assets/images/edge-capital-ultrayield.svg",
  //   name: "Edge Capital UltraYield",
  //   url: "https://edgecapital.xyz/",
  // },
  {
    addresses: [{ address: "0x17C9ba3fDa7EC71CcfD75f978Ef31E21927aFF3d", chainId: optimism.id }],
    image: "https://cdn.morpho.org/v2/assets/images/moonwell.svg",
    name: "Moonwell",
    url: "https://moonwell.fi/",
  },
  {
    addresses: [{ address: "0x5D845540D2e05422E8ef10CEDEd7C0bFB5Aac4A2", chainId: plumeMainnet.id }],
    image: "/mystic.jpg",
    name: "Mystic",
    url: "https://mysticfinance.xyz",
  },
  {
    addresses: [{ address: "0x4e16eF0278E89f4A79f3581aB0afDF467b1754cD", chainId: plumeMainnet.id }],
    image: "/solera.svg",
    name: "Solera",
    url: "https://solera.market",
  },
];

export const ADDITIONAL_OFFCHAIN_CURATORS: Record<Address, DisplayableCurators> = {
  "0x0b14D0bdAf647c541d3887c5b1A4bd64068fCDA7": {
    Cicada: {
      name: "Cicada",
      roles: [],
      url: "https://www.cicada.partners/",
      imageSrc:
        "https://static.wixstatic.com/media/f9d184_1702c7c11ec647f480ad8e0c8c4859c3~mv2.png/v1/fill/w_120,h_155,al_c,lg_1,q_85,enc_avif,quality_auto/Cicada%20Image_Black%20on%20White_25%25.png",
      shouldAlwaysShow: true,
    },
  },
};

export type DisplayableCurators = {
  [name: string]: {
    name: string;
    roles: { name: string; address: Address }[];
    url: string | null;
    imageSrc: string | null;
    shouldAlwaysShow: boolean;
  };
};

const ROLE_NAMES = ["owner", "curator", "guardian"] as const;
export function getDisplayableCurators(
  vault: { [role in (typeof ROLE_NAMES)[number]]: Address } & { address: Address },
  curators: FragmentOf<typeof CuratorFragment>[],
) {
  const result: DisplayableCurators = {};
  for (const roleName of ROLE_NAMES) {
    for (const curator of curators) {
      const address = curator.addresses
        ?.map((entry) => entry.address as Address)
        .find((a) => isAddressEqual(a, vault[roleName]));
      if (!address) continue;

      const roleNameCapitalized = `${roleName.charAt(0).toUpperCase()}${roleName.slice(1)}`;
      const shouldAlwaysShow = roleName === "owner" || roleName === "curator";
      if (result[curator.name]) {
        result[curator.name].shouldAlwaysShow ||= shouldAlwaysShow;
        result[curator.name].roles.push({ name: roleNameCapitalized, address });
      } else {
        result[curator.name] = {
          name: curator.name,
          roles: [{ name: roleNameCapitalized, address }],
          url: curator.url,
          imageSrc: curator.image,
          shouldAlwaysShow,
        };
      }
    }
  }
  if (ADDITIONAL_OFFCHAIN_CURATORS[vault.address]) {
    return { ...result, ...ADDITIONAL_OFFCHAIN_CURATORS[vault.address] };
  }
  return result;
}
