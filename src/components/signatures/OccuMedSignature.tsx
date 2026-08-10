interface Props {
  compact?: boolean;
}

/** A deterministic, brand-owned electronic mark used on every Occu-Med agreement. */
export const OccuMedSignature = ({ compact = false }: Props) => (
  <div className={`occu-med-signature${compact ? " compact" : ""}`} aria-label="Occu-Med verified electronic signature">
    <svg viewBox="0 0 64 64" role="img" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M32 6C18 6 8 17 8 31c0 10 4 19 11 25" />
        <path d="M32 11c-11 0-19 9-19 20 0 9 3 16 9 22" />
        <path d="M32 16c-8 0-14 7-14 15 0 8 3 15 8 21" />
        <path d="M32 21c-6 0-9 5-9 11 0 8 3 14 7 19" />
        <path d="M32 26c-3 0-5 3-5 6 0 7 2 12 5 17" />
        <path d="M32 6c14 0 24 11 24 25 0 10-4 19-11 25" />
        <path d="M32 11c11 0 19 9 19 20 0 9-3 16-9 22" />
        <path d="M32 16c8 0 14 7 14 15 0 8-3 15-8 21" />
        <path d="M32 21c6 0 9 5 9 11 0 8-3 14-7 19" />
        <path d="M32 26c3 0 5 3 5 6 0 7-2 12-5 17" />
      </g>
      <text x="32" y="36" textAnchor="middle">OM</text>
    </svg>
    <div><strong>OCCU-MED</strong><span>Verified electronic signature</span></div>
  </div>
);
