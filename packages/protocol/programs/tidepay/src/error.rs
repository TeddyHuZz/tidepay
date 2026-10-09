use anchor_lang::prelude::*;

#[error_code]
pub enum TidePayError {
    #[msg("Plan ID cannot be empty or exceed 32 characters")]
    InvalidPlanId,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Billing interval must be at least 60 seconds")]
    IntervalTooShort,
    #[msg("Epoch billing is not yet due")]
    EpochNotDue,
    #[msg("Subscription is not active")]
    SubscriptionInactive,
    #[msg("Protocol fee basis points exceed maximum allowed")]
    InvalidFeeBps,
    #[msg("Insufficient delegated allowance for subscription pull")]
    InsufficientAllowance,
    #[msg("Unauthorized signer for this action")]
    Unauthorized,
    #[msg("Calculation overflow")]
    MathOverflow,
}
