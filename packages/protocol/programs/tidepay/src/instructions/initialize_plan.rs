use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount};
use crate::constants::{MAX_PROTOCOL_FEE_BPS, MIN_INTERVAL_SECONDS, PLAN_SEED};
use crate::error::TidePayError;
use crate::state::MerchantPlan;

#[derive(Accounts)]
#[instruction(plan_id: String)]
pub struct InitializePlan<'info> {
    #[account(mut)]
    pub merchant: Signer<'info>,

    #[account(
        init,
        payer = merchant,
        space = 8 + MerchantPlan::INIT_SPACE,
        seeds = [PLAN_SEED, merchant.key().as_ref(), plan_id.as_bytes()],
        bump
    )]
    pub plan: Account<'info, MerchantPlan>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        constraint = merchant_token_account.owner == merchant.key() @ TidePayError::Unauthorized,
        constraint = merchant_token_account.mint == token_mint.key() @ TidePayError::Unauthorized
    )]
    pub merchant_token_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_plan(
    ctx: Context<InitializePlan>,
    plan_id: String,
    amount: u64,
    interval_seconds: i64,
    protocol_fee_bps: u16,
    crank_bounty_amount: u64,
) -> Result<()> {
    require!(!plan_id.is_empty() && plan_id.len() <= 32, TidePayError::InvalidPlanId);
    require!(amount > 0, TidePayError::ZeroAmount);
    require!(interval_seconds >= MIN_INTERVAL_SECONDS, TidePayError::IntervalTooShort);
    require!(protocol_fee_bps <= MAX_PROTOCOL_FEE_BPS, TidePayError::InvalidFeeBps);
    require!(crank_bounty_amount < amount, TidePayError::ZeroAmount);

    let plan = &mut ctx.accounts.plan;
    plan.merchant = ctx.accounts.merchant.key();
    plan.token_mint = ctx.accounts.token_mint.key();
    plan.merchant_token_account = ctx.accounts.merchant_token_account.key();
    plan.amount = amount;
    plan.interval_seconds = interval_seconds;
    plan.plan_id = plan_id;
    plan.protocol_fee_bps = protocol_fee_bps;
    plan.crank_bounty_amount = crank_bounty_amount;
    plan.is_active = true;
    plan.bump = ctx.bumps.plan;

    Ok(())
}
