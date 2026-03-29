import React from 'react';

/**
 * HireFlow Logo – inline SVG so it renders instantly with no network request.
 * Props:
 *   size   – pixel height (width scales proportionally)  default 40
 *   style  – extra inline styles
 */
export default function Logo({ size = 40, style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      style={{ flexShrink: 0, ...style }}
      aria-label="HireFlow logo"
      role="img"
    >
      <defs>
        <linearGradient id="hf-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6C5CE7" />
          <stop offset="50%" stopColor="#7C6CF7" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="hf-fg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#E0D7FF" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      {/* Rounded square */}
      <rect x="32" y="32" width="448" height="448" rx="96" ry="96" fill="url(#hf-bg)" />
      {/* Person silhouette */}
      <g transform="translate(256, 240)">
        <circle cx="0" cy="-95" r="32" fill="url(#hf-fg)" opacity="0.95" />
        <path
          d="M-45,-50 Q-45,-25 -30,-15 Q0,5 30,-15 Q45,-25 45,-50"
          fill="url(#hf-fg)"
          opacity="0.9"
        />
        {/* Flow lines */}
        <path
          d="M-90,20 C-60,20 -40,55 0,55 C40,55 60,20 90,20"
          fill="none"
          stroke="url(#hf-fg)"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M-70,50 C-40,50 -25,80 0,80 C25,80 40,50 70,50"
          fill="none"
          stroke="url(#hf-fg)"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M-50,80 C-25,80 -15,105 0,105 C15,105 25,80 50,80"
          fill="none"
          stroke="url(#hf-fg)"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.4"
        />
        {/* Arrow tip */}
        <polygon points="-14,115 0,140 14,115" fill="url(#hf-fg)" opacity="0.7" />
      </g>
    </svg>
  );
}

/**
 * Small "H" mark for sidebar / compact spaces.
 */
export function LogoMark({ size = 32, style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      style={{ flexShrink: 0, ...style }}
      aria-label="HireFlow"
      role="img"
    >
      <defs>
        <linearGradient id="hf-mark-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6C5CE7" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="14" ry="14" fill="url(#hf-mark-bg)" />
      <text
        x="32"
        y="44"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="36"
        fontWeight="800"
        fill="white"
        textAnchor="middle"
        letterSpacing="-2"
      >
        H
      </text>
    </svg>
  );
}
