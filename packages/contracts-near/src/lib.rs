pub mod errors;
pub mod types;

use near_sdk::collections::LookupMap;
use near_sdk::{env, near, require, AccountId, PanicOnDefault};
use types::*;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct TidePayContract {
    pub owner_id: AccountId,
    pub protocol_fee_recipient: AccountId,
    pub plans: LookupMap<String, MerchantPlan>,
    pub subscriptions: LookupMap<String, SubscriptionRecord>, // Key: format!("{}:{}", plan_id, subscriber_id)
}

#[near]
impl TidePayContract {
    #[init]
    pub fn new(protocol_fee_recipient: AccountId) -> Self {
        require!(!env::state_exists(), "Contract is already initialized");
        Self {
            owner_id: env::predecessor_account_id(),
            protocol_fee_recipient,
            plans: LookupMap::new(b"p"),
            subscriptions: LookupMap::new(b"s"),
        }
    }
}
