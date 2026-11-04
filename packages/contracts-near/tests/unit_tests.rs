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
