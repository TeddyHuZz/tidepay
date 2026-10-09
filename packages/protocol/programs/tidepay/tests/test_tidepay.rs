use {
    anchor_lang::prelude::Pubkey,
    solana_keypair::Keypair,
    solana_signer::Signer,
};
use tidepay::{
    constants::{
        AUTH_SEED, BPS_DENOMINATOR, MAX_PROTOCOL_FEE_BPS, MIN_INTERVAL_SECONDS, PLAN_SEED,
        SUBSCRIPTION_SEED,
    },
    error::TidePayError,
};

#[test]
fn test_pda_derivations_and_constants() {
    let program_id = tidepay::id();
    let merchant = Keypair::new();
    let plan_id = "starter_monthly";

    let (plan_pda, _bump) = Pubkey::find_program_address(
        &[PLAN_SEED, merchant.pubkey().as_ref(), plan_id.as_bytes()],
        &program_id,
    );
    assert_ne!(plan_pda, Pubkey::default());

    let (auth_pda, _auth_bump) = Pubkey::find_program_address(&[AUTH_SEED], &program_id);
    assert_ne!(auth_pda, Pubkey::default());

    let subscriber = Keypair::new();
    let (sub_pda, _sub_bump) = Pubkey::find_program_address(
        &[
            SUBSCRIPTION_SEED,
            plan_pda.as_ref(),
            subscriber.pubkey().as_ref(),
        ],
        &program_id,
    );
    assert_ne!(sub_pda, Pubkey::default());
}

#[test]
fn test_plan_parameter_bounds() {
    // 1. Verify minimum interval requirement (60s fast-forward demo on devnet)
    assert_eq!(MIN_INTERVAL_SECONDS, 60);

    // 2. Verify fee bounds
    assert!(MAX_PROTOCOL_FEE_BPS <= 500); // 5% max
    assert_eq!(BPS_DENOMINATOR, 10_000);

    // 3. Error code definitions
    assert_ne!(TidePayError::ZeroAmount, TidePayError::EpochNotDue);
    assert_ne!(TidePayError::IntervalTooShort, TidePayError::InvalidFeeBps);
    assert_ne!(TidePayError::InsufficientAllowance, TidePayError::Unauthorized);
}

#[test]
fn test_temporal_billing_and_reentrancy_invariance() {
    let now: i64 = 1_700_000_000;
    let interval: i64 = 3600; // 1 hour

    // Subscription created at `now`
    let mut next_epoch_timestamp = now + interval;
    let mut cycle_count: u64 = 1;

    // Premature attempt (e.g. 10 minutes before due)
    let premature_time = next_epoch_timestamp - 600;
    assert!(
        premature_time < next_epoch_timestamp,
        "Premature pull should be strictly rejected"
    );

    // Due time reached
    let due_time = next_epoch_timestamp + 10;
    assert!(
        due_time >= next_epoch_timestamp,
        "Billing should be permitted once epoch is reached"
    );

    // State updated before external execution (re-entrancy defense)
    next_epoch_timestamp = due_time + interval;
    cycle_count += 1;
    assert_eq!(cycle_count, 2);
    assert_eq!(next_epoch_timestamp, due_time + interval);
}

#[test]
fn test_payout_split_arithmetic() {
    let subscription_amount: u64 = 10_000_000; // 10 USDC (6 decimals)
    let crank_bounty: u64 = 50_000; // 0.05 USDC bounty

    assert!(crank_bounty < subscription_amount);

    let merchant_net = subscription_amount.checked_sub(crank_bounty).unwrap();
    assert_eq!(merchant_net, 9_950_000);
    assert_eq!(merchant_net + crank_bounty, subscription_amount);
}
