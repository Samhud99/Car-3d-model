import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authMiddleware } from "./middleware/auth.js";
import carsRouter from "./routes/cars.js";
import jobsRouter from "./routes/jobs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json({ limit: "100kb" }));

// Health check — no auth required
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// API routes — auth required
app.use("/api/cars", authMiddleware, carsRouter);
app.use("/api/jobs", authMiddleware, jobsRouter);

// Serve frontend static files
// In Docker: __dirname = /app/dist, frontend is volume-mounted at /app/frontend/dist
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendDist));

// SPA fallback — serve index.html for all unmatched routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend listening on 0.0.0.0:${PORT}`);
});
