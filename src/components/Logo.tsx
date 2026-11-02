interface LogoProps {
  compact?: boolean
  light?: boolean
}

export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" role="img" aria-label="Unison">
      <rect width="40" height="40" rx="11" fill="currentColor" />
      <path
        d="M10.5 9.5v7.3c0 5.8 3.2 9.7 9.5 12.4"
        fill="none"
        stroke="#f8f8f2"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M29.5 9.5v7.3c0 5.8-3.2 9.7-9.5 12.4"
        fill="none"
        stroke="#d9ff63"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="20" cy="29.2" r="2.4" fill="#d9ff63" />
    </svg>
  )
}

export function Logo({ compact = false, light = false }: LogoProps) {
  return (
    <div className={`logo ${light ? 'logo--light' : ''}`} aria-label="Unison home">
      <LogoMark className="logo__mark" />
      {!compact && (
        <div className="logo__type">
          <strong>UNISON</strong>
          <span>Settlement desk</span>
        </div>
      )}
    </div>
  )
}
