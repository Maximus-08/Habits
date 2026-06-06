
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
      <path 
        d="M 50 50 C 38.75 31.25, 27.5 38.75, 27.5 50 C 27.5 61.25, 38.75 68.75, 50 50 C 61.25 31.25, 72.5 38.75, 72.5 50 C 72.5 61.25, 61.25 68.75, 50 50 Z" 
        fill="none" 
        stroke="white" 
        strokeWidth="8" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}
