import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const btn = {
  base: "inline-flex items-center justify-center gap-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
  primary: "rounded-full bg-white text-black hover:bg-neutral-200",
  outline: "rounded-full border border-neutral-800 bg-black/40 text-white backdrop-blur hover:bg-neutral-900",
  ghost: "rounded-full text-neutral-400 hover:bg-neutral-900 hover:text-white",
  danger: "rounded-full border border-bad/40 text-bad hover:bg-bad/10",
  md: "min-h-[44px] px-7 py-3",
  sm: "min-h-[34px] px-4 py-1.5 text-xs",
};
type Variant = "primary" | "outline" | "ghost" | "danger";

export function Button({ variant = "primary", size = "md", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "sm" }) {
  return <button {...p} className={cn(btn.base, btn[variant], btn[size], className)} />;
}

export function LinkButton({ href, variant = "primary", size = "md", className, children, external }: { href: string; variant?: Variant; size?: "md" | "sm"; className?: string; children: ReactNode; external?: boolean }) {
  const cls = cn(btn.base, btn[variant], btn[size], className);
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("border border-border bg-card", className)}>{children}</div>;
}

export function CardHeader({ title, right, sub }: { title: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{title}</h2>
        {sub && <p className="mt-1.5 text-xs text-muted-foreground/80">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

type Tone = "neutral" | "ok" | "bad" | "warn" | "accent";
const tones: Record<Tone, string> = {
  neutral: "border-border text-muted-foreground",
  ok: "border-ok/40 text-ok",
  bad: "border-bad/40 text-bad",
  warn: "border-warn/40 text-warn",
  accent: "border-white/30 text-white",
};
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]", tones[tone], className)}>{children}</span>;
}

const field = "w-full rounded-none border border-border bg-black px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-neutral-500";
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn(field, "h-10", p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cn(field, "h-10", p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cn(field, p.className)} />;

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  const c = tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-foreground";
  return (
    <div className="border border-border bg-card p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className={cn("mt-4 break-all text-4xl font-semibold tracking-tight", c)}>{value}</div>
      {sub && <div className="mt-2 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Eyebrow({ children, bracket }: { n?: string; children: ReactNode; bracket?: boolean }) {
  return <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">{bracket ? `[ ${children} ]` : children}</p>;
}

export const Spinner = () => <span className="rq-spinner" aria-label="loading" />;

export const usd = (n: number | null | undefined, digits = 4) => (n === null || n === undefined ? "—" : `$${n.toFixed(digits)}`);
export const ms = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${Math.round(n)} ms`);
export const compact = (n: number | null | undefined) => (n ? new Intl.NumberFormat("en", { notation: "compact" }).format(n) : "—");
