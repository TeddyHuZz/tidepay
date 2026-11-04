use near_sdk::json_types::U128;
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::testing_env;
use near_sdk::AccountId;
use tidepay_contracts_near::TidePayContract;

fn get_context(predecessor: &str) -> VMContextBuilder {
    let mut builder = VMContextBuilder::new();
    builder.predecessor_account_id(predecessor.parse().unwrap());
    builder.current_account_id("tidepay.testnet".parse().unwrap());
    builder.block_timestamp(1_000_000_000 * 1_000); // 1,000s in ns
    builder
}

#[test]
fn test_create_and_get_plan() {
    let context = get_context("merchant.testnet");
    testing_env!(context.build());

    let mut contract = TidePayContract::new("treasury.testnet".parse().unwrap());

    let plan = contract.create_plan(
        "pro-monthly".to_string(),
        "usdc.testnet".parse().unwrap(),
        U128(20_000_000), // 20 USDC
        86400,            // 1 day
        U128(50_000),     // 0.05 USDC crank bounty
        Some(50),         // 0.5% fee
    );

    assert_eq!(plan.plan_id, "pro-monthly");
    assert_eq!(plan.amount, U128(20_000_000));
    assert!(plan.is_active);

    let fetched = contract.get_plan("pro-monthly".to_string()).expect("Plan not found");
    assert_eq!(fetched.merchant_id, "merchant.testnet".parse::<AccountId>().unwrap());
}

#[test]
#[should_panic(expected = "ERR_INVALID_INTERVAL")]
fn test_create_plan_invalid_interval() {
    let context = get_context("merchant.testnet");
    testing_env!(context.build());

    let mut contract = TidePayContract::new("treasury.testnet".parse().unwrap());
    contract.create_plan(
        "bad-plan".to_string(),
        "usdc.testnet".parse().unwrap(),
        U128(10_000_000),
        30, // below 60s minimum
        U128(10_000),
        None,
    );
}

const SEC: u64 = 1_000_000_000;

fn at(predecessor: &str, secs: u64) {
    let mut c = get_context(predecessor);
    c.block_timestamp(secs * SEC);
    testing_env!(c.build());
}

fn acct(s: &str) -> AccountId {
    s.parse().unwrap()
}

fn subscribe_msg() -> String {
    r#"{"action":"subscribe","plan_id":"saas-tier1"}"#.to_string()
}

/// Contract with a 10 USDC / 60s plan, and subscriber.testnet subscribed at T=100s with 50 USDC.
fn subscribed() -> TidePayContract {
    at("merchant.testnet", 0);
    let mut contract = TidePayContract::new(acct("treasury.testnet"));
    contract.create_plan(
        "saas-tier1".to_string(),
        acct("usdc.testnet"),
        U128(10_000_000),
        60,
        U128(50_000),
        Some(50),
    );
    at("usdc.testnet", 100);
    let unused = contract.ft_on_transfer(acct("subscriber.testnet"), U128(50_000_000), subscribe_msg());
    assert_eq!(unused.0, 0);
    contract
}

#[test]
fn test_subscribe_and_due_check() {
    let contract = subscribed();
    let sub = contract.get_subscription("saas-tier1".to_string(), acct("subscriber.testnet")).unwrap();
    assert_eq!(sub.cycle_count, 1);
    assert_eq!(sub.deposited_balance.0, 40_000_000); // 50 - 10 paid for epoch 0
    assert_eq!(sub.next_epoch_timestamp_ns.0, 160 * SEC);

    at("keeper.testnet", 120);
    assert!(!contract.is_subscription_due("saas-tier1".to_string(), acct("subscriber.testnet")));
    at("keeper.testnet", 160);
    assert!(contract.is_subscription_due("saas-tier1".to_string(), acct("subscriber.testnet")));
}

#[test]
fn test_process_epoch_advances_state() {
    let mut contract = subscribed();
    at("keeper.testnet", 160);
    let _ = contract.process_epoch("saas-tier1".to_string(), acct("subscriber.testnet"));

    let sub = contract.get_subscription("saas-tier1".to_string(), acct("subscriber.testnet")).unwrap();
    assert_eq!(sub.cycle_count, 2);
    assert_eq!(sub.deposited_balance.0, 30_000_000);
    assert_eq!(sub.next_epoch_timestamp_ns.0, 220 * SEC);
}

#[test]
#[should_panic(expected = "ERR_SUBSCRIPTION_NOT_DUE")]
fn test_process_epoch_not_due() {
    let mut contract = subscribed();
    at("keeper.testnet", 159);
    let _ = contract.process_epoch("saas-tier1".to_string(), acct("subscriber.testnet"));
}

