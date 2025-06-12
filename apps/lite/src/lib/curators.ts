import { Address, isAddressEqual } from "viem";
import { optimism, plumeMainnet } from "wagmi/chains";

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
    addresses: [{ address: "0xd6316AE37dDE77204b9A94072544F1FF9f3d6d54", chainId: plumeMainnet.id }],
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

export type DisplayableCurators = {
  [name: string]: {
    name: string;
    roles: { name: string; address: Address }[];
    url: string | null;
    imageSrc: string | null;
  };
};

const ROLE_NAMES = ["owner", "curator", "guardian"] as const;
export function getDisplayableCurators(
  vault: { [role in (typeof ROLE_NAMES)[number]]: Address },
  curators: FragmentOf<typeof CuratorFragment>[],
) {
  const result: DisplayableCurators = {};
  for (const curator of curators) {
    for (const roleName of ROLE_NAMES) {
      const address = curator.addresses
        ?.map((entry) => entry.address as Address)
        .find((a) => isAddressEqual(a, vault[roleName]));
      if (!address) continue;

      const roleNameCapitalized = `${roleName.charAt(0).toUpperCase()}${roleName.slice(1)}`;
      if (result[curator.name]) {
        result[curator.name].roles.push({ name: roleNameCapitalized, address });
      } else {
        result[curator.name] = {
          name: curator.name,
          roles: [{ name: roleNameCapitalized, address }],
          url: curator.url,
          imageSrc: curator.image,
        };
      }
    }
  }
  return result;
}
