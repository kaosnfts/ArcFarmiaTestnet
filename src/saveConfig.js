// src/saveConfig.js

// Endereço do contrato ArcFarmiaProgress na Arc testnet
export const SAVE_CONTRACT_ADDRESS =
  "0xcc2052A8E5F09D15596ad3718939A7af5B66C291";

// ABI mínima: savePlayer + getPlayer
export const SAVE_CONTRACT_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "coins", type: "uint256" },
      { internalType: "uint256", name: "xp", type: "uint256" },
      { internalType: "uint16", name: "level", type: "uint16" },
      { internalType: "uint16", name: "wheatSeeds", type: "uint16" },
      { internalType: "uint16", name: "cornSeeds", type: "uint16" },
      { internalType: "uint16", name: "carrotSeeds", type: "uint16" },
      { internalType: "uint16", name: "eggs", type: "uint16" },
      { internalType: "uint16", name: "milk", type: "uint16" },
      { internalType: "uint16", name: "chickens", type: "uint16" },
      { internalType: "uint16", name: "cows", type: "uint16" },
    ],
    name: "savePlayer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "getPlayer",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "coins", type: "uint256" },
          { internalType: "uint256", name: "xp", type: "uint256" },
          { internalType: "uint16", name: "level", type: "uint16" },
          { internalType: "uint16", name: "wheatSeeds", type: "uint16" },
          { internalType: "uint16", name: "cornSeeds", type: "uint16" },
          { internalType: "uint16", name: "carrotSeeds", type: "uint16" },
          { internalType: "uint16", name: "eggs", type: "uint16" },
          { internalType: "uint16", name: "milk", type: "uint16" },
          { internalType: "uint16", name: "chickens", type: "uint16" },
          { internalType: "uint16", name: "cows", type: "uint16" },
        ],
        internalType: "struct ArcFarmiaProgress.PlayerProgress",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
