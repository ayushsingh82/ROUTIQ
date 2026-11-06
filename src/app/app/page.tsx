import type { Metadata } from "next";
import { App } from "@/components/App";

export const metadata: Metadata = { title: "StealthRadar — App" };

export default function Dashboard() {
  return (
    <div className="theme-app min-h-screen">
      <App />
    </div>
  );
}
