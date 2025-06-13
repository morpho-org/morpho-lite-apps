export const irmAbi = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "loanToken", type: "address" },
          { internalType: "address", name: "collateralToken", type: "address" },
          { internalType: "address", name: "oracle", type: "address" },
          { internalType: "address", name: "irm", type: "address" },
          { internalType: "uint256", name: "lltv", type: "uint256" },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      {
        components: [
          { internalType: "uint128", name: "totalSupplyAssets", type: "uint128" },
          { internalType: "uint128", name: "totalSupplyShares", type: "uint128" },
          { internalType: "uint128", name: "totalBorrowAssets", type: "uint128" },
          { internalType: "uint128", name: "totalBorrowShares", type: "uint128" },
          { internalType: "uint128", name: "lastUpdate", type: "uint128" },
          { internalType: "uint128", name: "fee", type: "uint128" },
        ],
        internalType: "struct Market",
        name: "market",
        type: "tuple",
      },
    ],
    name: "borrowRate",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "loanToken", type: "address" },
          { internalType: "address", name: "collateralToken", type: "address" },
          { internalType: "address", name: "oracle", type: "address" },
          { internalType: "address", name: "irm", type: "address" },
          { internalType: "uint256", name: "lltv", type: "uint256" },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      {
        components: [
          { internalType: "uint128", name: "totalSupplyAssets", type: "uint128" },
          { internalType: "uint128", name: "totalSupplyShares", type: "uint128" },
          { internalType: "uint128", name: "totalBorrowAssets", type: "uint128" },
          { internalType: "uint128", name: "totalBorrowShares", type: "uint128" },
          { internalType: "uint128", name: "lastUpdate", type: "uint128" },
          { internalType: "uint128", name: "fee", type: "uint128" },
        ],
        internalType: "struct Market",
        name: "market",
        type: "tuple",
      },
    ],
    name: "borrowRateView",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
