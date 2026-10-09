use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::constants::{AUTH_SEED, SUBSCRIPTION_SEED};
use crate::error::TidePayError;
use crate::state::{MerchantPlan, SubscriptionRecord};

#[derive(Accounts)]
pub struct Subscribe<'info> {
    #[account(mut)]
    pub subscriber: Signer<'info>,

    #[account(
        mut,
        constraint = plan.is_active @ TidePayError::SubscriptionInactive
    )]
    pub plan: Account<'info, MerchantPlan>,

    #[account(
        init,
        payer = subscriber,
        space = 8 + SubscriptionRecord::INIT_SPACE,
        seeds = [SUBSCRIPTION_SEED, plan.key().as_ref(), subscriber.key().as_ref()],
        bump
    )]
    pub subscription: Account<'info, SubscriptionRecord>,

    #[account(
        mut,
        constraint = subscriber_token_account.owner == subscriber.key() @ TidePayError::Unauthorized,
        constraint = subscriber_token_account.mint == plan.token_mint @ TidePayError::Unauthorized
    )]
    pub subscriber_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = merchant_token_account.key() == plan.merchant_token_account @ TidePayError::Unauthorized
    )]
    pub merchant_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = token_mint.key() == plan.token_mint @ TidePayError::Unauthorized
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: TidePay delegated pull authority PDA
    #[account(
        seeds = [AUTH_SEED],
        bump
    )]
    pub program_authority: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handle_subscribe(ctx: Context<Subscribe>) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;
    let plan = &ctx.accounts.plan;

    // Verify SPL delegation
    let delegated_amount = ctx.accounts.subscriber_token_account.delegated_amount;
    require!(delegated_amount >= plan.amount, TidePayError::InsufficientAllowance);

    // 1. Anti-reentrancy: Update all state BEFORE CPI token transfer
    let subscription = &mut ctx.accounts.subscription;
    subscription.plan = plan.key();
    subscription.subscriber = ctx.accounts.subscriber.key();
    subscription.subscriber_token_account = ctx.accounts.subscriber_token_account.key();
    subscription.start_timestamp = now;
    subscription.last_epoch_timestamp = now;
    subscription.next_epoch_timestamp = now
        .checked_add(plan.interval_seconds)
        .ok_or(TidePayError::MathOverflow)?;
    subscription.cycle_count = 1;
    subscription.is_active = true;
    subscription.bump = ctx.bumps.subscription;

    // 2. Pull Epoch 0 payment via transfer_checked signed by program authority PDA
    let cpi_program = ctx.accounts.token_program.key();
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.subscriber_token_account.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.merchant_token_account.to_account_info(),
        authority: ctx.accounts.program_authority.to_account_info(),
    };

    let auth_bump = ctx.bumps.program_authority;
    let seeds = &[AUTH_SEED, &[auth_bump]];
    let signer_seeds = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    token_interface::transfer_checked(cpi_ctx, plan.amount, ctx.accounts.token_mint.decimals)?;

    Ok(())
}
