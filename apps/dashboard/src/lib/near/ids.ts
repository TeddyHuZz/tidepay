const PREFIX = "near:";

/** NEAR plans carry a `near:` prefix in the dashboard; Solana plans use their base58 address. */
export const isNearPlanId = (id: string) => id.startsWith(PREFIX) && id.length > PREFIX.length;
export const toNearPlanId = (planId: string) => `${PREFIX}${planId}`;
export const fromNearPlanId = (id: string) => (isNearPlanId(id) ? id.slice(PREFIX.length) : id);
