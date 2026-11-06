import { ProvidersView } from "@/components/rq/ProvidersView";
import { SiteShell } from "@/components/rq/SiteShell";
import { Eyebrow } from "@/components/rq/ui";

export const metadata = { title: "Providers — ROUTIQ" };

export default function ProvidersPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Eyebrow>Network</Eyebrow>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Providers</h1>
        <p className="mb-10 mt-4 max-w-2xl text-neutral-500">Health is measured by live probes. A provider that needs an API key we don&apos;t have is shown as not configured, never as up.</p>
        <ProvidersView />
      </div>
    </SiteShell>
  );
}
