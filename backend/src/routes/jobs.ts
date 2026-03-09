import { Router, Request, Response } from "express";
import { readFileSync, existsSync } from "node:fs";
import { submitJob, getJobStatus, getJobLogs } from "../services/openclaw.js";

const router = Router();

const CARS_JSON_PATH =
  process.env.CARS_JSON_PATH || "/workspace/output/cars.json";

interface CarModel {
  name: string;
  years: number[];
  types: string[];
  subtypes: string[];
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
  year: number,
  type: string,
  subtype: string,
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

  if (modelEntry.years.length > 0 && !modelEntry.years.includes(year)) {
    return `Unknown year: ${year} for ${make} ${model}`;
  }

  if (
    modelEntry.types.length > 0 &&
    !modelEntry.types.some((t) => t.toLowerCase() === type.toLowerCase())
  ) {
    return `Unknown type: ${type} for ${make} ${model}`;
  }

  if (
    modelEntry.subtypes.length > 0 &&
    !modelEntry.subtypes.some((s) => s.toLowerCase() === subtype.toLowerCase())
  ) {
    return `Unknown subtype: ${subtype} for ${make} ${model}`;
  }

  return null;
}

router.post("/", async (req: Request, res: Response) => {
  const { make, model, year, type, subtype, color } = req.body as {
    make?: string;
    model?: string;
    year?: number;
    type?: string;
    subtype?: string;
    color?: string;
  };

  if (!make || !model || !year || !type || !subtype || !color) {
    res
      .status(400)
      .json({ error: "Missing required fields: make, model, year, type, subtype, color" });
    return;
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    res.status(400).json({ error: "Invalid color format. Must be a hex color like #ff0000" });
    return;
  }

  const carsData = loadCars();
  if (!carsData) {
    res.status(503).json({ error: "Car data not available" });
    return;
  }

  const validationError = validateCarInput(make, model, year, type, subtype, carsData);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const result = await submitJob({ make, model, year, type, subtype, color });
    res.status(201).json(result);
  } catch (err) {
    console.error("Job submission error:", err);
    res.status(502).json({ error: "Failed to submit job" });
  }
});

router.get("/:id/logs", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await getJobStatus(id); // Verify job exists
    const logs = getJobLogs(id);
    res.json(logs);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(404).json({ error: message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await getJobStatus(id);
    res.json(result);
  } catch {
    res.status(404).json({ error: "Job not found" });
  }
});

export default router;
