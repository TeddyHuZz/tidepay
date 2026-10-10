use anchor_lang::prelude::*;
use crate::constants::PLAN_SEED;
use crate::error::TidePayError;
use crate::state::MerchantPlan;

#[derive(Accounts)]
pub struct TogglePlanStatus<'info> {
    #[account(mut)]
    pub merchant: Signer<'info>,

    #[account(
        mut,
        seeds = [PLAN_SEED, merchant.key().as_ref(), plan.plan_id.as_bytes()],
        bump = plan.bump,
        constraint = plan.merchant == merchant.key() @ TidePayError::Unauthorized
    )]
    pub plan: Account<'info, MerchantPlan>,
}

pub fn handle_toggle_plan_status(ctx: Context<TogglePlanStatus>, is_active: bool) -> Result<()> {
    let plan = &mut ctx.accounts.plan;
    plan.is_active = is_active;
    Ok(())
}
