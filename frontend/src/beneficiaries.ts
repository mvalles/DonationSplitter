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
    address: '0x1111111111111111111111111111111111111111',
    bps: 1000,
    icon: '🧒', // fallback
    logoId: 'unicef',
    logoSrc: '/logos/unicef.svg',
    description: 'Children-focused global relief & development.'
    ,url: 'https://www.unicef.org'
  },
  {
    label: 'MSF / Doctors Without Borders',
    address: '0x2222222222222222222222222222222222222222',
    bps: 2000,
    icon: '🏥',
    logoId: 'msf',
    logoSrc: '/logos/msf.svg',
    description: 'Emergency medical humanitarian assistance in crisis zones.'
    ,url: 'https://www.msf.org'
  },
  {
    label: 'IFRC / Red Cross',
    address: '0x3333333333333333333333333333333333333333',
    bps: 3000,
    icon: '⛑️',
    logoId: 'ifrc',
    logoSrc: '/logos/redcross.svg',
    description: 'Disaster response, emergency relief & humanitarian coordination.'
    ,url: 'https://www.ifrc.org'
  },
  {
    label: 'Save the Children',
    address: '0x4444444444444444444444444444444444444444',
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
