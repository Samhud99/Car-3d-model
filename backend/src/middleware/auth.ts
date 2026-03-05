import { Request, Response, NextFunction } from "express";
import { readFileSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";

let cachedToken: string | null = null;

function getToken(): string | null {
  if (cachedToken !== null) return cachedToken;

  // Try Docker secret first
  try {
    cachedToken = readFileSync("/run/secrets/frontend_token", "utf-8").trim();
    return cachedToken;
  } catch {
    // Fall through to env var
  }

  // Fallback to environment variable
  const envToken = process.env.FRONTEND_TOKEN;
  if (envToken) {
    cachedToken = envToken;
    return cachedToken;
  }

  return null;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = getToken();

  if (!token) {
    res.status(500).json({ error: "No authentication token configured" });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const provided = authHeader.slice(7);

  // Use timing-safe comparison to prevent timing attacks
  const tokenBuf = Buffer.from(token, "utf-8");
  const providedBuf = Buffer.from(provided, "utf-8");

  if (
    tokenBuf.length !== providedBuf.length ||
    !timingSafeEqual(tokenBuf, providedBuf)
  ) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  next();
}
