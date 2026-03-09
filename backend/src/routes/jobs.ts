import { Router, Request, Response } from "express";
import { readFileSync, existsSync } from "node:fs";
import { submitJob, getJobStatus } from "../services/openclaw.js";

const router = Router();

const CARS_JSON_PATH =
  process.env.CARS_JSON_PATH || "/workspace/output/cars.json";

interface CarModel {
  name: string;
  types: string[];
}

interface CarMake {
  make: string;
  models: CarModel[];
}

interface CarsData {
  updated: string;
  source: string;
  cars: CarMake[];
}

function loadCars(): CarsData | null {
  if (!existsSync(CARS_JSON_PATH)) return null;
  try {
    const raw = readFileSync(CARS_JSON_PATH, "utf-8");
    return JSON.parse(raw) as CarsData;
  } catch {
    return null;
  }
}

function validateCarInput(
  make: string,
  model: string,
  type: string,
  data: CarsData
): string | null {
  const makeEntry = data.cars.find(
    (m) => m.make.toLowerCase() === make.toLowerCase()
  );

  if (!makeEntry) {
    return `Unknown make: ${make}`;
  }

  const modelEntry = makeEntry.models.find(
    (m) => m.name.toLowerCase() === model.toLowerCase()
  );

  if (!modelEntry) {
    return `Unknown model: ${model} for make: ${make}`;
  }

  if (
    modelEntry.types.length > 0 &&
    !modelEntry.types.some((t) => t.toLowerCase() === type.toLowerCase())
  ) {
    return `Unknown type: ${type} for ${make} ${model}`;
  }

  return null;
}

router.post("/", async (req: Request, res: Response) => {
  const { make, model, type } = req.body as {
    make?: string;
    model?: string;
    type?: string;
  };

  if (!make || !model || !type) {
    res
      .status(400)
      .json({ error: "Missing required fields: make, model, type" });
    return;
  }

  const carsData = loadCars();
  if (!carsData) {
    res.status(503).json({ error: "Car data not available" });
    return;
  }

  const validationError = validateCarInput(make, model, type, carsData);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  // Pass user's credentials through to OpenClaw for the AI workload
  const provider = req.headers["x-provider"] as string;
  const apiKey = req.headers["x-api-key"] as string;

  try {
    const result = await submitJob({ make, model, type, credentials: { provider, apiKey } });
    res.status(201).json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    res
      .status(502)
      .json({ error: "OpenClaw error", details: message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await getJobStatus(id);
    res.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    res
      .status(502)
      .json({ error: "OpenClaw error", details: message });
  }
});

export default router;
