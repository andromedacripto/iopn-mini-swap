import { ConnectWallet } from "@/components/ConnectWallet";
import { SwapCard } from "@/components/SwapCard";
import { FaucetButton } from "@/components/FaucetButton";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-10">
      <div className="flex w-full max-w-md items-center justify-between rounded-xl bg-black/50 px-4 py-3 pb-3 shadow-lg backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-bold text-white drop-shadow-md">OPNX Swap</h1>
          <p className="text-xs font-medium text-white/80">Swap on the OPN Chain Testnet</p>
        </div>
        <ConnectWallet />
      </div>

      <div className="mt-8 flex w-full max-w-md flex-col gap-4">
        <FaucetButton />
        <SwapCard />
      </div>

      <FaucetLink />
    </main>
  );
}

function FaucetLink() {
  const linkProps = {
    href: "https://faucet.iopn.tech",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "font-semibold text-white underline hover:text-emerald-400",
  };
  return (
    <footer className="mt-10 max-w-md rounded-xl bg-black/50 px-4 py-3 text-center text-sm font-medium text-white shadow-lg backdrop-blur-sm">
      Testnet OPNX Swap. Tokens have no real value. OPN Testnet (chainId 984).{" "}
      <a {...linkProps}>Get test OPN from the faucet</a>
    </footer>
  );
}