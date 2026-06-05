import React from 'react';

export function HabitsLogo({ className = "w-8 h-8" }) {
  return (
    <svg className={className} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="gradLogo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#DF8559', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#F5BCA1', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="20" fill="url(#gradLogo)"/>
      <text x="50" y="70" fontFamily="Arial,sans-serif" fontSize="60" fill="white" textAnchor="middle" fontWeight="bold">∞</text>
    </svg>
  );
}
