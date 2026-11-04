const KNOWN: [code: string, message: string][] = [
  ["ERR_PLAN_EXISTS", "A plan with this ID already exists on NEAR. Choose another ID."],
  ["ERR_INVALID_INTERVAL", "The billing interval must be at least 60 seconds."],
  ["ERR_INVALID_BOUNTY", "The price is too low to cover the protocol fee and renewal fee."],
  ["ERR_INVALID_FEE", "The protocol fee is above the 5% maximum."],
  ["ERR_PLAN_NOT_FOUND", "This plan does not exist on NEAR."],
  ["ERR_UNAUTHORIZED", "Only the plan's merchant can do this."],
];

/** Turns a NEAR/contract error into text a merchant can act on. */
export function describeNearError(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong on NEAR. Please try again.";
  return KNOWN.find(([code]) => error.message.includes(code))?.[1] ?? error.message;
}
