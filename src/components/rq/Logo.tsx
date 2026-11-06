import Link from "next/link";

/** ROUTIQ mark: one request enters on the left, the router (green) fans it out to three routes. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="ROUTIQ">
      <rect width="64" height="64" rx="16" fill="#0a0a0a" />
      <path d="M17 42h14a6 6 0 0 0 6-6v-8a6 6 0 0 1 6-6h4" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="17" cy="42" r="4" fill="#fff" />
      <circle cx="47" cy="22" r="6" fill="#34d399" />
    </svg>
  );
}

export function Logo({ size = 34, href = "/" }: { size?: number; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 text-white" aria-label="ROUTIQ — home">
      <LogoMark size={size} />
      <span className="text-[1.5rem] font-semibold leading-none tracking-tight">routiq</span>
    </Link>
  );
}
