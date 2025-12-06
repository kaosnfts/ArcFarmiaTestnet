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

  // dailySeedCropId() -> uint8
  {
    inputs: [],
    name: "dailySeedCropId",
    outputs: [
      { internalType: "uint8", name: "", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },

  // dailySeedAmount() -> uint16
  {
    inputs: [],
    name: "dailySeedAmount",
    outputs: [
      { internalType: "uint16", name: "", type: "uint16" },
    ],
    stateMutability: "view",
    type: "function",
  },
];
