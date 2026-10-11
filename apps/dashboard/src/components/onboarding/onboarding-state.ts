"use client";

export const BLINK_SHARED_KEY = "tidepay_onboarding_blink_action_shared";

/**
 * Dispatches and stores an onboarding event indicating the merchant has
 * distributed or copied their Blink / Checkout link.
 */
export function markBlinkShared(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BLINK_SHARED_KEY, "true");
    window.dispatchEvent(new CustomEvent("tidepay:blink-shared"));
  } catch {
    // Ignore storage quota or access errors
  }
}

/**
 * Checks whether the merchant has previously shared or copied a Blink/checkout link.
 */
export function isBlinkSharedLocally(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Clear out deprecated key from accidental nav link click
    if (localStorage.getItem("tidepay_onboarding_blink_shared")) {
      localStorage.removeItem("tidepay_onboarding_blink_shared");
    }
    return localStorage.getItem(BLINK_SHARED_KEY) === "true";
  } catch {
    return false;
  }
}
