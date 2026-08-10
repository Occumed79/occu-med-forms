interface Props {
  className?: string;
  monochrome?: boolean;
}

/**
 * Vector version of the Occu-Med mark. Keeping the mark inline avoids the
 * browser-only CSS image filter that caused downloaded PDFs to show a
 * different black/blue logo than the white on-screen document header.
 */
export function OccuMedLogo({ className, monochrome = false }: Props) {
  const maskId = useId().replaceAll(":", "");
  return (
    <svg className={className} viewBox="0 0 242 120" role="img" aria-label="Occu-Med">
      {monochrome ? (
        <>
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="242" height="120" style={{ maskType: "alpha" }}>
              <image href={logo} width="242" height="120" />
            </mask>
          </defs>
          <rect width="242" height="120" fill="currentColor" mask={`url(#${maskId})`} />
        </>
      ) : <image href={logo} width="242" height="120" />}
    </svg>
  );
}
import { useId } from "react";
import logo from "@/assets/occu-med-logo.png";
