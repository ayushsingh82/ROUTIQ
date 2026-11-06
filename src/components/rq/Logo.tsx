import Link from "next/link";

/** ROUTIQ mark: a stepped route from a source square to a green destination node. */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="ROUTIQ">
      <path d="M16 46V34h16V22h13" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="48" cy="22" r="7" fill="#34d399" />
      <rect x="11" y="41" width="10" height="10" rx="2" fill="#fff" />
    </svg>
  );
}

export function Logo({ size = 26, href = "/" }: { size?: number; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-white" aria-label="ROUTIQ — home">
      <LogoMark size={size} />
      <span className="text-[1.05rem] font-semibold tracking-tight">routiq</span>
    </Link>
  );
}
