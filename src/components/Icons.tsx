import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export const IconScissors = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="6" cy="6" r="2.6" />
    <circle cx="6" cy="18" r="2.6" />
    <path d="M20 4 8.6 15.4M8.6 8.6 20 20" />
  </svg>
);

export const IconRazor = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 20 14.5 9.5" />
    <path d="M13 8 17 4l3 3-4 4z" />
    <path d="M6 14h4" />
  </svg>
);

export const IconClock = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const IconCalendar = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </svg>
);

export const IconUser = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M4.8 20c1.3-3.5 4-5.2 7.2-5.2s5.9 1.7 7.2 5.2" />
  </svg>
);

export const IconPhone = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6.2 3.6h3l1.5 4-2 1.4a11.5 11.5 0 0 0 5.3 5.3l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.4 16.4 0 0 1 4.2 5.8a2 2 0 0 1 2-2.2Z" />
  </svg>
);

export const IconCheck = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

export const IconArrowRight = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const IconLock = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);

export const IconTrash = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 7h16M9.5 7V5h5v2M6.5 7l.8 12.2A2 2 0 0 0 9.3 21h5.4a2 2 0 0 0 2-1.8L17.5 7" />
  </svg>
);

export const IconPlus = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconEdit = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
    <path d="m14 6 4 4" />
  </svg>
);

export const IconClose = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const IconMenu = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconLogout = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M14 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" />
    <path d="M17 8.5 20.5 12 17 15.5M11 12h9.5" />
  </svg>
);

export const IconStar = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m12 3.5 2.6 5.3 5.9.8-4.3 4.2 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.6l5.9-.8Z" />
  </svg>
);

export const IconShield = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3.2 19 6v5.5c0 4.3-2.9 7.6-7 9.3-4.1-1.7-7-5-7-9.3V6Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </svg>
);

export const IconWhatsapp = (props: IconProps) => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.44 1.32 4.94L2 22l5.36-1.4a9.83 9.83 0 0 0 4.68 1.2h.01c5.43 0 9.84-4.4 9.84-9.84C21.89 6.4 17.47 2 12.04 2Zm5.75 13.92c-.24.68-1.4 1.3-1.93 1.35-.5.05-.96.23-3.28-.7-2.78-1.1-4.55-3.94-4.69-4.12-.14-.19-1.12-1.5-1.12-2.85 0-1.36.71-2.02.96-2.3.24-.28.53-.35.71-.35.18 0 .36 0 .52.01.17.01.4-.06.62.48.23.55.79 1.9.86 2.04.07.14.12.3.02.49-.1.19-.15.3-.29.47-.15.17-.31.38-.44.51-.15.14-.3.3-.13.59.17.28.75 1.24 1.6 2 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.72-.84.92-1.13.19-.28.38-.23.64-.14.26.1 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.7-.17 1.38Z" />
  </svg>
);

export const IconSparkle = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3.5c.9 3.7 2.3 5.1 6 6-3.7.9-5.1 2.3-6 6-.9-3.7-2.3-5.1-6-6 3.7-.9 5.1-2.3 6-6Z" />
  </svg>
);
