"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { opnTestnet } from "@/lib/chains";
import {
  useFaucetCooldown,
  useFaucetClaim,
  useFaucetBalance,
  useFaucetClaimAmount,
  formatCooldown,
} from "@/hooks/useFaucet";
import { formatTokenAmount } from "@/hooks/useSwap";
import { TOKEN_LIST } from "@/lib/contracts";

const TKA = TOKEN_LIST[0];

export function FaucetButton() {
  const { address, isConnected, chainId } = useAccount();
  const isCorrectNetwork = chainId === opnTestnet.id;

  const { data: cooldownSeconds, refetch: refetchCooldown } = useFaucetCooldown(address);
  const { data: faucetBalance, refetch: refetchFaucetBalance } = useFaucetBalance();
  const { data: claimAmount } = useFaucetClaimAmount();

  const { claim, isPending, isConfirming, isSuccess, error, hash } = useFaucetClaim();

  // após claim confirmado, atualiza cooldown e saldo do faucet
  // (mesmo padrão de useRef do SwapCard, evita refetch duplicado)
  const lastRefetchedHash = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (isSuccess && hash && lastRefetchedHash.current !== hash) {
      lastRefetchedHash.current = hash;
      refetchCooldown();
      refetchFaucetBalance();
    }
  }, [isSuccess, hash, refetchCooldown, refetchFaucetBalance]);

  const onCooldown = Boolean(cooldownSeconds && cooldownSeconds > 0n);
  const isFaucetEmpty = Boolean(
    faucetBalance !== undefined && claimAmount !== undefined && faucetBalance < claimAmount
  );

  const disabled =
    !isConnected || !isCorrectNetwork || onCooldown || isFaucetEmpty || isPending || isConfirming;

  function label() {
    if (!isConnected) return "Conecte a carteira";
    if (!isCorrectNetwork) return "Troque para OPN Testnet";
    if (isPending) return "Confirme na carteira...";
    if (isConfirming) return "Recebendo TKA...";
    if (isFaucetEmpty) return "Faucet vazio no momento";
    if (onCooldown) return `Disponível em ${formatCooldown(cooldownSeconds)}`;
    return claimAmount !== undefined
      ? `Receber ${formatTokenAmount(claimAmount, TKA.decimals)} TKA`
      : "Receber TKA";
  }

  // traduz reverts on-chain crus em mensagens legíveis, sem vazar
  // stack trace bruto pro usuário (mesma diretriz seguida no SwapCard)
  function friendlyError(message: string): string {
    if (message.includes("COOLDOWN_ACTIVE")) return "Você já recebeu TKA nas últimas 24h.";
    if (message.includes("EMPTY")) return "O faucet está sem saldo no momento.";
    return "Não foi possível completar o claim. Tente novamente.";
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/60 p-4 shadow-xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">Faucet de teste</h3>
        {faucetBalance !== undefined && (
          <span className="text-[11px] text-white/40">
            Reserva: {formatTokenAmount(faucetBalance, TKA.decimals)} TKA
          </span>
        )}
      </div>

      <button
        onClick={() => claim()}
        disabled={disabled}
        className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {label()}
      </button>

      {error && <p className="mt-2 text-xs text-red-400">{friendlyError(error.message)}</p>}

      {isSuccess && hash && (
        <p className="mt-2 break-all text-xs text-emerald-400">TKA recebido! Hash: {hash}</p>
      )}
    </div>
  );
}