#[test]
#[should_panic(expected = "ERR_SUBSCRIPTION_EXISTS")]
fn test_resubscribe_while_active_rejected() {
    let mut contract = subscribed();
    at("usdc.testnet", 110);
    contract.ft_on_transfer(acct("subscriber.testnet"), U128(10_000_000), subscribe_msg());
}

#[test]
#[should_panic(expected = "ERR_INVALID_TOKEN")]
fn test_wrong_token_rejected() {
    let mut contract = subscribed();
    at("fake.testnet", 110);
    contract.ft_on_transfer(acct("other.testnet"), U128(10_000_000), subscribe_msg());
}

#[test]
fn test_cancel_refunds_and_blocks_epoch() {
    let mut contract = subscribed();
    at("subscriber.testnet", 120);
    let _ = contract.cancel_subscription("saas-tier1".to_string());
    let sub = contract.get_subscription("saas-tier1".to_string(), acct("subscriber.testnet")).unwrap();
    assert!(!sub.is_active);
    assert_eq!(sub.deposited_balance.0, 0);
    assert!(!contract.is_subscription_due("saas-tier1".to_string(), acct("subscriber.testnet")));
}

#[test]
#[should_panic(expected = "ERR_INVALID_BOUNTY")]
fn test_bounty_plus_fee_exceeding_amount_rejected() {
    at("merchant.testnet", 0);
    let mut contract = TidePayContract::new(acct("treasury.testnet"));
    contract.create_plan("p".to_string(), acct("usdc.testnet"), U128(100), 60, U128(101), Some(50));
}

// ---- index views -----------------------------------------------------------

fn new_plan(contract: &mut TidePayContract, merchant: &str, plan_id: &str) {
    at(merchant, 0);
    contract.create_plan(plan_id.to_string(), acct("usdc.testnet"), U128(10_000_000), 60, U128(50_000), Some(50));
}

fn subscribe_as(contract: &mut TidePayContract, sender: &str, plan_id: &str) {
    at("usdc.testnet", 100);
    let msg = format!(r#"{{"action":"subscribe","plan_id":"{plan_id}"}}"#);
    contract.ft_on_transfer(acct(sender), U128(10_000_000), msg);
}

#[test]
fn test_get_merchant_plans_lists_only_that_merchants_plans() {
    at("merchant.testnet", 0);
    let mut contract = TidePayContract::new(acct("treasury.testnet"));
    new_plan(&mut contract, "merchant.testnet", "a1");
    new_plan(&mut contract, "merchant.testnet", "a2");
    new_plan(&mut contract, "other.testnet", "b1");

    let mine = contract.get_merchant_plans(acct("merchant.testnet"), 0, 10);
    assert_eq!(mine.iter().map(|p| p.plan_id.as_str()).collect::<Vec<_>>(), ["a1", "a2"]);
    let theirs = contract.get_merchant_plans(acct("other.testnet"), 0, 10);
    assert_eq!(theirs.len(), 1);
    assert!(contract.get_merchant_plans(acct("nobody.testnet"), 0, 10).is_empty());
}

#[test]
fn test_get_plan_subscribers_paginates() {
    at("merchant.testnet", 0);
    let mut contract = TidePayContract::new(acct("treasury.testnet"));
    new_plan(&mut contract, "merchant.testnet", "p");
    for s in ["s1.testnet", "s2.testnet", "s3.testnet"] {
        subscribe_as(&mut contract, s, "p");
    }

    assert_eq!(contract.get_plan_subscribers("p".to_string(), 0, 2).len(), 2);
    let last = contract.get_plan_subscribers("p".to_string(), 2, 2);
    assert_eq!(last.len(), 1);
    assert_eq!(last[0].subscriber_id, acct("s3.testnet"));
    assert!(contract.get_plan_subscribers("p".to_string(), 3, 2).is_empty());
}

#[test]
fn test_resubscribe_after_cancel_does_not_duplicate_subscriber() {
    at("merchant.testnet", 0);
    let mut contract = TidePayContract::new(acct("treasury.testnet"));
    new_plan(&mut contract, "merchant.testnet", "p");
    subscribe_as(&mut contract, "s1.testnet", "p");
    at("s1.testnet", 120);
    let _ = contract.cancel_subscription("p".to_string());
    subscribe_as(&mut contract, "s1.testnet", "p");

    assert_eq!(contract.get_plan_subscribers("p".to_string(), 0, 10).len(), 1);
}

#[test]
fn test_limit_is_clamped() {
    at("merchant.testnet", 0);
    let mut contract = TidePayContract::new(acct("treasury.testnet"));
    new_plan(&mut contract, "merchant.testnet", "p");
    for i in 0..101 {
        subscribe_as(&mut contract, &format!("s{i}.testnet"), "p");
    }

    assert_eq!(contract.get_plan_subscribers("p".to_string(), 0, 10_000).len(), 100);
}
