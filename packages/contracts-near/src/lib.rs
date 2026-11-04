pub mod errors;
pub mod types;

use near_sdk::collections::LookupMap;
use errors::*;
use near_sdk::json_types::{U128, U64};
use near_sdk::{env, ext_contract, near, require, AccountId, NearToken, PanicOnDefault, Promise};
use types::*;

const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1); // NEP-141 ft_transfer requires exactly 1 yocto

#[ext_contract(ext_ft)]
pub trait ExtFungibleToken {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
}

#[near(serializers = [json])]
pub struct FtTransferMsg {
    pub action: String, // "subscribe" or "deposit"
    pub plan_id: String,
}

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
        // Keeps merchant_amount = amount - fee - bounty from underflowing in process_epoch
        let fee = amount.0 * fee_bps as u128 / BPS_DENOMINATOR;
        require!(fee + crank_bounty.0 <= amount.0, ERR_INVALID_BOUNTY);

        let plan = MerchantPlan {
            plan_id: plan_id.clone(),
            merchant_id: env::predecessor_account_id(),
            token_id,
            amount,
            interval_seconds,
            protocol_fee_bps: fee_bps,
            crank_bounty,
            is_active: true,
            created_at_ns: U64(env::block_timestamp()),
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
            .is_some_and(|s| s.is_active && env::block_timestamp() >= s.next_epoch_timestamp_ns.0)
    }
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> U128 {
        let token_id = env::predecessor_account_id();
        let parsed: FtTransferMsg = near_sdk::serde_json::from_str(&msg).expect(ERR_INVALID_MSG);
        let plan = self.plans.get(&parsed.plan_id).expect(ERR_PLAN_NOT_FOUND);
        require!(plan.token_id == token_id, ERR_INVALID_TOKEN);

        let sub_key = format!("{}:{}", parsed.plan_id, sender_id);
        let existing = self.subscriptions.get(&sub_key);
        let now_ns = env::block_timestamp();

        match parsed.action.as_str() {
            "subscribe" => {
                require!(plan.is_active, ERR_PLAN_INACTIVE);
                require!(existing.map_or(true, |s| !s.is_active), ERR_SUBSCRIPTION_EXISTS);
                require!(amount.0 >= plan.amount.0, ERR_INSUFFICIENT_PAYMENT);

                // Effects before interactions
                let sub = SubscriptionRecord {
                    plan_id: parsed.plan_id.clone(),
                    subscriber_id: sender_id.clone(),
                    start_timestamp_ns: U64(now_ns),
                    last_epoch_timestamp_ns: U64(now_ns),
                    next_epoch_timestamp_ns: U64(now_ns + plan.interval_seconds * SECONDS_TO_NANOS),
                    cycle_count: 1,
                    is_active: true,
                    deposited_balance: U128(amount.0 - plan.amount.0),
                };
                self.subscriptions.insert(&sub_key, &sub);
                env::log_str(&format!("EVENT_SUBSCRIBED: plan={}, subscriber={}", parsed.plan_id, sender_id));

                // Epoch 0 is paid immediately; no crank bounty since no keeper is involved
                let fee = plan.amount.0 * plan.protocol_fee_bps as u128 / BPS_DENOMINATOR;
                let _ = ext_ft::ext(token_id.clone())
                    .with_attached_deposit(ONE_YOCTO)
                    .ft_transfer(plan.merchant_id, U128(plan.amount.0 - fee), Some("TidePay Epoch 0".to_string()));
                if fee > 0 {
                    let _ = ext_ft::ext(token_id)
                        .with_attached_deposit(ONE_YOCTO)
                        .ft_transfer(self.protocol_fee_recipient.clone(), U128(fee), Some("TidePay Protocol Fee".to_string()));
                }
                U128(0)
            }
            "deposit" => {
                let mut sub = existing.expect(ERR_SUBSCRIPTION_NOT_FOUND);
                require!(sub.is_active, ERR_SUBSCRIPTION_INACTIVE); // else tokens would be locked
                sub.deposited_balance = U128(sub.deposited_balance.0 + amount.0);
                self.subscriptions.insert(&sub_key, &sub);
                U128(0)
            }
            _ => env::panic_str(ERR_UNKNOWN_ACTION),
        }
    }

    /// Callable by anyone (the keeper); the caller receives the plan's crank bounty.
    pub fn process_epoch(&mut self, plan_id: String, subscriber_id: AccountId) -> Promise {
        let plan = self.plans.get(&plan_id).expect(ERR_PLAN_NOT_FOUND);
        let sub_key = format!("{}:{}", plan_id, subscriber_id);
        let mut sub = self.subscriptions.get(&sub_key).expect(ERR_SUBSCRIPTION_NOT_FOUND);

        require!(sub.is_active, ERR_SUBSCRIPTION_INACTIVE);
        let now_ns = env::block_timestamp();
        require!(now_ns >= sub.next_epoch_timestamp_ns.0, ERR_SUBSCRIPTION_NOT_DUE);
        require!(sub.deposited_balance.0 >= plan.amount.0, ERR_INSUFFICIENT_BALANCE);

        // Effects before interactions
        sub.deposited_balance = U128(sub.deposited_balance.0 - plan.amount.0);
        sub.last_epoch_timestamp_ns = U64(now_ns);
        sub.next_epoch_timestamp_ns = U64(now_ns + plan.interval_seconds * SECONDS_TO_NANOS);
        sub.cycle_count += 1;
        self.subscriptions.insert(&sub_key, &sub);

        let keeper = env::predecessor_account_id();
        let bounty = plan.crank_bounty.0;
        let fee = plan.amount.0 * plan.protocol_fee_bps as u128 / BPS_DENOMINATOR;
        let merchant_amount = plan.amount.0 - fee - bounty; // non-negative, enforced in create_plan

        env::log_str(&format!(
            "EVENT_EPOCH_PROCESSED: plan={}, sub={}, cycle={}, keeper={}",
            plan_id, subscriber_id, sub.cycle_count, keeper
        ));

        let pay = |to: AccountId, amt: u128, memo: String| {
            ext_ft::ext(plan.token_id.clone()).with_attached_deposit(ONE_YOCTO).ft_transfer(to, U128(amt), Some(memo))
        };
        let mut all = pay(plan.merchant_id.clone(), merchant_amount, format!("TidePay Cycle {}", sub.cycle_count));
        if bounty > 0 {
            all = all.and(pay(keeper, bounty, "TidePay Crank Bounty".to_string()));
        }
        if fee > 0 {
            all = all.and(pay(self.protocol_fee_recipient.clone(), fee, "TidePay Fee".to_string()));
        }
        all
    }

    pub fn cancel_subscription(&mut self, plan_id: String) -> Promise {
        let subscriber_id = env::predecessor_account_id();
        let sub_key = format!("{}:{}", plan_id, subscriber_id);
        let mut sub = self.subscriptions.get(&sub_key).expect(ERR_SUBSCRIPTION_NOT_FOUND);
        let plan = self.plans.get(&plan_id).expect(ERR_PLAN_NOT_FOUND);

        require!(sub.is_active, ERR_ALREADY_CANCELLED);
        let refund = sub.deposited_balance.0;
        sub.is_active = false;
        sub.deposited_balance = U128(0);
        self.subscriptions.insert(&sub_key, &sub);
        env::log_str(&format!("EVENT_SUBSCRIPTION_CANCELLED: plan={}, sub={}, refunded={}", plan_id, subscriber_id, refund));

        if refund > 0 {
            ext_ft::ext(plan.token_id)
                .with_attached_deposit(ONE_YOCTO)
                .ft_transfer(subscriber_id, U128(refund), Some("TidePay Subscription Refund".to_string()))
        } else {
            Promise::new(subscriber_id) // no-op promise; nothing to refund
        }
    }
}
