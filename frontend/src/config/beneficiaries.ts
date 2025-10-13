// Humanitarian Basic beneficiaries (placeholder addresses)
// Keep this in sync with backend ignition module.
export interface BeneficiaryInfo {
  label: string;
  address: `0x${string}`;
  bps: number; // basis points (10000 = 100%)
  icon?: string; // simple emoji or path to asset
  logoId?: 'unicef' | 'msf' | 'ifrc' | 'savethechildren';
  logoSrc?: string; // path under /public for official-style (placeholder) logo
  description?: string;
  url?: string; // official website
}

export const BENEFICIARIES: BeneficiaryInfo[] = [
  {
    label: 'UNICEF',
    //address: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', // hardhat node
    address: '0x304eDF195e978bCF98a9EC8878d7B467Dc88b37f',   // Sepolia
    bps: 1000,
    icon: '🧒', // fallback
    logoId: 'unicef',
    logoSrc: '/logos/unicef.svg',
    description: 'Children-focused global relief & development.'
    ,url: 'https://www.unicef.org'
  },
  {
    label: 'MSF / Doctors Without Borders',
    //address: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', // hardhat node
    address: '0x7104a74226c1B11A978e4aDd70348859AEd2E091',   // Sepolia
    bps: 2000,
    icon: '🏥',
    logoId: 'msf',
    logoSrc: '/logos/msf.svg',
    description: 'Emergency medical humanitarian assistance in crisis zones.'
    ,url: 'https://www.msf.org'
  },
  {
    label: 'IFRC / Red Cross',
    //address: '0x90f79bf6eb2c4f870365e785982e1f101e93b906', // hardhat node
    address: '0x4A7572Dcb6B0174bBBae3065b009a7a4434c8e60',   // Sepolia
    bps: 3000,
    icon: '⛑️',
    logoId: 'ifrc',
    logoSrc: '/logos/redcross.svg',
    description: 'Disaster response, emergency relief & humanitarian coordination.'
    ,url: 'https://www.ifrc.org'
  },
  {
    label: 'Save the Children',
    //address: '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65', // hardhat node
    address: '0xF3b9C7Af6800878623912DFa377dE749A4fdbf51',   // Sepolia
    bps: 4000,
    icon: '📚',
    logoId: 'savethechildren',
    logoSrc: '/logos/savethechildren.svg',
    description: 'Health, education & child protection programs worldwide.'
    ,url: 'https://www.savethechildren.net'
  }
];

export function beneficiariesTotalBps() {
  return BENEFICIARIES.reduce((acc, b) => acc + b.bps, 0);
}

export function formatPercent(bps: number) {
  return (bps / 100).toFixed(2) + '%';
}
