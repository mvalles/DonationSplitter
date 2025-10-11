// Minimal, original SVG-style icons (not official trademarks) for beneficiary orgs.
// These are intentionally simplified glyphs to avoid trademark reproduction.
import React from 'react';

export type OrgLogoId = 'unicef' | 'msf' | 'ifrc' | 'savethechildren';

interface LogoProps { size?: number; className?: string; }

const base = { width: 32, height: 32, viewBox: '0 0 32 32' };

const UNICEF: React.FC<LogoProps> = ({ size = 28, className }) => (
  <svg {...base} className={className} style={{ width: size, height: size }} role="img" aria-label="UNICEF logo">
    <circle cx="16" cy="16" r="14" fill="#2daae1" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
    <circle cx="16" cy="16" r="6.5" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M11 20c2.5-2 7.5-2 10 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M13 13.2c0-1.2.9-2.2 2-2.2s2 .9 2 2.2" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const MSF: React.FC<LogoProps> = ({ size = 28, className }) => (
  <svg {...base} className={className} style={{ width: size, height: size }} role="img" aria-label="MSF logo">
    <rect x="2" y="14" width="28" height="12" rx="3" fill="#e4002b" />
    <path d="M6 20h4l2-4 2 4h4l2-4 2 4h4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M10 12l4-4 2 2 4-4" stroke="#e4002b" strokeWidth="3" strokeLinecap="round" fill="none" />
  </svg>
);

const IFRC: React.FC<LogoProps> = ({ size = 28, className }) => (
  <svg {...base} className={className} style={{ width: size, height: size }} role="img" aria-label="IFRC logo">
    <rect x="3" y="6" width="26" height="20" rx="4" fill="#ffffff10" stroke="#d00000" strokeWidth="2" />
    <path d="M16 10v12" stroke="#d00000" strokeWidth="3" strokeLinecap="round" />
    <path d="M10 16h12" stroke="#d00000" strokeWidth="3" strokeLinecap="round" />
    <circle cx="22" cy="12" r="3" fill="#d00000" fillOpacity="0.5" />
  </svg>
);

const SaveTheChildren: React.FC<LogoProps> = ({ size = 28, className }) => (
  <svg {...base} className={className} style={{ width: size, height: size }} role="img" aria-label="Save the Children logo">
    <circle cx="16" cy="16" r="13" fill="#ffffff10" stroke="#ff3d00" strokeWidth="2" />
    <path d="M11 20c1.2-2.8 2.4-4.2 5-4.2s3.8 1.4 5 4.2" stroke="#ff3d00" strokeWidth="2" strokeLinecap="round" fill="none" />
    <circle cx="16" cy="12.5" r="3.2" fill="#ff3d00" />
  </svg>
);

// Dispatcher component selects simplified logo variant by id.
export const OrgLogo: React.FC<{ id: OrgLogoId; size?: number; className?: string }> = ({ id, size = 28, className }) => {
  switch (id) {
    case 'unicef': return <UNICEF size={size} className={className} />;
    case 'msf': return <MSF size={size} className={className} />;
    case 'ifrc': return <IFRC size={size} className={className} />;
    case 'savethechildren': return <SaveTheChildren size={size} className={className} />;
    default: return null;
  }
};
