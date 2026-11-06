import { Suspense } from "react";
import { ModelDetail } from "@/components/rq/ModelDetail";
import { SiteShell } from "@/components/rq/SiteShell";

// With Cache Components, runtime data (params) must be read inside a Suspense boundary.
async function Detail({ params }: { params: Promise<{ id: string[] }> }) {
  const { id } = await params;
  return <ModelDetail id={id.map(decodeURIComponent).join("/")} />;
}

export default function ModelPage({ params }: { params: Promise<{ id: string[] }> }) {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-5 py-14">
        <Suspense fallback={<p className="text-xs text-muted-foreground">Loading…</p>}>
          <Detail params={params} />
        </Suspense>
      </div>
    </SiteShell>
  );
}
