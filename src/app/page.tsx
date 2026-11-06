import { SiteShell } from "@/components/rq/SiteShell";
import { Hero } from "@/components/rq/landing/Hero";
import { CTA, Features, HowItWorks, Numbers, PoweredBy } from "@/components/rq/landing/Sections";

export default function Landing() {
  return (
    <SiteShell>
      <Hero />
      <HowItWorks />
      <Features />
      <Numbers />
      <PoweredBy />
      <CTA />
    </SiteShell>
  );
}
