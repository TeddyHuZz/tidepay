use anchor_lang::prelude::*;
use crate::constants::SUBSCRIPTION_SEED;
use crate::error::TidePayError;
use crate::state::{MerchantPlan, SubscriptionRecord};

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    #[account(mut)]
    pub subscriber: Signer<'info>,

    pub plan: Account<'info, MerchantPlan>,

    #[account(
        mut,
        close = subscriber,
        seeds = [SUBSCRIPTION_SEED, plan.key().as_ref(), subscriber.key().as_ref()],
        bump = subscription.bump,
        constraint = subscription.subscriber == subscriber.key() @ TidePayError::Unauthorized
    )]
    pub subscription: Account<'info, SubscriptionRecord>,
}

pub fn handle_cancel_subscription(_ctx: Context<CancelSubscription>) -> Result<()> {
    // PDA is automatically zeroed and rent lamports returned to subscriber via `close = subscriber`
    Ok(())
}
