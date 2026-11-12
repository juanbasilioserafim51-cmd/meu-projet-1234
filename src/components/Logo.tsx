import { useId } from 'react';

type LogoProps = { size?: number; withWordmark?: boolean; subtitle?: string };

export function Logo({ size = 44, withWordmark = true, subtitle = 'BARBEARIA PREMIUM' }: LogoProps) {
  const gradientId = useId().replace(/:/g, '');
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="logo-mark">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f6e7b6" />
            <stop offset="52%" stopColor="#d3af37" />
            <stop offset="100%" stopColor="#9c7a1e" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="22.2" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.3" />
        <circle cx="24" cy="24" r="18.2" fill="none" stroke={`url(#${gradientId})`} strokeWidth="0.6" opacity="0.55" />
        <text
          x="24"
          y="30.5"
          textAnchor="middle"
          fontFamily="'Cormorant Garamond', Georgia, serif"
          fontSize="16"
          fontWeight="600"
          letterSpacing="0.6"
          fill={`url(#${gradientId})`}
        >
          EB
        </text>
      </svg>
      {withWordmark && (
        <span className="logo-text">
          <span className="logo-name">
            ELITE <em>BARBER</em>
          </span>
          <span className="logo-subtitle">{subtitle}</span>
        </span>
      )}
    </span>
  );
}
