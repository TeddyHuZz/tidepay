export interface WaitOptions {
  attempts: number;
  intervalMs: number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Calls `read` until it returns something other than null/undefined, up to `attempts` times.
 * NEAR RPC reads can briefly lag a write that just finalized, so callers wait for the data to be visible.
 * Read errors propagate; running out of attempts returns null.
 */
export async function waitFor<T>(read: () => Promise<T | null | undefined>, options: WaitOptions): Promise<T | null> {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    const value = await read();
    if (value != null) return value;
    if (attempt < options.attempts) await sleep(options.intervalMs);
  }
  return null;
}
