import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scrapeRacv } from "./scrapers/racv.js";
import { scrapeCarsguide } from "./scrapers/carsguide.js";
import { scrapeRedbook } from "./scrapers/redbook.js";
import type { CarMake, CarModel } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_PATH = "/workspace/output/cars.json";

interface SeedFile {
  updated: string;
  source: string;
  cars: Array<{
    make: string;
    models: Array<{ name: string; types: string[] }>;
  }>;
}

function loadSeedData(): CarMake[] {
  const paths = [
    resolve(__dirname, "../seeds/cars-seed.json"),
    resolve(__dirname, "../../seeds/cars-seed.json"),
    "/app/seeds/cars-seed.json",
  ];

  for (const seedPath of paths) {
    try {
      if (existsSync(seedPath)) {
        const raw = readFileSync(seedPath, "utf-8");
        const seed: SeedFile = JSON.parse(raw);
        console.log(`[Seed] Loaded ${seed.cars.length} makes from ${seedPath}`);
        return seed.cars.map((c) => ({
          make: c.make,
          models: c.models.map((m) => ({ name: m.name, types: m.types })),
        }));
      }
    } catch (err) {
      console.warn(`[Seed] Failed to load ${seedPath}:`, err);
    }
  }

  console.error("[Seed] No seed file found at any expected path");
  return [];
}

interface MergedModel {
  originalName: string;
  types: Set<string>;
}

interface MergedMake {
  originalName: string;
  models: Map<string, MergedModel>;
}

function mergeMakes(primary: CarMake[], secondary: CarMake[]): CarMake[] {
  const makeMap = new Map<string, MergedMake>();

  for (const source of [primary, secondary]) {
    for (const make of source) {
      const key = make.make.toLowerCase();

      if (!makeMap.has(key)) {
        makeMap.set(key, {
          originalName: make.make,
          models: new Map(),
        });
      }
      const merged = makeMap.get(key)!;

      for (const model of make.models) {
        const modelKey = model.name.toLowerCase();

        if (!merged.models.has(modelKey)) {
          merged.models.set(modelKey, {
            originalName: model.name,
            types: new Set(),
          });
        }
        const mergedModel = merged.models.get(modelKey)!;
        for (const type of model.types) {
          mergedModel.types.add(type);
        }
      }
    }
  }

  const result: CarMake[] = [];
  for (const [, merged] of makeMap) {
    const models: CarModel[] = [];
    for (const [, mergedModel] of merged.models) {
      models.push({
        name: mergedModel.originalName,
        types: Array.from(mergedModel.types),
      });
    }
    result.push({ make: merged.originalName, models });
  }

  return result;
}

function sortOutput(makes: CarMake[]): CarMake[] {
  return makes
    .map((m) => ({
      make: m.make,
      models: m.models
        .map((model) => ({
          name: model.name,
          types: [...model.types].sort(),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.make.localeCompare(b.make));
}

async function main(): Promise<void> {
  console.log("=== Car Scraper Starting ===");
  let source = "";
  let makes: CarMake[] = [];

  // Strategy 1: Try RACV first (Puppeteer)
  console.log("\n--- Trying RACV (Puppeteer) ---");
  try {
    makes = await scrapeRacv();
    if (makes.length >= 10) {
      source = "racv";
      console.log(`[RACV] Success: ${makes.length} makes`);
    } else {
      console.log(
        `[RACV] Insufficient data: only ${makes.length} makes (need >= 10)`
      );
    }
  } catch (err) {
    console.error("[RACV] Failed:", err);
  }

  // Strategy 2: Try CarsGuide + Redbook
  if (makes.length < 10) {
    console.log("\n--- Trying CarsGuide + Redbook ---");
    try {
      const [carsguideData, redbookData] = await Promise.all([
        scrapeCarsguide().catch((err) => {
          console.error("[CarsGuide] Failed:", err);
          return [] as CarMake[];
        }),
        scrapeRedbook().catch((err) => {
          console.error("[Redbook] Failed:", err);
          return [] as CarMake[];
        }),
      ]);

      const combined = mergeMakes(carsguideData, redbookData);
      if (combined.length >= 10) {
        makes = mergeMakes(combined, makes);
        source = "carsguide+redbook";
        console.log(`[CarsGuide+Redbook] Success: ${makes.length} makes`);
      } else {
        console.log(
          `[CarsGuide+Redbook] Insufficient data: only ${combined.length} makes (need >= 10)`
        );
        // Keep whatever we have for merging with seed
        makes = mergeMakes(combined, makes);
      }
    } catch (err) {
      console.error("[CarsGuide+Redbook] Failed:", err);
    }
  }

  // Strategy 3: Fall back to seed data
  if (makes.length < 10) {
    console.log("\n--- Falling back to seed data ---");
    const seedData = loadSeedData();
    makes = mergeMakes(seedData, makes);
    source = makes.length > seedData.length ? "seed+scraped" : "seed";
    console.log(`[Seed] Using seed data: ${makes.length} makes`);
  }

  // Sort and write output
  const sorted = sortOutput(makes);
  const totalModels = sorted.reduce((sum, m) => sum + m.models.length, 0);

  const output = {
    updated: new Date().toISOString(),
    source,
    cars: sorted,
  };

  // Ensure output directory exists
  const outputDir = dirname(OUTPUT_PATH);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");

  console.log("\n=== Car Scraper Complete ===");
  console.log(`Source: ${source}`);
  console.log(`Makes: ${sorted.length}`);
  console.log(`Models: ${totalModels}`);
  console.log(`Output: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
