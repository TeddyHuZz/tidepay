pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("DfAycPzXuSu4EzqfAprZ11S8oQZ6nucuRniFNrNaK5CQ");

#[program]
pub mod tidepay {
    use super::*;

    pub fn initialize_plan(
        ctx: Context<InitializePlan>,
        plan_id: String,
        amount: u64,
        interval_seconds: i64,
        protocol_fee_bps: u16,
        crank_bounty_amount: u64,
    ) -> Result<()> {
        crate::instructions::initialize_plan::handle_initialize_plan(
            ctx,
            plan_id,
            amount,
            interval_seconds,
            protocol_fee_bps,
            crank_bounty_amount,
        )
    }

    pub fn subscribe(ctx: Context<Subscribe>) -> Result<()> {
        crate::instructions::subscribe::handle_subscribe(ctx)
    }

    pub fn process_epoch(ctx: Context<ProcessEpoch>) -> Result<()> {
        crate::instructions::process_epoch::handle_process_epoch(ctx)
    }

    pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
        crate::instructions::cancel_subscription::handle_cancel_subscription(ctx)
    }
}
