// Custom square-language icon set. Hover animations are driven by CSS (.group:hover .ico-*) in globals.css.

type P = { size?: number; className?: string };

function Svg({ size = 18, className, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconOverview(p: P) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="3.5" width="7" height="7" />
      <rect x="13.5" y="3.5" width="7" height="7" className="ico-pop" />
      <rect x="3.5" y="13.5" width="7" height="7" className="ico-pop ico-d1" />
      <rect x="13.5" y="13.5" width="7" height="7" className="ico-pop ico-d2" />
    </Svg>
  );
}

export function IconIdentity(p: P) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="3.5" width="17" height="17" />
      <rect x="8" y="8" width="8" height="8" className="ico-rot" />
      <rect x="11" y="11" width="2" height="2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconPrivacy(p: P) {
  return (
    <Svg {...p}>
      <path d="M12 3 20 6v6c0 4.6-3.4 8-8 9.5C7.4 20 4 16.6 4 12V6Z" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.8" className="ico-draw" pathLength={1} />
    </Svg>
  );
}

export function IconCompare(p: P) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="5.5" width="7.5" height="13" className="ico-blink" />
      <rect x="13" y="5.5" width="7.5" height="13" className="ico-blink ico-d1" />
      <path d="M12 3v18" strokeDasharray="2 2.5" />
    </Svg>
  );
}

export function IconScan(p: P) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="3.5" width="17" height="17" />
      <rect x="8" y="8" width="8" height="8" opacity="0.5" />
      <path d="M12 12V3.5h8.5Z" fill="currentColor" stroke="none" className="ico-sweep" style={{ transformOrigin: "12px 12px" }} />
    </Svg>
  );
}

export function IconSend(p: P) {
  return (
    <Svg {...p}>
      <g className="ico-fly">
        <path d="M5 19 19 5" />
        <path d="M9 5h10v10" />
      </g>
    </Svg>
  );
}
