import { ModelsBrowser } from "@/components/rq/ModelsBrowser";
import { SiteShell } from "@/components/rq/SiteShell";
import { Eyebrow } from "@/components/rq/ui";

export const metadata = { title: "Models — ROUTIQ" };

export default function ModelsPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Eyebrow>Marketplace</Eyebrow>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Models</h1>
        <p className="mb-10 mt-4 max-w-2xl text-neutral-500">Only models a reachable provider really serves appear here, priced from the provider&apos;s own catalogue.</p>
        <ModelsBrowser />
      </div>
    </SiteShell>
  );
}
