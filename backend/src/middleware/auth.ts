import { Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";

// Cache validated keys for 10 minutes to avoid hitting provider APIs on every request
const validatedKeys = new Map<string, number>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function hashKey(provider: string, apiKey: string): string {
  return createHash("sha256").update(`${provider}:${apiKey}`).digest("hex");
}

function isCached(provider: string, apiKey: string): boolean {
  const hash = hashKey(provider, apiKey);
  const timestamp = validatedKeys.get(hash);
  if (timestamp && Date.now() - timestamp < CACHE_TTL_MS) {
    return true;
  }
  if (timestamp) {
    validatedKeys.delete(hash);
  }
  return false;
}

function cacheKey(provider: string, apiKey: string): void {
  validatedKeys.set(hashKey(provider, apiKey), Date.now());
}

async function validateKey(provider: string, apiKey: string): Promise<boolean> {
  try {
    switch (provider) {
      case "zai": {
        const res = await fetch("https://open.bigmodel.cn/api/paas/v4/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return res.status !== 401 && res.status !== 403;
      }
      case "openai": {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return res.status !== 401 && res.status !== 403;
      }
      case "anthropic": {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 1,
            messages: [{ role: "user", content: "hi" }],
          }),
        });
        // A valid key will get a non-401 response (possibly 400 or 200)
        return res.status !== 401 && res.status !== 403;
      }
      default:
        return false;
    }
  } catch {
    // Network error — cannot validate, reject
    return false;
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const provider = req.headers["x-provider"] as string | undefined;
  const apiKey = req.headers["x-api-key"] as string | undefined;

  if (!provider || !apiKey) {
    res.status(401).json({ error: "Missing X-Provider or X-Api-Key headers" });
    return;
  }

  if (!["zai", "openai", "anthropic"].includes(provider)) {
    res.status(401).json({ error: `Unsupported provider: ${provider}` });
    return;
  }

  // Check cache first
  if (isCached(provider, apiKey)) {
    next();
    return;
  }

  // Validate against provider
  const valid = await validateKey(provider, apiKey);
  if (!valid) {
    res.status(401).json({ error: `Invalid API key for ${provider}` });
    return;
  }

  cacheKey(provider, apiKey);
  next();
}
