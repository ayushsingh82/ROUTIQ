import type { ReactNode } from "react";
import { WalletProvider } from "@/components/rq/WalletProvider";
import { ConsoleShell } from "@/components/rq/console/ConsoleShell";

export const metadata = { title: "Dashboard — ROUTIQ" };

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <ConsoleShell>{children}</ConsoleShell>
    </WalletProvider>
  );
}
