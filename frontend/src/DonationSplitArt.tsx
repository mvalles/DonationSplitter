import React, { useEffect, useState } from 'react';
import './App.css';

interface DonationSplitArtProps {
  animate?: boolean;
  className?: string;
  size?: number;
}

// Animated SVG representing a central donation splitting into multiple beneficiary streams.
export const DonationSplitArt: React.FC<DonationSplitArtProps> = ({ animate = false, className = '', size = 340 }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setReady(true), 80);
      return () => clearTimeout(t);
    } else {
      setReady(false);
    }
  }, [animate]);

  const baseCls = `donation-art ${animate ? 'anim-active' : ''} ${ready ? 'anim-draw' : ''} ${className}`;

  return (
    <svg
      className={baseCls}
      width={size}
      height={size}
      viewBox="0 0 400 400"
      role="img"
      aria-label="Donation distribution illustration"
    >
      <defs>
        <linearGradient id="streamA2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ad4ff" />
          <stop offset="100%" stopColor="#6d5dfc" />
        </linearGradient>
        <linearGradient id="streamB2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3ddc91" />
          <stop offset="100%" stopColor="#4ad4ff" />
        </linearGradient>
        <linearGradient id="streamC2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffcc4d" />
          <stop offset="100%" stopColor="#ff7e66" />
        </linearGradient>
        <linearGradient id="coin2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD56F" />
          <stop offset="100%" stopColor="#FFB347" />
        </linearGradient>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="200" cy="200" r="180" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />

      {/* Streams (paths get stroke-dasharray for animation) */}
      <path className="stream stream-a" d="M200 160 C 200 200 160 230 120 250 C 85 268 70 300 78 330" stroke="url(#streamA2)" />
      <path className="stream stream-b" d="M200 160 C 200 205 205 250 200 290 C 196 320 205 345 215 360" stroke="url(#streamB2)" />
      <path className="stream stream-c" d="M200 160 C 205 195 250 225 285 250 C 320 275 335 305 330 335" stroke="url(#streamC2)" />

      {/* Central coin */}
      <g className="coin" filter="url(#softGlow)">
        <circle cx="200" cy="120" r="36" fill="url(#coin2)" stroke="#FFEDB3" strokeWidth="4" />
        <circle cx="200" cy="120" r="28" fill="#FFE9A4" opacity="0.35" />
        <path d="M190 110h20v4h-20zm0 10h20v4h-20zm0 10h12v4h-12z" fill="#C48000" opacity="0.75" />
      </g>

      {/* Beneficiary nodes */}
      <g className="beneficiaries">
        <circle className="node node-a" cx="90" cy="340" r="20" />
        <circle className="node node-b" cx="215" cy="370" r="20" />
        <circle className="node node-c" cx="330" cy="345" r="20" />
      </g>
    </svg>
  );
};

export default DonationSplitArt;
