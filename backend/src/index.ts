import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "./middleware/auth.js";
import carsRouter from "./routes/cars.js";
import jobsRouter from "./routes/jobs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Security headers — model-viewer web component needs eval for WASM, blob for workers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "blob:", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      frameSrc: ["'self'", "blob:"],
    },
  },
}));

app.use(express.json({ limit: "100kb" }));

// Rate limiting on job submission — 10 requests per minute per IP
const jobSubmitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Health check — no auth required
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Cars data is public — no auth needed for dropdown population
app.use("/api/cars", carsRouter);
// Jobs require auth
app.use("/api/jobs", authMiddleware, jobSubmitLimiter, jobsRouter);

// Serve frontend static files
// In Docker: __dirname = /app/dist, frontend is volume-mounted at /app/frontend/dist
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendDist));

// Serve generated GLB model files
app.get("/api/models/:id.glb", authMiddleware, (req, res) => {
  const modelPath = path.join("/workspace", "output", `${req.params.id}.glb`);
  if (!existsSync(modelPath)) {
    res.status(404).json({ error: "Model not found" });
    return;
  }
  res.sendFile(modelPath);
});

// SPA fallback — serve index.html for all unmatched routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend listening on 0.0.0.0:${PORT}`);
});
