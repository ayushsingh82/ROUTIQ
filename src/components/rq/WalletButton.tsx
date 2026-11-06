"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

// RainbowKit's modals and logic, with a lighter-weight trigger button that matches the dashboard.
export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        const base = "rounded-full border px-4 py-1.5 text-sm font-normal transition";
        return (
          <div className={mounted ? "" : "pointer-events-none opacity-0"} aria-hidden={!mounted}>
            {!connected ? (
              <button onClick={openConnectModal} className={`${base} border-neutral-700 text-neutral-200 hover:bg-neutral-900`}>
                Connect wallet
              </button>
            ) : chain.unsupported ? (
              <button onClick={openChainModal} className={`${base} border-red-500/60 text-red-400 hover:bg-red-950/30`}>
                Wrong network
              </button>
            ) : (
              <button onClick={openAccountModal} className={`${base} border-neutral-800 font-mono text-xs text-neutral-300 hover:bg-neutral-950`}>
                {account.displayName}
              </button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
