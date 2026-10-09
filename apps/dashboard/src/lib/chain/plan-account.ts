import { TIDEPAY_IDL, TIDEPAY_PROGRAM_ID } from "@tidepay/types";

const PLAN_DISCRIMINATOR = Uint8Array.from(
  TIDEPAY_IDL.accounts.find((account) => account.name === "MerchantPlan")!.discriminator,
);

/** True when the account is a TidePay MerchantPlan (owned by the program, right discriminator). */
export function isPlanAccount(
  account: { owner: { toBase58(): string }; data: Uint8Array } | null,
): boolean {
  if (!account || account.owner.toBase58() !== TIDEPAY_PROGRAM_ID) return false;
  if (account.data.length < PLAN_DISCRIMINATOR.length) return false;
  return PLAN_DISCRIMINATOR.every((byte, index) => account.data[index] === byte);
}
