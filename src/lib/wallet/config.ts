import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, rabbyWallet, rainbowWallet, walletConnectWallet, injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { devnet } from "../rpc/client";

// WalletConnect needs a project id (free at cloud.reown.com). Injected wallets (MetaMask, Rabby…) work without a real one.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "routiq-demo";

const connectors = connectorsForWallets(
  [{ groupName: "Wallets", wallets: [metaMaskWallet, rabbyWallet, rainbowWallet, walletConnectWallet, injectedWallet] }],
  { appName: "ROUTIQ", projectId },
);

export const wagmiConfig = createConfig({ connectors, chains: [devnet], transports: { [devnet.id]: http() }, ssr: true });
