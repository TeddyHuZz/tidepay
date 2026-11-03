use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::AccountId;

pub const BPS_DENOMINATOR: u128 = 10_000;
pub const MIN_INTERVAL_SECONDS: u64 = 60; // 60s fast-forward for demo
pub const SECONDS_TO_NANOS: u64 = 1_000_000_000;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
#[borsh(crate = "near_sdk::borsh")]
pub struct MerchantPlan {
    pub plan_id: String,
    pub merchant_id: AccountId,
    pub token_id: AccountId,
    pub amount: U128,
    pub interval_seconds: u64,
    pub protocol_fee_bps: u16,
    pub crank_bounty: U128,
    pub is_active: bool,
    pub created_at_ns: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
#[borsh(crate = "near_sdk::borsh")]
pub struct SubscriptionRecord {
    pub plan_id: String,
    pub subscriber_id: AccountId,
    pub start_timestamp_ns: u64,
    pub last_epoch_timestamp_ns: u64,
    pub next_epoch_timestamp_ns: u64,
    pub cycle_count: u64,
    pub is_active: bool,
    pub deposited_balance: U128,
}
