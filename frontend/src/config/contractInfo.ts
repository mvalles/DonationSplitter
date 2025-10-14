// DonationSplitter contract addresses per network (extend as you deploy)
// NOTE: Keep these in sync with backend deployment history & JSON beneficiary configs.
export const DONATION_SPLITTER_ADDRESSES: Record<number, `0x${string}`> = {
  31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3",    // Hardhat local (example / typical default)
  11155111: "0xDAD9ccC85a59db6D2eFDC7fDDE9A1E6e3D17b798", // Sepolia testnet (updated 2025-10-07)
  // 1: "0x..." // Mainnet (to add when deployed)
};

// Environment-driven target selection.
// Set VITE_TARGET_CHAIN to 'local' | 'sepolia' | 'mainnet'.
// Also accept synonyms: localhost, hardhat -> local; sep -> sepolia; main -> mainnet.
// Falls back to 'sepolia' ONLY if value missing / invalid. Logs a console warning for visibility.
function resolveTargetEnv(): { id: number; label: string; raw: string } {
  const rawVal = (import.meta as unknown as { env?: Record<string, unknown> })?.env?.VITE_TARGET_CHAIN ?? import.meta.env?.VITE_TARGET_CHAIN;
  const raw = (rawVal ? String(rawVal) : '').trim().toLowerCase();
  let normalized = raw;
  if (raw === '' || raw === undefined || raw === null) normalized = '';
  if (['localhost', 'hardhat'].includes(raw)) normalized = 'local';
  if (raw === 'sep') normalized = 'sepolia';
  if (raw === 'main') normalized = 'mainnet';
  let id: number; let label: string;
  switch (normalized) {
    case 'local': id = 31337; label = 'Hardhat Local'; break;
    case 'mainnet': id = 1; label = 'Ethereum Mainnet'; break;
    case 'sepolia': id = 11155111; label = 'Sepolia'; break;
    case '':
    default:
      // Fallback
      id = 11155111; label = 'Sepolia';
      if (raw !== 'sepolia' && raw !== '') {
        console.warn(`[DonationSplitter] Unrecognized VITE_TARGET_CHAIN='${raw}', defaulting to Sepolia.`);
      }
      if (raw === '') {
        console.info('[DonationSplitter] VITE_TARGET_CHAIN not set; defaulting to Sepolia.');
      }
      break;
  }
  return { id, label, raw };
}

const RESOLVED = resolveTargetEnv();
console.info('[DonationSplitter] VITE_TARGET_CHAIN raw value:', RESOLVED.raw, '| resolved:', RESOLVED.label, 'id', RESOLVED.id);
export const TARGET_CHAIN_ID = RESOLVED.id;
export const TARGET_CHAIN_LABEL = RESOLVED.label;
export const TARGET_CHAIN_RAW = RESOLVED.raw;

export function getDonationSplitterAddress(runtimeChainId?: number): `0x${string}` {
  // If runtime chain is known and we have an address for it, return that (wallet-connected scenario)
  if (runtimeChainId && DONATION_SPLITTER_ADDRESSES[runtimeChainId]) {
    return DONATION_SPLITTER_ADDRESSES[runtimeChainId];
  }
  // Fallback to target chain env address
  const envAddr = DONATION_SPLITTER_ADDRESSES[TARGET_CHAIN_ID];
  if (!envAddr) {
    // Last resort: prefer sepolia if defined
    return DONATION_SPLITTER_ADDRESSES[11155111];
  }
  return envAddr;
}

export const DONATION_SPLITTER_ABI = [
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "internalType": "uint16",
              "name": "bps",
              "type": "uint16"
            }
          ],
          "internalType": "struct DonationSplitter.Beneficiary[]",
          "name": "initialBeneficiaries",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "InvalidParams",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotOwner",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NothingToWithdraw",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "count",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "totalBps",
          "type": "uint256"
        }
      ],
      "name": "BeneficiariesUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "donor",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "DonationRecorded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "beneficiary",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "Withdrawn",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "beneficiariesList",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "accounts",
          "type": "address[]"
        },
        {
          "internalType": "uint16[]",
          "name": "bps",
          "type": "uint16[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "beneficiaryTotals",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "pending",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "withdrawn",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "lifetime",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "uri",
          "type": "string"
        }
      ],
      "name": "donateETH",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "pendingEth",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "internalType": "uint16",
              "name": "bps",
              "type": "uint16"
            }
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
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "withdrawnEth",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ] as const;

export type DonationSplitterAbi = typeof DONATION_SPLITTER_ABI;

// Convenience re-export for legacy code still expecting DONATION_SPLITTER_ADDRESS
// (will resolve using only env target, not dynamic runtime):
export const DONATION_SPLITTER_ADDRESS = DONATION_SPLITTER_ADDRESSES[TARGET_CHAIN_ID];
