import { SiteShell } from "@/components/rq/SiteShell";
import { StatsView } from "@/components/rq/StatsView";
import { Eyebrow } from "@/components/rq/ui";

export const metadata = { title: "Stats — ROUTIQ" };

export default function StatsPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Eyebrow>Network</Eyebrow>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Network stats</h1>
        <p className="mb-10 mt-4 max-w-2xl text-neutral-500">Everything here is counted from real requests through this gateway.</p>
        <StatsView />
      </div>
    </SiteShell>
  );
}
