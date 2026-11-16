"use client";

import { useCallback, useEffect, useState } from "react";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { ArrowUpRight, CheckCircle2, ExternalLink, Loader2, RefreshCw, X } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { useProject } from "@/components/project-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useNearMerchant } from "@/hooks/use-near-merchant";
import { useSendTransaction } from "@/hooks/use-send-transaction";
import { parseAddress } from "@/lib/chain/accounts";
import { explorerUrl, getUsdcMint } from "@/lib/chain/config";
import { formatUsdc } from "@/lib/chain/derive";
import { shortAddress } from "@/lib/format";
import { tryCreateNearReader } from "@/lib/near/chain-ops";
import { NEAR_CONTRACT_ID, NEAR_USDC_TOKEN_ID, nearExplorerUrl } from "@/lib/near/config";
import { describeNearError } from "@/lib/near/errors";
import { cn } from "@/lib/utils";
import {
  buildSolanaUsdcWithdrawInstructions,
  extractNearTxHash,
  formatUsdcInput,
  validateWithdrawInput,
  type WithdrawChain,
} from "@/lib/withdraw";

interface WithdrawBalances {
  nearUsdc: bigint | null;
  solanaUsdc: bigint | null;
  solanaLamports: bigint | null;
}

interface WithdrawSuccess {
  chain: WithdrawChain;
  amountFormatted: string;
  recipient: string;
  txId: string;
}

