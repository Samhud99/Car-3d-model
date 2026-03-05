import { ProxyAgent, fetch as undiciFetch } from "undici";

const USER_AGENT =
  "Mozilla/5.0 (compatible; CarModelSkill/1.0; scraper for internal use)";

/**
 * Fetch HTML from a URL, routing through HTTPS_PROXY / HTTP_PROXY if set.
 * Node's built-in fetch() does NOT honor proxy env vars, so we use undici's
 * ProxyAgent when a proxy is configured.
 */
export async function fetchHtml(url: string): Promise<string> {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

  const options: Parameters<typeof undiciFetch>[1] = {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  };

  if (proxyUrl) {
    const agent = new ProxyAgent(proxyUrl);
    (options as Record<string, unknown>).dispatcher = agent;
  }

  const response = await undiciFetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return response.text();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Escape a string for safe use inside a RegExp constructor.
 */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
