export const USER_AGENT = "TiktimBot/1.0 (+https://tiktim.co.il/about)";

export class RateLimiter {
  private lastRequestAt = 0;

  constructor(private readonly minIntervalMs: number) {}

  async wait(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    const remaining = this.minIntervalMs - elapsed;
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    this.lastRequestAt = Date.now();
  }
}

export type FetchWithRetryOptions = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  maxRetries?: number;
  rateLimiter?: RateLimiter;
};

/** Fetches with a clear User-Agent, exponential backoff on 429/5xx, and an optional rate limiter. */
export async function fetchWithRetry(url: string, options: FetchWithRetryOptions = {}): Promise<Response> {
  const maxRetries = options.maxRetries ?? 3;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (options.rateLimiter) await options.rateLimiter.wait();

    try {
      const response = await fetch(url, {
        signal: options.signal,
        headers: { "User-Agent": USER_AGENT, ...options.headers },
      });

      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          const backoffMs = 2 ** attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const backoffMs = 2 ** attempt * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}
