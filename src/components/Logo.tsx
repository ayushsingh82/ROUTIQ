import Link from "next/link";

/**
 * StealthRadar mark: a scan-frame (viewfinder corners) around a solid eye whose square iris
 * carries a radar sweep. "See without being seen." Square language to match the UI.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="StealthRadar logo">
      <rect width="40" height="40" rx="6" fill="#00EC97" />
      {/* viewfinder corners */}
      <path d="M7 12V7h5M28 7h5v5M33 28v5h-5M12 33H7v-5" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="square" />
      {/* eye */}
      <path d="M7.5 20C11 14.2 15.2 11.6 20 11.6S29 14.2 32.5 20C29 25.8 24.8 28.4 20 28.4S11 25.8 7.5 20Z" fill="#000" />
      {/* iris + radar sweep + pupil */}
      <rect x="15" y="15" width="10" height="10" fill="#00EC97" />
      <path d="M20 20V15A5 5 0 0 1 24.3 17.5Z" fill="#00A86B" className="logo-sweep" style={{ transformOrigin: "20px 20px" }} />
      <rect x="18" y="18" width="4" height="4" fill="#000" />
    </svg>
  );
}

export function Logo({ dark = false, size = 32 }: { dark?: boolean; size?: number }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className={`font-display text-lg font-bold tracking-tight ${dark ? "text-mint" : "text-black"}`}>StealthRadar</span>
    </Link>
  );
}
