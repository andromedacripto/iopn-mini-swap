"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { TOKEN_LIST, CONTRACTS, type TokenInfo } from "@/lib/contracts";
import { opnTestnet } from "@/lib/chains";
import {
  safeParseAmount,
  useTokenBalance,
  useAllowance,
  useSwapQuote,
  applySlippage,
  useApprove,
  useSwapExecute,
  useSlippageSetting,
  formatTokenAmount,
} from "@/hooks/useSwap";

function TokenSelect({
  value,
  onChange,
  options,
  disabledAddress,
}: {
  value: TokenInfo;
  onChange: (token: TokenInfo) => void;
  options: readonly TokenInfo[];
  disabledAddress: Address;
}) {
  return (
    <select
      value={value.address}
      onChange={(e) => {
        const next = options.find((t) => t.address === e.target.value);
        if (next) onChange(next);
      }}
      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-emerald-400"
    >
      {options.map((token) => (
        <option
          key={token.address}
          value={token.address}
          disabled={token.address === disabledAddress}
          className="bg-zinc-900"
        >
          {token.symbol}
        </option>
      ))}
    </select>
  );
}

export function SwapCard() {
  const { address, isConnected, chainId } = useAccount();
  const isCorrectNetwork = chainId === opnTestnet.id;

  const [tokenIn, setTokenIn] = useState<TokenInfo>(TOKEN_LIST[0]);
  const [tokenOut, setTokenOut] = useState<TokenInfo>(TOKEN_LIST[1]);
  const [amountInStr, setAmountInStr] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const { slippagePercent, setSlippage } = useSlippageSetting();

  function handleTokenInChange(next: TokenInfo) {
    setTokenIn(next);
    if (next.address === tokenOut.address) {
      const fallback = TOKEN_LIST.find((t) => t.address !== next.address);
      if (fallback) setTokenOut(fallback);
    }
  }

  function handleTokenOutChange(next: TokenInfo) {
    setTokenOut(next);
    if (next.address === tokenIn.address) {
      const fallback = TOKEN_LIST.find((t) => t.address !== next.address);
      if (fallback) setTokenIn(fallback);
    }
  }

  const amountIn = useMemo(() => safeParseAmount(amountInStr, tokenIn.decimals), [amountInStr, tokenIn.decimals]);

  const path = useMemo<[Address, Address]>(() => [tokenIn.address, tokenOut.address], [tokenIn, tokenOut]);

  const { data: balanceIn, refetch: refetchBalanceIn } = useTokenBalance(tokenIn.address);
  const { data: balanceOut, refetch: refetchBalanceOut } = useTokenBalance(tokenOut.address);
  const { data: allowance, refetch: refetchAllowance } = useAllowance(tokenIn.address, address);
  const { data: quoteData, isFetching: isQuoting } = useSwapQuote(amountIn, path);

  const amountOut = quoteData ? quoteData[quoteData.length - 1] : undefined;
  const amountOutMin = amountOut ? applySlippage(amountOut, slippagePercent) : undefined;

  const needsApproval = useMemo(() => {
    if (!amountIn || allowance === undefined) return false;
    return allowance < amountIn;
  }, [amountIn, allowance]);

  const hasInsufficientBalance = useMemo(() => {
    if (!amountIn || balanceIn === undefined) return false;
    return amountIn > balanceIn;
  }, [amountIn, balanceIn]);

  const {
    approve,
    isPending: isApprovePending,
    isConfirming: isApproveConfirming,
    isSuccess: isApproveSuccess,
    error: approveError,
  } = useApprove();

  const {
    swap,
    isPending: isSwapPending,
    isConfirming: isSwapConfirming,
    isSuccess: isSwapSuccess,
    error: swapError,
    hash: swapHash,
  } = useSwapExecute();

  // after approval is confirmed, refresh the displayed allowance
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  // after the swap is confirmed, refresh balances (sync effect with the
  // blockchain). Status text and clearing the field are derived
  // directly from transaction state on render, no setState here.
  const lastRefetchedHash = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (isSwapSuccess && swapHash && lastRefetchedHash.current !== swapHash) {
      lastRefetchedHash.current = swapHash;
      refetchBalanceIn();
      refetchBalanceOut();
    }
  }, [isSwapSuccess, refetchBalanceIn, refetchBalanceOut, swapHash]);

  function handleAmountChange(raw: string) {
    setAmountInStr(raw);
    if (raw.trim() === "") {
      setInputError(null);
      return;
    }
    const parsed = safeParseAmount(raw, tokenIn.decimals);
    setInputError(parsed === null ? "Invalid amount. Use positive numbers only." : null);
  }

  function handleSwapDirection() {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountInStr("");
  }

  function handleApprove() {
    if (!amountIn) return;
    // approves a generous amount (2x the input) to reduce the need
    // for repeated approvals across consecutive tests, but NEVER infinite
    // by default — infinite approval is an explicit choice the user
    // makes in wallets like MetaMask, not something we decide for them here.
    approve(tokenIn.address, amountIn * 2n);
  }

  function handleSwap() {
    if (!amountIn || !amountOutMin || !address) return;
    swap({
      amountIn,
      amountOutMin,
      path,
      to: address,
    });
  }

  const canApprove = isConnected && isCorrectNetwork && amountIn && !hasInsufficientBalance && needsApproval;
  const canSwap =
    isConnected &&
    isCorrectNetwork &&
    amountIn &&
    amountOutMin !== undefined &&
    !hasInsufficientBalance &&
    !needsApproval;

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/60 p-5 shadow-xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Swap</h2>
        <SlippageControl slippagePercent={slippagePercent} onChange={setSlippage} />
      </div>

      {/* Input field */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="mb-1 flex items-center justify-between text-xs text-white/50">
          <span>You pay</span>
          <span>
            Balance: {formatTokenAmount(balanceIn, tokenIn.decimals)} {tokenIn.symbol}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            inputMode="decimal"
            placeholder="0.0"
            value={amountInStr}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="w-full bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-white/30"
          />
          <TokenSelect value={tokenIn} onChange={handleTokenInChange} options={TOKEN_LIST} disabledAddress={tokenOut.address} />
        </div>
        {inputError && <p className="mt-1 text-xs text-red-400">{inputError}</p>}
        {hasInsufficientBalance && !inputError && (
          <p className="mt-1 text-xs text-red-400">Insufficient {tokenIn.symbol} balance.</p>
        )}
      </div>

      {/* Swap direction toggle button */}
      <div className="my-2 flex justify-center">
        <button
          onClick={handleSwapDirection}
          aria-label="Reverse swap direction"
          className="rounded-full border border-white/10 bg-zinc-800 p-2 text-white/70 transition hover:rotate-180 hover:text-white"
        >
          ↓
        </button>
      </div>

      {/* Output field (read-only) */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="mb-1 flex items-center justify-between text-xs text-white/50">
          <span>You receive (estimated)</span>
          <span>
            Balance: {formatTokenAmount(balanceOut, tokenOut.decimals)} {tokenOut.symbol}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-full truncate text-2xl font-semibold text-white/90">
            {isQuoting ? "..." : amountOut !== undefined ? formatTokenAmount(amountOut, tokenOut.decimals) : "0.0"}
          </span>
          <TokenSelect value={tokenOut} onChange={handleTokenOutChange} options={TOKEN_LIST} disabledAddress={tokenIn.address} />
        </div>
      </div>

      {amountOutMin !== undefined && (
        <p className="mt-2 text-xs text-white/40">
          Minimum received with {slippagePercent}% slippage:{" "}
          <span className="text-white/70">
            {formatTokenAmount(amountOutMin, tokenOut.decimals)} {tokenOut.symbol}
          </span>
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-col gap-2">
        {!isConnected && (
          <p className="rounded-xl bg-white/5 px-3 py-3 text-center text-sm text-white/60">
            Connect your wallet to swap tokens.
          </p>
        )}

        {isConnected && !isCorrectNetwork && (
          <p className="rounded-xl bg-amber-500/10 px-3 py-3 text-center text-sm text-amber-300">
            Switch to the OPN Testnet (chainId 984) to continue.
          </p>
        )}

        {isConnected && isCorrectNetwork && (
          <>
            {canApprove && (
              <button
                onClick={handleApprove}
                disabled={isApprovePending || isApproveConfirming}
                className="rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApprovePending
                  ? "Confirm in wallet..."
                  : isApproveConfirming
                  ? "Approving..."
                  : `Approve ${tokenIn.symbol}`}
              </button>
            )}

            <button
              onClick={handleSwap}
              disabled={!canSwap || isSwapPending || isSwapConfirming}
              className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSwapPending
                ? "Confirm in wallet..."
                : isSwapConfirming
                ? "Processing swap..."
                : !amountIn
                ? "Enter an amount"
                : needsApproval
                ? "Approve token first"
                : "Swap"}
            </button>
          </>
        )}

        {approveError && <p className="text-xs text-red-400">Approval error: {approveError.message}</p>}
        {swapError && <p className="text-xs text-red-400">Swap error: {swapError.message}</p>}
        {isSwapSuccess && swapHash && (
          <p className="break-all text-xs text-emerald-400">Swap confirmed! Hash: {swapHash}</p>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] text-white/30">
        Router: {CONTRACTS.router.slice(0, 6)}...{CONTRACTS.router.slice(-4)} · OPN Testnet (chainId 984)
      </p>
    </div>
  );
}

function SlippageControl({
  slippagePercent,
  onChange,
}: {
  slippagePercent: number;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/60 hover:text-white"
      >
        Slippage: {slippagePercent}% ⚙
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-48 rounded-xl border border-white/10 bg-zinc-800 p-3 shadow-xl">
          <p className="mb-2 text-xs text-white/50">Slippage tolerance</p>
          <div className="flex gap-1">
            {[0.1, 0.5, 1].map((preset) => (
              <button
                key={preset}
                onClick={() => onChange(preset)}
                className={`flex-1 rounded-lg px-2 py-1 text-xs ${
                  slippagePercent === preset ? "bg-emerald-500 text-black" : "bg-white/10 text-white/70"
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
          <input
            type="number"
            min={0.01}
            max={20}
            step={0.1}
            value={slippagePercent}
            onChange={(e) => onChange(Number(e.target.value))}
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white outline-none"
          />
        </div>
      )}
    </div>
  );
}
