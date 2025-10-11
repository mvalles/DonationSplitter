// Dirección y ABI del contrato DonationSplitter para el frontend
// Apunta a sepolia
export const DONATION_SPLITTER_ADDRESS = "0x849E04a51573F61B33DeFA318fEDBF444240bAFb";

export const DONATION_SPLITTER_ABI = [
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "account", "type": "address" },
          { "internalType": "uint16", "name": "bps", "type": "uint16" }
        ],
        "internalType": "struct DonationSplitter.Beneficiary[]",
        "name": "initialBeneficiaries",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  { "inputs": [], "name": "InvalidParams", "type": "error" },
  { "inputs": [], "name": "NotOwner", "type": "error" },
  { "inputs": [], "name": "NothingToWithdraw", "type": "error" },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "count", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "totalBps", "type": "uint256" }
    ],
    "name": "BeneficiariesUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "donor", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "DonationRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "beneficiary", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Withdrawn",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "beneficiariesList",
    "outputs": [
      { "internalType": "address[]", "name": "accounts", "type": "address[]" },
      { "internalType": "uint16[]", "name": "bps", "type": "uint16[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "donateETH",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "pendingEth",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "account", "type": "address" },
          { "internalType": "uint16", "name": "bps", "type": "uint16" }
        ],
        "internalType": "struct DonationSplitter.Beneficiary[]",
        "name": "newBeneficiaries",
        "type": "tuple[]"
      }
    ],
    "name": "setBeneficiaries",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawETH",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  { "stateMutability": "payable", "type": "receive" }
];
