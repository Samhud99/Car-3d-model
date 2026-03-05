import { Router, Request, Response } from "express";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";

const router = Router();

const CARS_JSON_PATH =
  process.env.CARS_JSON_PATH || "/workspace/output/cars.json";

let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

router.get("/", (_req: Request, res: Response) => {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    res.json(cache.data);
    return;
  }

  if (!existsSync(CARS_JSON_PATH)) {
    res.status(503).json({ error: "Run the scraper first" });
    return;
  }

  try {
    const raw = readFileSync(CARS_JSON_PATH, "utf-8");
    const data: unknown = JSON.parse(raw);
    cache = { data, timestamp: Date.now() };
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to parse cars.json" });
  }
});

export default router;
