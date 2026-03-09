import { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";

const FRONTEND_TOKEN = process.env.FRONTEND_TOKEN || "";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!FRONTEND_TOKEN) {
    if (IS_PRODUCTION) {
      console.error("FATAL: FRONTEND_TOKEN is not set in production mode");
      res.status(500).json({ error: "Server misconfigured" });
      return;
    }
    // Dev mode only — allow all requests
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  // Constant-time comparison to prevent timing attacks
  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(FRONTEND_TOKEN);
  if (
    tokenBuf.length !== expectedBuf.length ||
    !timingSafeEqual(tokenBuf, expectedBuf)
  ) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  next();
}
