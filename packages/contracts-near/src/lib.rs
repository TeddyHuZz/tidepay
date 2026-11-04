pub mod errors;
pub mod types;

use near_sdk::collections::LookupMap;
use errors::*;
use near_sdk::json_types::U128;
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

    pub fn create_plan(
        &mut self,
        plan_id: String,
        token_id: AccountId,
        amount: U128,
        interval_seconds: u64,
        crank_bounty: U128,
        protocol_fee_bps: Option<u16>,
    ) -> MerchantPlan {
        require!(amount.0 > 0, ERR_INVALID_AMOUNT);
        require!(interval_seconds >= MIN_INTERVAL_SECONDS, ERR_INVALID_INTERVAL);
        require!(self.plans.get(&plan_id).is_none(), ERR_PLAN_EXISTS);

        let fee_bps = protocol_fee_bps.unwrap_or(DEFAULT_PROTOCOL_FEE_BPS);
        require!(fee_bps <= MAX_PROTOCOL_FEE_BPS, ERR_INVALID_FEE);

        let plan = MerchantPlan {
            plan_id: plan_id.clone(),
            merchant_id: env::predecessor_account_id(),
            token_id,
            amount,
            interval_seconds,
            protocol_fee_bps: fee_bps,
            crank_bounty,
            is_active: true,
            created_at_ns: env::block_timestamp(),
        };

        self.plans.insert(&plan_id, &plan);
        env::log_str(&format!("EVENT_PLAN_CREATED: plan_id={}, merchant={}", plan_id, plan.merchant_id));
        plan
    }

    pub fn toggle_plan_status(&mut self, plan_id: String, is_active: bool) {
        let mut plan = self.plans.get(&plan_id).expect(ERR_PLAN_NOT_FOUND);
        let caller = env::predecessor_account_id();
        require!(plan.merchant_id == caller || caller == self.owner_id, ERR_UNAUTHORIZED);
        plan.is_active = is_active;
        self.plans.insert(&plan_id, &plan);
    }

    pub fn get_plan(&self, plan_id: String) -> Option<MerchantPlan> {
        self.plans.get(&plan_id)
    }

    pub fn get_subscription(&self, plan_id: String, subscriber_id: AccountId) -> Option<SubscriptionRecord> {
        self.subscriptions.get(&format!("{}:{}", plan_id, subscriber_id))
    }

    pub fn is_subscription_due(&self, plan_id: String, subscriber_id: AccountId) -> bool {
        self.get_subscription(plan_id, subscriber_id)
            .is_some_and(|s| s.is_active && env::block_timestamp() >= s.next_epoch_timestamp_ns)
    }
}
