import { Suspense } from "react";
import { Playground } from "@/components/rq/console/Playground";

export default function PlaygroundPage() {
  return (
    <Suspense>
      <Playground />
    </Suspense>
  );
}
