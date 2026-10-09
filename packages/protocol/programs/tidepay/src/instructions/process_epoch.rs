use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::constants::{AUTH_SEED, SUBSCRIPTION_SEED};
use crate::error::TidePayError;
use crate::state::{MerchantPlan, SubscriptionRecord};

#[derive(Accounts)]
pub struct ProcessEpoch<'info> {
    #[account(mut)]
    pub crank: Signer<'info>,

    #[account(
        mut,
        constraint = plan.is_active @ TidePayError::SubscriptionInactive
    )]
    pub plan: Account<'info, MerchantPlan>,

    #[account(
        mut,
        seeds = [SUBSCRIPTION_SEED, plan.key().as_ref(), subscription.subscriber.as_ref()],
        bump = subscription.bump,
        constraint = subscription.is_active @ TidePayError::SubscriptionInactive
    )]
    pub subscription: Account<'info, SubscriptionRecord>,

    #[account(
        mut,
        constraint = subscriber_token_account.key() == subscription.subscriber_token_account @ TidePayError::Unauthorized,
        constraint = subscriber_token_account.mint == plan.token_mint @ TidePayError::Unauthorized
    )]
    pub subscriber_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = merchant_token_account.key() == plan.merchant_token_account @ TidePayError::Unauthorized
    )]
    pub merchant_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = crank_token_account.owner == crank.key() @ TidePayError::Unauthorized,
        constraint = crank_token_account.mint == plan.token_mint @ TidePayError::Unauthorized
    )]
    pub crank_token_account: InterfaceAccount<'info, TokenAccount>,

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
}

pub fn handle_process_epoch(ctx: Context<ProcessEpoch>) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;
    let plan = &ctx.accounts.plan;
    let subscription = &mut ctx.accounts.subscription;

    // Temporal validation: T >= T_next
    require!(now >= subscription.next_epoch_timestamp, TidePayError::EpochNotDue);

    // Verify allowance
    let delegated_amount = ctx.accounts.subscriber_token_account.delegated_amount;
    require!(delegated_amount >= plan.amount, TidePayError::InsufficientAllowance);

    // 1. Anti-reentrancy: Mutate state BEFORE external CPI calls
    subscription.last_epoch_timestamp = now;
    subscription.next_epoch_timestamp = now
        .checked_add(plan.interval_seconds)
        .ok_or(TidePayError::MathOverflow)?;
    subscription.cycle_count = subscription
        .cycle_count
        .checked_add(1)
        .ok_or(TidePayError::MathOverflow)?;

    let auth_bump = ctx.bumps.program_authority;
    let seeds = &[AUTH_SEED, &[auth_bump]];
    let signer_seeds = &[&seeds[..]];

    let bounty = plan.crank_bounty_amount;
    let merchant_net = plan
        .amount
        .checked_sub(bounty)
        .ok_or(TidePayError::MathOverflow)?;

    let cpi_program = ctx.accounts.token_program.key();

    // 2. Transfer crank bounty to keeper if configured
    if bounty > 0 {
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.subscriber_token_account.to_account_info(),
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.crank_token_account.to_account_info(),
            authority: ctx.accounts.program_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token_interface::transfer_checked(cpi_ctx, bounty, ctx.accounts.token_mint.decimals)?;
    }

    // 3. Transfer remaining subscription amount to merchant
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.subscriber_token_account.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.merchant_token_account.to_account_info(),
        authority: ctx.accounts.program_authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    token_interface::transfer_checked(cpi_ctx, merchant_net, ctx.accounts.token_mint.decimals)?;

    Ok(())
}
