interface Props {
  className?: string;
  compact?: boolean;
}

/** A deterministic Occu-Med signature seal: fingerprint ridges wrap the OM mark. */
export function OccuMedFingerprintSeal({ className, compact = false }: Props) {
  return (
    <div className={`occu-signature-seal ${compact ? "compact" : ""} ${className || ""}`}>
      <svg viewBox="0 0 84 84" aria-hidden="true">
        <g className="occu-signature-ridges" fill="none" stroke="currentColor" strokeLinecap="round">
          <path d="M42 5C21 5 7 20 7 40c0 15 6 28 16 38" />
          <path d="M42 11c-18 0-29 12-29 29 0 14 6 25 15 34" />
          <path d="M42 17c-14 0-23 10-23 23 0 12 5 22 14 30" />
          <path d="M42 23c-11 0-17 7-17 17 0 12 6 21 14 28" />
          <path d="M42 5c21 0 35 15 35 35 0 15-6 28-16 38" />
          <path d="M42 11c18 0 29 12 29 29 0 14-6 25-15 34" />
          <path d="M42 17c14 0 23 10 23 23 0 12-5 22-14 30" />
          <path d="M42 23c11 0 17 7 17 17 0 12-6 21-14 28" />
          <path d="M12 51c4-7 7-14 7-22" />
          <path d="M72 51c-4-7-7-14-7-22" />
        </g>
        <g className="occu-signature-mark" fill="currentColor">
          <path d="M31 35a11 11 0 0 0-7 10v4c4 1 7 4 9 7 2 3 5 5 9 5V35H31Z" />
          <path d="M44 35h7v26h-7z" />
          <path d="M53 35h7v26h-7z" />
        </g>
      </svg>
      <div>
        <strong>OCCU-MED</strong>
        <span>Verified electronic signature</span>
      </div>
    </div>
  );
}
