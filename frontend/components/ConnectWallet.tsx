"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { opnTestnet } from "@/lib/chains";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== opnTestnet.id;

  if (!isConnected) {
    const injectedConnector = connectors.find((c) => c.id === "injected") ?? connectors[0];
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={() => injectedConnector && connect({ connector: injectedConnector })}
          disabled={isConnecting || !injectedConnector}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isConnecting ? "Connecting..." : "Connect wallet"}
        </button>
        {connectError && (
          <p className="max-w-[220px] text-right text-xs text-red-400">
            {connectError.message.includes("not detected") || !injectedConnector
              ? "No wallet (MetaMask, etc.) detected in the browser."
              : connectError.message}
          </p>
        )}
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <button
        onClick={() => switchChain({ chainId: opnTestnet.id })}
        disabled={isSwitching}
        className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSwitching ? "Switching..." : "Switch to OPN Testnet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
        {address ? shortenAddress(address) : ""}
      </span>
      <button
        onClick={() => disconnect()}
        className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
      >
        Disconnect
      </button>
    </div>
  );
}
