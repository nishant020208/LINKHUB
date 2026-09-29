/**
 * Rate-limiting and exponential backoff retry utility for Supabase Edge Functions.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOpts: RetryOptions = {}
): Promise<Response> {
  const maxRetries = retryOpts.maxRetries ?? 3;
  let delay = retryOpts.initialDelayMs ?? 1000;
  const maxDelay = retryOpts.maxDelayMs ?? 10000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429 && attempt < maxRetries) {
        // Honor Retry-After header if present
        const retryAfterHeader = response.headers.get('Retry-After');
        let waitTime = delay;
        if (retryAfterHeader) {
          const seconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(seconds)) waitTime = seconds * 1000;
        } else {
          // Jittered exponential backoff
          const jitter = Math.random() * 200;
          waitTime = Math.min(delay + jitter, maxDelay);
          delay *= 2;
        }

        console.warn(`[RateLimit 429] Retrying ${url} after ${waitTime}ms (Attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      if (response.status >= 500 && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }

      return response;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}
