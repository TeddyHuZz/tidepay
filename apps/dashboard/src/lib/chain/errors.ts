import { TIDEPAY_IDL } from "@tidepay/types";

const PROGRAM_ERRORS = new Map<number, string>(
  (TIDEPAY_IDL.errors ?? []).map((error) => [error.code, error.msg ?? error.name]),
);

/** Turns wallet, RPC and program failures into a sentence for the UI. */
export function describeTransactionError(error: unknown): string {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  const logs = typeof error === "object" && error !== null && "logs" in error && Array.isArray(error.logs) ? error.logs.join("\n") : "";
  const haystack = `${text}\n${logs}`;

  if (/reject|denied|cancel/i.test(haystack)) return "You cancelled the request in your wallet.";

  const custom = /custom program error: 0x([0-9a-f]+)/i.exec(haystack);
  if (custom) {
    const message = PROGRAM_ERRORS.get(parseInt(custom[1], 16));
    if (message) return `${message}.`;
  }
  const anchor = /Error Number: (\d+)/.exec(haystack);
  if (anchor) {
    const message = PROGRAM_ERRORS.get(Number(anchor[1]));
    if (message) return `${message}.`;
  }

  if (/insufficient (funds|lamports)|0x1\b/i.test(haystack)) {
    return "Your wallet does not have enough SOL or USDC for this transaction.";
  }
  if (/already in use/i.test(haystack)) return "This account already exists on-chain.";
  if (/blockhash not found|expired/i.test(haystack)) return "The transaction expired before it was confirmed. Please try again.";

  return "The transaction failed. Please try again.";
}
