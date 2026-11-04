/** Text shown when NEAR plans could not be read; null when there is nothing to say. */
export function nearBannerMessage(nearError: string | null): string | null {
  if (nearError === null) return null;
  const reason = nearError.trim();
  return `Could not load your NEAR plans${reason ? ` (${reason})` : ""}. Solana data is shown as usual; refresh to try NEAR again.`;
}
