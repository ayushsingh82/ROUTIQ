import type { ReactNode } from "react";
import { ConsoleShell } from "@/components/rq/console/ConsoleShell";

export const metadata = { title: "Console — ROUTIQ" };

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