export function WithdrawModal({
  initialChain = "near",
  onClose,
}: {
  initialChain?: WithdrawChain;
  onClose: () => void;
}) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { activeProject } = useProject();
  const near = useNearMerchant();
  const { buildTransaction, send } = useSendTransaction();
  const toast = useToast();

  const [chain, setChain] = useState<WithdrawChain>(initialChain);
  const [recipient, setRecipient] = useState("");
  const [amountText, setAmountText] = useState("");
  const [balances, setBalances] = useState<WithdrawBalances>({
    nearUsdc: null,
    solanaUsdc: null,
    solanaLamports: null,
  });
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<WithdrawSuccess | null>(null);

  const isLiveSolana = activeProject.environment === "live";
  const solanaLabel = isLiveSolana ? "Solana Mainnet" : "Solana Devnet";
  const solanaAddress = publicKey?.toBase58() ?? null;
  const nearAddress = near.accountId;

  const fetchBalances = useCallback(async (): Promise<WithdrawBalances> => {
    const reader = tryCreateNearReader();
    const nearPromise =
      reader && nearAddress
        ? reader.getFtBalance(NEAR_USDC_TOKEN_ID, nearAddress).catch(() => null)
        : Promise.resolve(null);

    const solPromise = publicKey
      ? (async () => {
          const mint = getUsdcMint(activeProject.environment);
          const ata = getAssociatedTokenAddressSync(mint, publicKey);
          const [lamports, tokenBal] = await Promise.all([
            connection.getBalance(publicKey).catch(() => null),
            connection.getTokenAccountBalance(ata).catch(() => null),
          ]);
          return {
            usdc: tokenBal ? BigInt(tokenBal.value.amount) : 0n,
            lamports: lamports === null ? null : BigInt(lamports),
          };
        })()
      : Promise.resolve({ usdc: null, lamports: null });

    const [nearUsdc, sol] = await Promise.all([nearPromise, solPromise]);
    return { nearUsdc, solanaUsdc: sol.usdc, solanaLamports: sol.lamports };
  }, [activeProject.environment, connection, nearAddress, publicKey]);

  const refreshBalances = useCallback(async () => {
    setLoadingBalances(true);
    const next = await fetchBalances();
    setBalances(next);
    setLoadingBalances(false);
  }, [fetchBalances]);

  useEffect(() => {
    let active = true;
    void fetchBalances().then((next) => {
      if (!active) return;
      setBalances(next);
      setLoadingBalances(false);
    });
    return () => {
      active = false;
    };
  }, [fetchBalances]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const activeSourceAddress = chain === "near" ? nearAddress : solanaAddress;
  const activeBalance = chain === "near" ? (balances.nearUsdc ?? 0n) : (balances.solanaUsdc ?? 0n);
  const balanceKnown = chain === "near" ? balances.nearUsdc !== null : balances.solanaUsdc !== null;
  const settingUpNear = near.status === "deriving" || near.status === "funding" || near.status === "registering";
  const zeroSolGas = chain === "solana" && balances.solanaLamports !== null && balances.solanaLamports === 0n;

  function selectChain(next: WithdrawChain) {
    if (next === chain) return;
    setChain(next);
    setRecipient("");
    setAmountText("");
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const check = validateWithdrawInput({
      chain,
      recipient,
      amountText,
      availableUnits: activeBalance,
      sourceAddress: activeSourceAddress,
    });
    if (!check.ok) {
      setError(check.error);
      return;
    }

    setSubmitting(true);
    try {
      let txId = "";
      if (chain === "near") {
        setStatusNote("Unlocking NEAR merchant account…");
        const client = near.client ?? (await near.prepare());
        if (!client) {
          throw new Error(near.error ?? "Could not unlock your NEAR merchant account.");
        }

        const registered = await client.isStorageRegistered(NEAR_USDC_TOKEN_ID, check.recipient);
        if (!registered) {
          setStatusNote("Registering recipient on USDC…");
          await client.registerStorage(NEAR_USDC_TOKEN_ID, check.recipient);
        }

        setStatusNote("Transferring USDC on NEAR…");
        const outcome = await client.transferFt({
          tokenId: NEAR_USDC_TOKEN_ID,
          receiverId: check.recipient,
          amount: check.amountUnits,
        });
        txId = extractNearTxHash(outcome);
      } else {
        if (!publicKey) throw new Error("Connect a Solana wallet first.");
        if (zeroSolGas) throw new Error("Your Solana wallet has 0 SOL to cover network fees.");
        const recipientPubkey = parseAddress(check.recipient);
        if (!recipientPubkey) throw new Error("Enter a valid Solana wallet address.");

        setStatusNote("Building Solana transfer…");
        const mint = getUsdcMint(activeProject.environment);
        const instructions = buildSolanaUsdcWithdrawInstructions({
          owner: publicKey,
          recipient: recipientPubkey,
          mint,
          amountUnits: check.amountUnits,
        });
        const tx = await buildTransaction(publicKey, instructions);
        setStatusNote("Confirming transfer…");
        txId = await send(tx);
      }

      const amountFormatted = formatUsdc(check.amountUnits);
      setSuccess({ chain, amountFormatted, recipient: check.recipient, txId });
      toast.success("Withdrawal sent", `${amountFormatted} USDC sent to ${shortAddress(check.recipient)}`);
      setAmountText("");
      void refreshBalances();
    } catch (err) {
      const msg = chain === "near" ? describeNearError(err) : err instanceof Error ? err.message : "Withdrawal failed.";
      setError(msg);
    } finally {
      setSubmitting(false);
      setStatusNote(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in-0 duration-150 overscroll-contain overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-dialog-title"
        className="w-full max-w-md rounded-xl sm:rounded-2xl border border-border/80 bg-card text-card-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="withdraw-dialog-title" className="text-sm font-bold text-foreground">
                Withdraw USDC
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Move merchant funds to your own wallet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close withdraw dialog"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Source network selector */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Withdraw from</span>
              <button
                type="button"
                onClick={() => void refreshBalances()}
                disabled={loadingBalances || submitting}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={cn("size-3", loadingBalances && "animate-spin")} aria-hidden="true" />
                Refresh
              </button>
            </div>
            <div role="tablist" aria-label="Source network" className="grid grid-cols-2 gap-2.5">
              {(
                [
                  {
                    id: "near" as const,
                    label: "NEAR Testnet",
                    address: nearAddress,
                    balance: balances.nearUsdc,
                  },
                  {
                    id: "solana" as const,
                    label: solanaLabel,
                    address: solanaAddress,
                    balance: balances.solanaUsdc,
                  },
                ]
              ).map((item) => {
                const selected = chain === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => selectChain(item.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border/70 bg-background/40 hover:bg-accent/40",
                    )}
                  >
                    <div className="text-[11px] font-semibold text-foreground">{item.label}</div>
                    <div className="mt-1 font-mono text-sm font-bold text-foreground tabular-nums">
                      {item.balance !== null ? `${formatUsdc(item.balance)} USDC` : item.address ? "…" : "—"}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground truncate">
                      {item.address ? shortAddress(item.address) : "Not set up"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Source address strip */}
          {activeSourceAddress ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs">
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">Source account</div>
                <div className="font-mono text-xs text-foreground truncate">{activeSourceAddress}</div>
              </div>
              <CopyButton value={activeSourceAddress} label="Copy source address" />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/50 p-3 text-xs">
              <p className="text-muted-foreground">
                Set up your derived NEAR account first to view its balance and withdraw funds.
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={settingUpNear || !NEAR_CONTRACT_ID}
                onClick={() => void near.prepare().then(() => refreshBalances())}
              >
                {settingUpNear ? "Setting up…" : "Set up NEAR"}
              </Button>
            </div>
          )}

          {success ? (
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Sent {success.amountFormatted} USDC
                  </p>
                  <p className="text-xs text-muted-foreground break-all">
                    To <span className="font-mono text-foreground">{success.recipient}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                {success.txId ? (
                  <a
                    href={
                      success.chain === "near"
                        ? nearExplorerUrl("tx", success.txId)
                        : explorerUrl("tx", success.txId, activeProject.environment)
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    View transaction <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSuccess(null)}>
                    Send another
                  </Button>
                  <Button size="sm" onClick={onClose}>
                    Done
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="withdraw-recipient" className="text-xs font-medium text-foreground">
                  Destination {chain === "near" ? "NEAR account" : "Solana wallet"}
                </Label>
                <Input
                  id="withdraw-recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={chain === "near" ? "alice.testnet or 64-char hex address" : "Solana wallet address"}
                  className="font-mono text-xs"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={submitting || !activeSourceAddress}
                />
                {chain === "near" && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    If the destination is not registered on USDC yet, a 0.02 NEAR storage deposit is included automatically.
                  </p>
                )}
                {zeroSolGas && (
                  <p role="alert" className="text-[11px] text-destructive">
                    Your Solana wallet has 0 SOL to pay transaction fees.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <Label htmlFor="withdraw-amount" className="text-xs font-medium text-foreground">
                    Amount
                  </Label>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    Available: {balanceKnown ? `${formatUsdc(activeBalance)} USDC` : "—"}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <Input
                    id="withdraw-amount"
                    value={amountText}
                    onChange={(e) => setAmountText(e.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="pr-24 font-mono text-sm tabular-nums"
                    disabled={submitting || !activeSourceAddress}
                  />
                  <div className="absolute right-2 flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">USDC</span>
                    <button
                      type="button"
                      disabled={submitting || activeBalance <= 0n}
                      onClick={() => setAmountText(formatUsdcInput(activeBalance))}
                      className="rounded border border-border/80 bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground hover:bg-accent disabled:opacity-40 cursor-pointer"
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                >
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !activeSourceAddress || !balanceKnown || activeBalance <= 0n || zeroSolGas}
                >
                  {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {submitting ? (statusNote ?? "Sending…") : "Withdraw USDC"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
