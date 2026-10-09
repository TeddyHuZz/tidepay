use anchor_lang::prelude::*;

#[constant]
pub const PLAN_SEED: &[u8] = b"plan";

#[constant]
pub const SUBSCRIPTION_SEED: &[u8] = b"subscription";

#[constant]
pub const AUTH_SEED: &[u8] = b"tidepay_auth";

pub const BPS_DENOMINATOR: u64 = 10_000;
pub const MIN_INTERVAL_SECONDS: i64 = 60;
pub const MAX_PROTOCOL_FEE_BPS: u16 = 500;
