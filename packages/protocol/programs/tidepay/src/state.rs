use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MerchantPlan {
    pub merchant: Pubkey,
    pub token_mint: Pubkey,
    pub merchant_token_account: Pubkey,
    pub amount: u64,
    pub interval_seconds: i64,
    #[max_len(32)]
    pub plan_id: String,
    pub protocol_fee_bps: u16,
    pub crank_bounty_amount: u64,
    pub is_active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SubscriptionRecord {
    pub plan: Pubkey,
    pub subscriber: Pubkey,
    pub subscriber_token_account: Pubkey,
    pub start_timestamp: i64,
    pub last_epoch_timestamp: i64,
    pub next_epoch_timestamp: i64,
    pub cycle_count: u64,
    pub is_active: bool,
    pub bump: u8,
}
