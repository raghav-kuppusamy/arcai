import { useId } from 'react';

export function ArcLogo({ className = "size-8" }: { className?: string }) {
  const uid = useId();
  const mainGradId    = `arcMainGradient-${uid}`;
  const accentGradId  = `arcAccentGradient-${uid}`;
  const glowId        = `glow-${uid}`;

  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Premium gradient */}
        <linearGradient id={mainGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#0071E3', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#0058B3', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#34AADC', stopOpacity: 1 }} />
        </linearGradient>
        
        {/* Accent gradient */}
        <linearGradient id={accentGradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#5AC8FA', stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: '#0071E3', stopOpacity: 0.8 }} />
        </linearGradient>

        {/* Glow effect */}
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Background circle (subtle) */}
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="none"
        stroke={`url(#${mainGradId})`}
        strokeWidth="0.5"
        opacity="0.15"
      />
      
      {/* Main arc - primary element */}
      <path
        d="M 30 60 A 30 30 0 1 1 90 60"
        fill="none"
        stroke={`url(#${mainGradId})`}
        strokeWidth="12"
        strokeLinecap="round"
        filter={`url(#${glowId})`}
      />
      
      {/* Progress indicator arcs - showing movement/intelligence */}
      <path
        d="M 35 60 A 25 25 0 0 1 60 35"
        fill="none"
        stroke={`url(#${accentGradId})`}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.7"
      />
      
      <path
        d="M 60 85 A 25 25 0 0 1 85 60"
        fill="none"
        stroke={`url(#${accentGradId})`}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.7"
      />
      
      {/* Intelligence nodes - representing data points */}
      <circle cx="30" cy="60" r="6" fill={`url(#${mainGradId})`} />
      <circle cx="90" cy="60" r="6" fill={`url(#${mainGradId})`} />
      <circle cx="60" cy="30" r="4" fill={`url(#${accentGradId})`} opacity="0.9" />
      
      {/* Center element - AI core */}
      <circle
        cx="60"
        cy="60"
        r="8"
        fill={`url(#${mainGradId})`}
        filter={`url(#${glowId})`}
      />
      
      {/* Inner ring */}
      <circle
        cx="60"
        cy="60"
        r="4"
        fill="white"
        opacity="0.3"
      />
    </svg>
  );
}