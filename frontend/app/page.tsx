import { ConnectWallet } from "@/components/ConnectWallet";
import { SwapCard } from "@/components/SwapCard";
import { FaucetButton } from "@/components/FaucetButton";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-zinc-950 via-zinc-950 to-black px-4 py-10">
      <div className="flex w-full max-w-md items-center justify-between pb-8">
        <div>
          <h1 className="text-xl font-bold text-white">OPN Mini Swap</h1>
          <p className="text-xs text-white/40">Demonstracao de DEX na OPN Chain Testnet</p>
        </div>
        <ConnectWallet />
      </div>

      <div className="flex w-full max-w-md flex-col gap-4">
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
    className: "underline hover:text-white/60",
  };
  return (
    <footer className="mt-10 max-w-md text-center text-[11px] text-white/30">
      Projeto de demonstracao / testnet. Tokens sem valor real. Rede OPN Testnet (chainId 984).{" "}
      <a {...linkProps}>Pegar OPN de teste no faucet</a>
    </footer>
  );
}
