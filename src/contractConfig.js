// src/contractConfig.js

// Endereço PROXY oficial do ArcFarmia (onde os players interagem)
export const ARCFARMIA_ADDRESS =
  "0xffa1378767fc92d9768d342fabdca4492c0867ed"; // tudo minúsculo

// ABI mínima com as funções que vamos usar agora
export const ARCFARMIA_ABI = [
  // buySeeds(uint8 cropId, uint256 amount)
  {
    inputs: [
      { internalType: "uint8", name: "cropId", type: "uint8" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "buySeeds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // claimDailySeeds()
  {
    inputs: [],
    name: "claimDailySeeds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // getPlayer(address player) -> PlayerProfile (coins, xp, level, lastDailyClaim)
  {
    inputs: [
      { internalType: "address", name: "player", type: "address" },
    ],
    name: "getPlayer",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "coins", type: "uint256" },
          { internalType: "uint256", name: "xp", type: "uint256" },
          { internalType: "uint16", name: "level", type: "uint16" },
          {
            internalType: "uint64",
            name: "lastDailyClaim",
            type: "uint64",
          },
        ],
        internalType: "struct ArcFarmia.PlayerProfile",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  // getSeedBalance(address player, uint8 cropId) -> uint256
  {
    inputs: [
      { internalType: "address", name: "player", type: "address" },
      { internalType: "uint8", name: "cropId", type: "uint8" },
    ],
    name: "getSeedBalance",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
];
