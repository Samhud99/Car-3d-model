# Frontend + Scraper + Backend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a React frontend + Express backend + car scraper for the existing Dockerised OpenClaw car model skill, so the team can submit car model jobs through a browser instead of dropping JSON files.

**Architecture:** Express backend serves React static files and proxies API calls to OpenClaw gateway. Car scraper (Puppeteer + cheerio) fetches car make/model/type data from RACV (primary), carsguide/redbook (fallback), writes to `workspace/output/cars.json`. Frontend has three cascading dropdowns populated from that data. Token-based auth via Docker secrets.

**Tech Stack:** React 18, Vite, TypeScript, Express, Puppeteer, cheerio, Docker

---

### Task 1: Scraper — Seed Data

**Files:**
- Create: `scraper/seeds/cars-seed.json`

**Step 1: Write the seed file**

```json
{
  "updated": "2026-03-06T00:00:00Z",
  "source": "seed",
  "cars": [
    {
      "make": "Toyota",
      "models": [
        { "name": "Camry", "types": ["Sedan", "Hybrid"] },
        { "name": "Corolla", "types": ["Sedan", "Hatchback", "Hybrid"] },
        { "name": "RAV4", "types": ["SUV", "Hybrid"] },
        { "name": "HiLux", "types": ["Ute", "4x4"] },
        { "name": "LandCruiser", "types": ["SUV", "4x4"] },
        { "name": "Kluger", "types": ["SUV"] },
        { "name": "Yaris", "types": ["Hatchback"] },
        { "name": "86", "types": ["Coupe"] },
        { "name": "Prado", "types": ["SUV", "4x4"] },
        { "name": "C-HR", "types": ["SUV", "Hybrid"] }
      ]
    },
    {
      "make": "Mazda",
      "models": [
        { "name": "3", "types": ["Sedan", "Hatchback"] },
        { "name": "CX-5", "types": ["SUV"] },
        { "name": "CX-3", "types": ["SUV"] },
        { "name": "CX-9", "types": ["SUV"] },
        { "name": "CX-30", "types": ["SUV"] },
        { "name": "BT-50", "types": ["Ute", "4x4"] },
        { "name": "MX-5", "types": ["Convertible"] },
        { "name": "CX-60", "types": ["SUV", "Hybrid"] }
      ]
    },
    {
      "make": "Hyundai",
      "models": [
        { "name": "i30", "types": ["Hatchback", "Sedan"] },
        { "name": "Tucson", "types": ["SUV"] },
        { "name": "Kona", "types": ["SUV", "Electric"] },
        { "name": "Santa Fe", "types": ["SUV"] },
        { "name": "iLoad", "types": ["Van"] },
        { "name": "Ioniq 5", "types": ["Electric", "SUV"] },
        { "name": "Ioniq 6", "types": ["Electric", "Sedan"] }
      ]
    },
    {
      "make": "Kia",
      "models": [
        { "name": "Cerato", "types": ["Sedan", "Hatchback"] },
        { "name": "Sportage", "types": ["SUV"] },
        { "name": "Seltos", "types": ["SUV"] },
        { "name": "Sorento", "types": ["SUV"] },
        { "name": "Carnival", "types": ["People Mover"] },
        { "name": "EV6", "types": ["Electric", "SUV"] },
        { "name": "Stinger", "types": ["Sedan"] }
      ]
    },
    {
      "make": "Ford",
      "models": [
        { "name": "Ranger", "types": ["Ute", "4x4"] },
        { "name": "Everest", "types": ["SUV", "4x4"] },
        { "name": "Mustang", "types": ["Coupe", "Convertible"] },
        { "name": "Puma", "types": ["SUV"] },
        { "name": "Escape", "types": ["SUV"] },
        { "name": "Mustang Mach-E", "types": ["Electric", "SUV"] }
      ]
    },
    {
      "make": "Mitsubishi",
      "models": [
        { "name": "Triton", "types": ["Ute", "4x4"] },
        { "name": "Outlander", "types": ["SUV", "Hybrid"] },
        { "name": "ASX", "types": ["SUV"] },
        { "name": "Pajero Sport", "types": ["SUV", "4x4"] },
        { "name": "Eclipse Cross", "types": ["SUV", "Hybrid"] }
      ]
    },
    {
      "make": "Volkswagen",
      "models": [
        { "name": "Golf", "types": ["Hatchback"] },
        { "name": "Tiguan", "types": ["SUV"] },
        { "name": "Amarok", "types": ["Ute", "4x4"] },
        { "name": "T-Roc", "types": ["SUV"] },
        { "name": "Polo", "types": ["Hatchback"] },
        { "name": "ID.4", "types": ["Electric", "SUV"] }
      ]
    },
    {
      "make": "Subaru",
      "models": [
        { "name": "Outback", "types": ["SUV", "Wagon"] },
        { "name": "Forester", "types": ["SUV"] },
        { "name": "XV", "types": ["SUV"] },
        { "name": "WRX", "types": ["Sedan"] },
        { "name": "Impreza", "types": ["Hatchback", "Sedan"] },
        { "name": "BRZ", "types": ["Coupe"] }
      ]
    },
    {
      "make": "Nissan",
      "models": [
        { "name": "X-Trail", "types": ["SUV"] },
        { "name": "Navara", "types": ["Ute", "4x4"] },
        { "name": "Qashqai", "types": ["SUV"] },
        { "name": "Patrol", "types": ["SUV", "4x4"] },
        { "name": "Juke", "types": ["SUV"] },
        { "name": "Leaf", "types": ["Electric", "Hatchback"] }
      ]
    },
    {
      "make": "Honda",
      "models": [
        { "name": "Civic", "types": ["Sedan", "Hatchback"] },
        { "name": "CR-V", "types": ["SUV", "Hybrid"] },
        { "name": "HR-V", "types": ["SUV"] },
        { "name": "Accord", "types": ["Sedan", "Hybrid"] },
        { "name": "Jazz", "types": ["Hatchback"] },
        { "name": "ZR-V", "types": ["SUV", "Hybrid"] }
      ]
    },
    {
      "make": "Mercedes-Benz",
      "models": [
        { "name": "C-Class", "types": ["Sedan", "Wagon"] },
        { "name": "A-Class", "types": ["Hatchback", "Sedan"] },
        { "name": "GLC", "types": ["SUV"] },
        { "name": "GLA", "types": ["SUV"] },
        { "name": "E-Class", "types": ["Sedan", "Wagon"] },
        { "name": "EQA", "types": ["Electric", "SUV"] }
      ]
    },
    {
      "make": "BMW",
      "models": [
        { "name": "3 Series", "types": ["Sedan", "Wagon"] },
        { "name": "X3", "types": ["SUV"] },
        { "name": "X1", "types": ["SUV"] },
        { "name": "1 Series", "types": ["Hatchback"] },
        { "name": "X5", "types": ["SUV"] },
        { "name": "iX3", "types": ["Electric", "SUV"] }
      ]
    },
    {
      "make": "Audi",
      "models": [
        { "name": "A3", "types": ["Sedan", "Hatchback"] },
        { "name": "Q5", "types": ["SUV"] },
        { "name": "Q3", "types": ["SUV"] },
        { "name": "A4", "types": ["Sedan", "Wagon"] },
        { "name": "Q7", "types": ["SUV"] },
        { "name": "e-tron", "types": ["Electric", "SUV"] }
      ]
    },
    {
      "make": "Jeep",
      "models": [
        { "name": "Wrangler", "types": ["SUV", "4x4"] },
        { "name": "Grand Cherokee", "types": ["SUV"] },
        { "name": "Compass", "types": ["SUV"] },
        { "name": "Gladiator", "types": ["Ute", "4x4"] }
      ]
    },
    {
      "make": "Land Rover",
      "models": [
        { "name": "Defender", "types": ["SUV", "4x4"] },
        { "name": "Discovery", "types": ["SUV"] },
        { "name": "Range Rover Sport", "types": ["SUV"] },
        { "name": "Range Rover Evoque", "types": ["SUV"] }
      ]
    },
    {
      "make": "Isuzu",
      "models": [
        { "name": "D-Max", "types": ["Ute", "4x4"] },
        { "name": "MU-X", "types": ["SUV", "4x4"] }
      ]
    },
    {
      "make": "Tesla",
      "models": [
        { "name": "Model 3", "types": ["Electric", "Sedan"] },
        { "name": "Model Y", "types": ["Electric", "SUV"] },
        { "name": "Model S", "types": ["Electric", "Sedan"] },
        { "name": "Model X", "types": ["Electric", "SUV"] }
      ]
    },
    {
      "make": "GWM",
      "models": [
        { "name": "Ute Cannon", "types": ["Ute"] },
        { "name": "Haval H6", "types": ["SUV"] },
        { "name": "Haval Jolion", "types": ["SUV"] },
        { "name": "Ora", "types": ["Electric", "Hatchback"] }
      ]
    },
    {
      "make": "MG",
      "models": [
        { "name": "ZS", "types": ["SUV", "Electric"] },
        { "name": "HS", "types": ["SUV"] },
        { "name": "MG4", "types": ["Electric", "Hatchback"] },
        { "name": "MG3", "types": ["Hatchback"] }
      ]
    },
    {
      "make": "BYD",
      "models": [
        { "name": "Atto 3", "types": ["Electric", "SUV"] },
        { "name": "Dolphin", "types": ["Electric", "Hatchback"] },
        { "name": "Seal", "types": ["Electric", "Sedan"] },
        { "name": "Shark 6", "types": ["Electric", "Ute"] }
      ]
    }
  ]
}
```

20 makes, ~110 models. Covers the top-selling brands in Australia plus emerging EV brands.

**Step 2: Verify valid JSON**

Run: `cd /Users/samhudson/Documents/Projects/Car-3d-model && node -e "JSON.parse(require('fs').readFileSync('scraper/seeds/cars-seed.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

**Step 3: Commit**

```bash
git add scraper/seeds/cars-seed.json
git commit -m "feat(scraper): add seed data with 20 AU car makes"
```

---

### Task 2: Scraper — Package and TypeScript Config

**Files:**
- Create: `scraper/package.json`
- Create: `scraper/tsconfig.json`

**Step 1: Write package.json**

```json
{
  "name": "car-scraper",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "cheerio": "^1.0.0",
    "puppeteer": "^23.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0"
  }
}
```

**Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": false
  },
  "include": ["src"]
}
```

**Step 3: Install dependencies**

Run: `cd scraper && npm install`
Expected: `package-lock.json` generated, `node_modules/` created

**Step 4: Commit**

```bash
git add scraper/package.json scraper/package-lock.json scraper/tsconfig.json
git commit -m "feat(scraper): add package.json and tsconfig"
```

---

### Task 3: Scraper — RACV Scraper (Puppeteer)

**Files:**
- Create: `scraper/src/scrapers/racv.ts`

**Step 1: Write the RACV scraper**

This scraper uses Puppeteer to:
1. Launch headless Chromium
2. Navigate to RACV car-match page
3. Intercept network requests to find the data API
4. If an API is found, parse the response for car data
5. If not, fall back to DOM extraction from rendered page
6. Normalise results to Make/Model/Type schema

```typescript
import puppeteer, { type Page, type HTTPResponse } from "puppeteer";

interface CarModel {
  name: string;
  types: string[];
}

interface CarMake {
  make: string;
  models: CarModel[];
}

const RACV_URL = "https://www.racv.com.au/car-match.html";
const TIMEOUT = 30_000;

export async function scrapeRacv(): Promise<CarMake[]> {
  console.log("[racv] Launching browser...");

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();

    // Strategy 1: Intercept API calls
    const apiData = await tryInterceptApi(page);
    if (apiData && apiData.length >= 10) {
      console.log(`[racv] API intercept found ${apiData.length} makes`);
      return apiData;
    }

    // Strategy 2: DOM extraction
    console.log("[racv] API intercept failed, trying DOM extraction...");
    const domData = await tryDomExtraction(page);
    if (domData && domData.length >= 10) {
      console.log(`[racv] DOM extraction found ${domData.length} makes`);
      return domData;
    }

    console.log("[racv] Could not extract sufficient data");
    return [];
  } finally {
    await browser.close();
  }
}

async function tryInterceptApi(page: Page): Promise<CarMake[]> {
  const intercepted: CarMake[] = [];

  page.on("response", async (response: HTTPResponse) => {
    const url = response.url();
    const contentType = response.headers()["content-type"] || "";

    if (!contentType.includes("application/json")) return;

    try {
      const body = await response.json();
      const parsed = parseApiResponse(body);
      if (parsed.length > 0) {
        intercepted.push(...parsed);
      }
    } catch {
      // Not JSON or failed to parse — skip
    }
  });

  try {
    await page.goto(RACV_URL, { waitUntil: "networkidle2", timeout: TIMEOUT });
    // Give extra time for lazy-loaded API calls
    await new Promise((r) => setTimeout(r, 5000));
  } catch (err) {
    console.log(`[racv] Navigation error: ${err}`);
  }

  return deduplicateMakes(intercepted);
}

function parseApiResponse(body: unknown): CarMake[] {
  // Attempt to find car data in various JSON structures
  const makes: CarMake[] = [];

  if (!body || typeof body !== "object") return makes;

  const items = findArrayInObject(body as Record<string, unknown>);
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;

    const make = extractString(record, ["make", "brand", "manufacturer"]);
    const model = extractString(record, ["model", "name", "modelName"]);
    const type = extractString(record, [
      "type",
      "bodyType",
      "body_type",
      "category",
      "variant",
    ]);

    if (make && model) {
      let existing = makes.find(
        (m) => m.make.toLowerCase() === make.toLowerCase()
      );
      if (!existing) {
        existing = { make, models: [] };
        makes.push(existing);
      }
      let existingModel = existing.models.find(
        (m) => m.name.toLowerCase() === model.toLowerCase()
      );
      if (!existingModel) {
        existingModel = { name: model, types: [] };
        existing.models.push(existingModel);
      }
      if (type && !existingModel.types.includes(type)) {
        existingModel.types.push(type);
      }
    }
  }

  return makes;
}

function findArrayInObject(obj: Record<string, unknown>): unknown[] {
  // Recursively search for the largest array in the object
  let largest: unknown[] = [];

  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && value.length > largest.length) {
      largest = value;
    } else if (typeof value === "object" && value !== null) {
      const inner = findArrayInObject(value as Record<string, unknown>);
      if (inner.length > largest.length) {
        largest = inner;
      }
    }
  }

  return largest;
}

function extractString(
  obj: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
  }
  return null;
}

async function tryDomExtraction(page: Page): Promise<CarMake[]> {
  try {
    await page.goto(RACV_URL, { waitUntil: "networkidle2", timeout: TIMEOUT });
    await new Promise((r) => setTimeout(r, 5000));

    const data = await page.evaluate(() => {
      const makes: Array<{
        make: string;
        models: Array<{ name: string; types: string[] }>;
      }> = [];

      // Look for car cards/listings in the rendered DOM
      const cards = document.querySelectorAll(
        '[class*="car"], [class*="vehicle"], [data-make], [data-model]'
      );

      cards.forEach((card) => {
        const makeEl =
          card.querySelector('[class*="make"], [class*="brand"]') ||
          card.getAttribute("data-make");
        const modelEl =
          card.querySelector('[class*="model"]') ||
          card.getAttribute("data-model");
        const typeEl =
          card.querySelector('[class*="type"], [class*="body"]') ||
          card.getAttribute("data-type");

        const make =
          typeof makeEl === "string"
            ? makeEl
            : makeEl?.textContent?.trim() || "";
        const model =
          typeof modelEl === "string"
            ? modelEl
            : modelEl?.textContent?.trim() || "";
        const type =
          typeof typeEl === "string"
            ? typeEl
            : typeEl?.textContent?.trim() || "";

        if (make && model) {
          let existing = makes.find(
            (m) => m.make.toLowerCase() === make.toLowerCase()
          );
          if (!existing) {
            existing = { make, models: [] };
            makes.push(existing);
          }
          let existingModel = existing.models.find(
            (m) => m.name.toLowerCase() === model.toLowerCase()
          );
          if (!existingModel) {
            existingModel = { name: model, types: [] };
            existing.models.push(existingModel);
          }
          if (type && !existingModel.types.includes(type)) {
            existingModel.types.push(type);
          }
        }
      });

      return makes;
    });

    return data;
  } catch (err) {
    console.log(`[racv] DOM extraction error: ${err}`);
    return [];
  }
}

function deduplicateMakes(makes: CarMake[]): CarMake[] {
  const map = new Map<string, CarMake>();

  for (const make of makes) {
    const key = make.make.toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...make });
      continue;
    }
    for (const model of make.models) {
      const existingModel = existing.models.find(
        (m) => m.name.toLowerCase() === model.name.toLowerCase()
      );
      if (!existingModel) {
        existing.models.push(model);
      } else {
        for (const type of model.types) {
          if (!existingModel.types.includes(type)) {
            existingModel.types.push(type);
          }
        }
      }
    }
  }

  return Array.from(map.values());
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd scraper && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add scraper/src/scrapers/racv.ts
git commit -m "feat(scraper): add RACV Puppeteer scraper with API intercept + DOM fallback"
```

---

### Task 4: Scraper — CarsGuide and Redbook Scrapers (cheerio)

**Files:**
- Create: `scraper/src/scrapers/carsguide.ts`
- Create: `scraper/src/scrapers/redbook.ts`

**Step 1: Write CarsGuide scraper**

```typescript
import * as cheerio from "cheerio";

interface CarModel {
  name: string;
  types: string[];
}

interface CarMake {
  make: string;
  models: CarModel[];
}

const BASE_URL = "https://www.carsguide.com.au";

export async function scrapeCarsguide(): Promise<CarMake[]> {
  console.log("[carsguide] Fetching makes...");

  try {
    const makesPage = await fetchPage(`${BASE_URL}/car-reviews/`);
    const $ = cheerio.load(makesPage);
    const makes: CarMake[] = [];

    // CarsGuide lists makes as links on the reviews page
    const makeLinks: Array<{ name: string; href: string }> = [];
    $('a[href*="/car-reviews/"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      const name = $(el).text().trim();
      if (name && href && href !== "/car-reviews/" && !makeLinks.find((m) => m.name === name)) {
        makeLinks.push({ name, href });
      }
    });

    // Fetch first 30 makes to avoid hammering the site
    const limitedMakes = makeLinks.slice(0, 30);

    for (const makeLink of limitedMakes) {
      try {
        const url = makeLink.href.startsWith("http")
          ? makeLink.href
          : `${BASE_URL}${makeLink.href}`;
        const modelPage = await fetchPage(url);
        const $model = cheerio.load(modelPage);
        const models: CarModel[] = [];

        $model('a[href*="/car-reviews/"]').each((_, el) => {
          const text = $model(el).text().trim();
          if (text && text !== makeLink.name && !models.find((m) => m.name === text)) {
            models.push({ name: text, types: [] });
          }
        });

        if (models.length > 0) {
          makes.push({ make: makeLink.name, models });
        }

        // Rate limit: 500ms between requests
        await new Promise((r) => setTimeout(r, 500));
      } catch {
        console.log(`[carsguide] Failed to fetch models for ${makeLink.name}`);
      }
    }

    console.log(`[carsguide] Found ${makes.length} makes`);
    return makes;
  } catch (err) {
    console.log(`[carsguide] Failed: ${err}`);
    return [];
  }
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CarModelSkill/1.0; scraper for internal use)",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}
```

**Step 2: Write Redbook scraper**

```typescript
import * as cheerio from "cheerio";

interface CarModel {
  name: string;
  types: string[];
}

interface CarMake {
  make: string;
  models: CarModel[];
}

const BASE_URL = "https://www.redbook.com.au";

export async function scrapeRedbook(): Promise<CarMake[]> {
  console.log("[redbook] Fetching makes...");

  try {
    const makesPage = await fetchPage(`${BASE_URL}/cars/research/`);
    const $ = cheerio.load(makesPage);
    const makes: CarMake[] = [];

    const makeLinks: Array<{ name: string; href: string }> = [];
    $('a[href*="/cars/research/"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      const name = $(el).text().trim();
      if (name && href && href !== "/cars/research/" && !makeLinks.find((m) => m.name === name)) {
        makeLinks.push({ name, href });
      }
    });

    const limitedMakes = makeLinks.slice(0, 30);

    for (const makeLink of limitedMakes) {
      try {
        const url = makeLink.href.startsWith("http")
          ? makeLink.href
          : `${BASE_URL}${makeLink.href}`;
        const modelPage = await fetchPage(url);
        const $model = cheerio.load(modelPage);
        const models: CarModel[] = [];

        $model('a[href*="/cars/research/"]').each((_, el) => {
          const text = $model(el).text().trim();
          if (text && text !== makeLink.name && !models.find((m) => m.name === text)) {
            models.push({ name: text, types: [] });
          }
        });

        if (models.length > 0) {
          makes.push({ make: makeLink.name, models });
        }

        await new Promise((r) => setTimeout(r, 500));
      } catch {
        console.log(`[redbook] Failed to fetch models for ${makeLink.name}`);
      }
    }

    console.log(`[redbook] Found ${makes.length} makes`);
    return makes;
  } catch (err) {
    console.log(`[redbook] Failed: ${err}`);
    return [];
  }
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CarModelSkill/1.0; scraper for internal use)",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd scraper && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add scraper/src/scrapers/carsguide.ts scraper/src/scrapers/redbook.ts
git commit -m "feat(scraper): add carsguide and redbook cheerio scrapers"
```

---

### Task 5: Scraper — Entry Point

**Files:**
- Create: `scraper/src/index.ts`

**Step 1: Write the scraper entry point**

```typescript
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scrapeRacv } from "./scrapers/racv.js";
import { scrapeCarsguide } from "./scrapers/carsguide.js";
import { scrapeRedbook } from "./scrapers/redbook.js";

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

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(__dirname, "..", "seeds", "cars-seed.json");
const OUTPUT_DIR = "/workspace/output";
const OUTPUT_PATH = join(OUTPUT_DIR, "cars.json");
const MIN_MAKES = 10;

async function main(): Promise<void> {
  console.log("=== Car Scraper ===\n");

  let cars: CarMake[] = [];
  let source = "seed";

  // Strategy 1: RACV (primary)
  try {
    console.log("--- Trying RACV (primary) ---");
    cars = await scrapeRacv();
    if (cars.length >= MIN_MAKES) {
      source = "racv";
      console.log(`\nRACV returned ${cars.length} makes — using as primary source.\n`);
    } else {
      console.log(`\nRACV returned only ${cars.length} makes — falling back.\n`);
      cars = [];
    }
  } catch (err) {
    console.log(`\nRACV failed: ${err}\n`);
  }

  // Strategy 2: CarsGuide + Redbook (fallback)
  if (cars.length < MIN_MAKES) {
    try {
      console.log("--- Trying CarsGuide (fallback) ---");
      const carsguideData = await scrapeCarsguide();

      console.log("--- Trying Redbook (fallback) ---");
      const redbookData = await scrapeRedbook();

      cars = mergeMakes([...carsguideData, ...redbookData]);
      if (cars.length >= MIN_MAKES) {
        source = "carsguide+redbook";
        console.log(`\nFallback scrapers returned ${cars.length} makes.\n`);
      } else {
        console.log(`\nFallback scrapers returned only ${cars.length} makes.\n`);
        cars = [];
      }
    } catch (err) {
      console.log(`\nFallback scrapers failed: ${err}\n`);
    }
  }

  // Strategy 3: Seed file (last resort)
  if (cars.length < MIN_MAKES) {
    console.log("--- Using seed data (last resort) ---");
    try {
      // In Docker the seed file is at /app/seeds/cars-seed.json
      // Locally it's relative to __dirname
      const seedPath = existsSync(SEED_PATH)
        ? SEED_PATH
        : join("/app", "seeds", "cars-seed.json");
      const seedData: CarsData = JSON.parse(readFileSync(seedPath, "utf-8"));
      cars = seedData.cars;
      source = "seed";
      console.log(`Seed file loaded with ${cars.length} makes.\n`);
    } catch (err) {
      console.error(`FATAL: Could not load seed data: ${err}`);
      process.exit(1);
    }
  }

  // Sort makes alphabetically, models alphabetically within each make
  cars.sort((a, b) => a.make.localeCompare(b.make));
  for (const make of cars) {
    make.models.sort((a, b) => a.name.localeCompare(b.name));
  }

  const output: CarsData = {
    updated: new Date().toISOString(),
    source,
    cars,
  };

  // Write output
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  const totalModels = cars.reduce((sum, m) => sum + m.models.length, 0);
  console.log(`=== Done ===`);
  console.log(`Source: ${source}`);
  console.log(`Makes: ${cars.length}`);
  console.log(`Models: ${totalModels}`);
  console.log(`Written to: ${OUTPUT_PATH}`);
}

function mergeMakes(makes: CarMake[]): CarMake[] {
  const map = new Map<string, CarMake>();

  for (const make of makes) {
    const key = make.make.toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { make: make.make, models: [...make.models] });
      continue;
    }
    for (const model of make.models) {
      const existingModel = existing.models.find(
        (m) => m.name.toLowerCase() === model.name.toLowerCase()
      );
      if (!existingModel) {
        existing.models.push(model);
      } else {
        for (const type of model.types) {
          if (!existingModel.types.includes(type)) {
            existingModel.types.push(type);
          }
        }
      }
    }
  }

  return Array.from(map.values());
}

main().catch((err) => {
  console.error(`Fatal error: ${err}`);
  process.exit(1);
});
```

**Step 2: Verify TypeScript compiles**

Run: `cd scraper && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add scraper/src/index.ts
git commit -m "feat(scraper): add entry point with waterfall strategy"
```

---

### Task 6: Scraper — Dockerfile

**Files:**
- Create: `scraper/Dockerfile`

**Step 1: Write the Dockerfile**

```dockerfile
FROM node:20-slim

# Install Chromium dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production=false

COPY tsconfig.json ./
COPY src/ ./src/
COPY seeds/ ./seeds/

RUN npm run build

USER 1000:1000

CMD ["node", "dist/index.js"]
```

**Step 2: Verify Dockerfile syntax**

Run: `docker build --check -f scraper/Dockerfile scraper/ 2>&1 || echo "Docker build check not supported — visual inspection OK"`

**Step 3: Commit**

```bash
git add scraper/Dockerfile
git commit -m "feat(scraper): add Dockerfile with Chromium for Puppeteer"
```

---

### Task 7: Backend — Package and TypeScript Config

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`

**Step 1: Write package.json**

```json
{
  "name": "car-model-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "node --watch dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0"
  }
}
```

**Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": false
  },
  "include": ["src"]
}
```

**Step 3: Install dependencies**

Run: `cd backend && npm install`
Expected: `package-lock.json` generated

**Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/tsconfig.json
git commit -m "feat(backend): add package.json and tsconfig"
```

---

### Task 8: Backend — Auth Middleware

**Files:**
- Create: `backend/src/middleware/auth.ts`

**Step 1: Write the auth middleware**

```typescript
import { readFileSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

let cachedToken: string | null = null;

function getToken(): string {
  if (cachedToken) return cachedToken;

  // Try Docker secret first, then env var
  try {
    cachedToken = readFileSync("/run/secrets/frontend_token", "utf-8").trim();
  } catch {
    cachedToken = process.env.FRONTEND_TOKEN?.trim() || "";
  }

  if (!cachedToken) {
    console.error("WARNING: No frontend token configured");
  }

  return cachedToken;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const provided = authHeader.slice(7);
  const expected = getToken();

  if (!expected) {
    res.status(500).json({ error: "Server token not configured" });
    return;
  }

  // Timing-safe comparison to prevent timing attacks
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);

  if (
    providedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(providedBuf, expectedBuf)
  ) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  next();
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add backend/src/middleware/auth.ts
git commit -m "feat(backend): add bearer token auth middleware with timing-safe comparison"
```

---

### Task 9: Backend — OpenClaw Client

**Files:**
- Create: `backend/src/services/openclaw.ts`

**Step 1: Write the OpenClaw client**

```typescript
const OPENCLAW_BASE = process.env.OPENCLAW_URL || "http://openclaw-gateway:18789";

interface JobRequest {
  make: string;
  model: string;
  type: string;
}

interface JobResponse {
  id: string;
  status: string;
  [key: string]: unknown;
}

export async function submitJob(job: JobRequest): Promise<JobResponse> {
  const response = await fetch(`${OPENCLAW_BASE}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      skill: "car-model",
      input: {
        make: job.make,
        model: job.model,
        type: job.type,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenClaw error ${response.status}: ${text}`);
  }

  return response.json() as Promise<JobResponse>;
}

export async function getJobStatus(jobId: string): Promise<JobResponse> {
  const response = await fetch(`${OPENCLAW_BASE}/api/jobs/${encodeURIComponent(jobId)}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenClaw error ${response.status}: ${text}`);
  }

  return response.json() as Promise<JobResponse>;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${OPENCLAW_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add backend/src/services/openclaw.ts
git commit -m "feat(backend): add OpenClaw HTTP client"
```

---

### Task 10: Backend — Cars Route

**Files:**
- Create: `backend/src/routes/cars.ts`

**Step 1: Write the cars route**

```typescript
import { Router } from "express";
import { readFileSync, existsSync } from "node:fs";

const router = Router();

const CARS_PATH = process.env.CARS_JSON_PATH || "/workspace/output/cars.json";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let cachedData: unknown = null;
let cacheTime = 0;

router.get("/", (_req, res) => {
  const now = Date.now();

  if (cachedData && now - cacheTime < CACHE_TTL) {
    res.json(cachedData);
    return;
  }

  if (!existsSync(CARS_PATH)) {
    res.status(503).json({ error: "Car data not available. Run the scraper first." });
    return;
  }

  try {
    const raw = readFileSync(CARS_PATH, "utf-8");
    cachedData = JSON.parse(raw);
    cacheTime = now;
    res.json(cachedData);
  } catch (err) {
    console.error(`Failed to read cars.json: ${err}`);
    res.status(500).json({ error: "Failed to read car data" });
  }
});

export default router;
```

**Step 2: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add backend/src/routes/cars.ts
git commit -m "feat(backend): add GET /api/cars route with 5-min cache"
```

---

### Task 11: Backend — Jobs Route

**Files:**
- Create: `backend/src/routes/jobs.ts`

**Step 1: Write the jobs route**

```typescript
import { Router } from "express";
import { readFileSync, existsSync } from "node:fs";
import { submitJob, getJobStatus } from "../services/openclaw.js";

const router = Router();

const CARS_PATH = process.env.CARS_JSON_PATH || "/workspace/output/cars.json";

interface CarModel {
  name: string;
  types: string[];
}

interface CarMake {
  make: string;
  models: CarModel[];
}

interface CarsData {
  cars: CarMake[];
}

function validateCarInput(
  make: string,
  model: string,
  type: string
): string | null {
  if (!existsSync(CARS_PATH)) {
    return "Car data not available";
  }

  const data: CarsData = JSON.parse(readFileSync(CARS_PATH, "utf-8"));
  const makeEntry = data.cars.find(
    (m) => m.make.toLowerCase() === make.toLowerCase()
  );

  if (!makeEntry) return `Unknown make: ${make}`;

  const modelEntry = makeEntry.models.find(
    (m) => m.name.toLowerCase() === model.toLowerCase()
  );

  if (!modelEntry) return `Unknown model: ${model} for make: ${make}`;

  if (
    modelEntry.types.length > 0 &&
    !modelEntry.types.some((t) => t.toLowerCase() === type.toLowerCase())
  ) {
    return `Unknown type: ${type} for ${make} ${model}`;
  }

  return null;
}

router.post("/", async (req, res) => {
  const { make, model, type } = req.body;

  if (!make || !model || !type) {
    res.status(400).json({ error: "make, model, and type are required" });
    return;
  }

  const validationError = validateCarInput(make, model, type);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const result = await submitJob({ make, model, type });
    res.status(201).json(result);
  } catch (err) {
    console.error(`Failed to submit job: ${err}`);
    res.status(502).json({ error: "Failed to submit job to OpenClaw" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await getJobStatus(req.params.id);
    res.json(result);
  } catch (err) {
    console.error(`Failed to get job status: ${err}`);
    res.status(502).json({ error: "Failed to get job status from OpenClaw" });
  }
});

export default router;
```

**Step 2: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add backend/src/routes/jobs.ts
git commit -m "feat(backend): add POST/GET /api/jobs routes with server-side validation"
```

---

### Task 12: Backend — Express Server Entry Point

**Files:**
- Create: `backend/src/index.ts`

**Step 1: Write the Express server**

```typescript
import express from "express";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { authMiddleware } from "./middleware/auth.js";
import carsRouter from "./routes/cars.js";
import jobsRouter from "./routes/jobs.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3000", 10);

const app = express();

app.use(express.json());

// Health check — no auth
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// API routes — auth required
app.use("/api/cars", authMiddleware, carsRouter);
app.use("/api/jobs", authMiddleware, jobsRouter);

// Serve React static files
const staticDir = join(__dirname, "..", "..", "frontend", "dist");
app.use(express.static(staticDir));

// SPA fallback — serve index.html for all non-API routes
app.get("*", (_req, res) => {
  res.sendFile(join(staticDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend listening on 0.0.0.0:${PORT}`);
  console.log(`Serving static files from ${staticDir}`);
});
```

**Step 2: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat(backend): add Express server entry point"
```

---

### Task 13: Backend — Dockerfile

**Files:**
- Create: `backend/Dockerfile`

**Step 1: Write the Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production=false

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build && npm prune --production

USER 1000:1000

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Note: The `frontend/dist` directory is volume-mounted or copied during `docker compose build` via the compose file, not baked into the backend image. The Express server references `../frontend/dist` relative to its working directory.

**Step 2: Commit**

```bash
git add backend/Dockerfile
git commit -m "feat(backend): add Dockerfile"
```

---

### Task 14: Frontend — Package, Vite, and TypeScript Config

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`

**Step 1: Write package.json**

```json
{
  "name": "car-model-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
```

**Step 2: Write vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
```

**Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

**Step 4: Write index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Car Model Skill</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 5: Install dependencies**

Run: `cd frontend && npm install`
Expected: `package-lock.json` generated

**Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/tsconfig.json frontend/index.html
git commit -m "feat(frontend): add Vite + React + TypeScript scaffold"
```

---

### Task 15: Frontend — Types

**Files:**
- Create: `frontend/src/types.ts`

**Step 1: Write shared types**

```typescript
export interface CarModel {
  name: string;
  types: string[];
}

export interface CarMake {
  make: string;
  models: CarModel[];
}

export interface CarsData {
  updated: string;
  source: string;
  cars: CarMake[];
}

export interface Job {
  id: string;
  make: string;
  model: string;
  type: string;
  status: string;
  createdAt: string;
}
```

**Step 2: Commit**

```bash
git add frontend/src/types.ts
git commit -m "feat(frontend): add shared TypeScript types"
```

---

### Task 16: Frontend — API Client

**Files:**
- Create: `frontend/src/api/client.ts`

**Step 1: Write the API client**

```typescript
const TOKEN_KEY = "car-model-token";

let onAuthFailure: (() => void) | null = null;

export function setAuthFailureHandler(handler: () => void): void {
  onAuthFailure = handler;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, { ...options, headers });

  if (response.status === 401) {
    clearToken();
    onAuthFailure?.();
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as Record<string, string>).error ||
        `Request failed: ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

export const api = {
  getCars: () => request<import("../types.js").CarsData>("/api/cars"),

  submitJob: (make: string, model: string, type: string) =>
    request<import("../types.js").Job>("/api/jobs", {
      method: "POST",
      body: JSON.stringify({ make, model, type }),
    }),

  getJobStatus: (id: string) =>
    request<import("../types.js").Job>(`/api/jobs/${encodeURIComponent(id)}`),
};
```

**Step 2: Commit**

```bash
git add frontend/src/api/client.ts
git commit -m "feat(frontend): add API client with auth and 401 handling"
```

---

### Task 17: Frontend — Hooks

**Files:**
- Create: `frontend/src/hooks/useCars.ts`
- Create: `frontend/src/hooks/useJobs.ts`

**Step 1: Write useCars hook**

```typescript
import { useState, useEffect } from "react";
import { api } from "../api/client.js";
import type { CarsData } from "../types.js";

export function useCars() {
  const [data, setData] = useState<CarsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .getCars()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
```

**Step 2: Write useJobs hook**

```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api/client.js";
import type { Job } from "../types.js";

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map()
  );

  const pollJob = useCallback((jobId: string) => {
    if (intervalsRef.current.has(jobId)) return;

    const interval = setInterval(async () => {
      try {
        const updated = await api.getJobStatus(jobId);
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, ...updated } : j))
        );

        if (
          updated.status === "completed" ||
          updated.status === "failed" ||
          updated.status === "error"
        ) {
          clearInterval(interval);
          intervalsRef.current.delete(jobId);
        }
      } catch {
        // Polling failure is non-fatal — will retry next interval
      }
    }, 5000);

    intervalsRef.current.set(jobId, interval);
  }, []);

  const submitJob = useCallback(
    async (make: string, model: string, type: string) => {
      setSubmitting(true);
      setError(null);

      try {
        const job = await api.submitJob(make, model, type);
        const newJob: Job = {
          ...job,
          make,
          model,
          type,
          createdAt: new Date().toISOString(),
        };
        setJobs((prev) => [newJob, ...prev]);
        pollJob(job.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit job");
      } finally {
        setSubmitting(false);
      }
    },
    [pollJob]
  );

  // Cleanup intervals on unmount
  useEffect(() => {
    const intervals = intervalsRef.current;
    return () => {
      for (const interval of intervals.values()) {
        clearInterval(interval);
      }
      intervals.clear();
    };
  }, []);

  return { jobs, submitting, error, submitJob };
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend/src/hooks/useCars.ts frontend/src/hooks/useJobs.ts
git commit -m "feat(frontend): add useCars and useJobs hooks"
```

---

### Task 18: Frontend — Components

**Files:**
- Create: `frontend/src/components/TokenPrompt.tsx`
- Create: `frontend/src/components/CarForm.tsx`
- Create: `frontend/src/components/JobList.tsx`

**Step 1: Write TokenPrompt**

```tsx
import { useState } from "react";
import { setToken } from "../api/client.js";

interface Props {
  onAuthenticated: () => void;
}

export function TokenPrompt({ onAuthenticated }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Token cannot be empty");
      return;
    }
    setToken(trimmed);
    setError(null);
    onAuthenticated();
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 20 }}>
      <h2>Enter Access Token</h2>
      <p style={{ color: "#666" }}>
        Paste the token from your docker-setup.sh output.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste token here"
          style={{
            width: "100%",
            padding: 8,
            marginBottom: 8,
            boxSizing: "border-box",
            fontFamily: "monospace",
          }}
          autoFocus
        />
        {error && <p style={{ color: "red", margin: "4px 0" }}>{error}</p>}
        <button
          type="submit"
          style={{ width: "100%", padding: 8, cursor: "pointer" }}
        >
          Connect
        </button>
      </form>
    </div>
  );
}
```

**Step 2: Write CarForm**

```tsx
import { useState, useMemo } from "react";
import { useCars } from "../hooks/useCars.js";

interface Props {
  onSubmit: (make: string, model: string, type: string) => void;
  submitting: boolean;
}

export function CarForm({ onSubmit, submitting }: Props) {
  const { data, loading, error } = useCars();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [type, setType] = useState("");

  const makes = useMemo(() => data?.cars ?? [], [data]);

  const models = useMemo(() => {
    const entry = makes.find((m) => m.make === make);
    return entry?.models ?? [];
  }, [makes, make]);

  const types = useMemo(() => {
    const entry = models.find((m) => m.name === model);
    return entry?.types ?? [];
  }, [models, model]);

  const handleMakeChange = (value: string) => {
    setMake(value);
    setModel("");
    setType("");
  };

  const handleModelChange = (value: string) => {
    setModel(value);
    setType("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (make && model && type) {
      onSubmit(make, model, type);
    }
  };

  if (loading) return <p>Loading car data...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <h2>Submit Car Model Job</h2>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="make">Make</label>
        <br />
        <select
          id="make"
          value={make}
          onChange={(e) => handleMakeChange(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        >
          <option value="">-- Select Make --</option>
          {makes.map((m) => (
            <option key={m.make} value={m.make}>
              {m.make}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="model">Model</label>
        <br />
        <select
          id="model"
          value={model}
          onChange={(e) => handleModelChange(e.target.value)}
          disabled={!make}
          style={{ width: "100%", padding: 8 }}
        >
          <option value="">-- Select Model --</option>
          {models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="type">Type</label>
        <br />
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={!model}
          style={{ width: "100%", padding: 8 }}
        >
          <option value="">-- Select Type --</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={!make || !model || !type || submitting}
        style={{ width: "100%", padding: 8, cursor: "pointer" }}
      >
        {submitting ? "Submitting..." : "Submit Job"}
      </button>
    </form>
  );
}
```

**Step 3: Write JobList**

```tsx
import type { Job } from "../types.js";

interface Props {
  jobs: Job[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  processing: "#3b82f6",
  completed: "#10b981",
  failed: "#ef4444",
  error: "#ef4444",
};

export function JobList({ jobs }: Props) {
  if (jobs.length === 0) return null;

  return (
    <div>
      <h2>Jobs</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Car</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>ID</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td style={tdStyle}>
                {job.make} {job.model} ({job.type})
              </td>
              <td style={tdStyle}>
                <span
                  style={{
                    color: STATUS_COLORS[job.status] || "#666",
                    fontWeight: "bold",
                  }}
                >
                  {job.status}
                </span>
              </td>
              <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>
                {job.id}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: "2px solid #ddd",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #eee",
};
```

**Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add frontend/src/components/TokenPrompt.tsx frontend/src/components/CarForm.tsx frontend/src/components/JobList.tsx
git commit -m "feat(frontend): add TokenPrompt, CarForm, and JobList components"
```

---

### Task 19: Frontend — App and Main Entry

**Files:**
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/main.tsx`

**Step 1: Write App.tsx**

```tsx
import { useState, useCallback } from "react";
import { getToken, setAuthFailureHandler } from "./api/client.js";
import { TokenPrompt } from "./components/TokenPrompt.js";
import { CarForm } from "./components/CarForm.js";
import { JobList } from "./components/JobList.js";
import { useJobs } from "./hooks/useJobs.js";

export function App() {
  const [authenticated, setAuthenticated] = useState(!!getToken());
  const { jobs, submitting, error, submitJob } = useJobs();

  const handleAuthFailure = useCallback(() => {
    setAuthenticated(false);
  }, []);

  // Register auth failure handler
  setAuthFailureHandler(handleAuthFailure);

  if (!authenticated) {
    return <TokenPrompt onAuthenticated={() => setAuthenticated(true)} />;
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
      <h1>Car Model Skill</h1>
      <CarForm onSubmit={submitJob} submitting={submitting} />
      {error && (
        <p style={{ color: "red", marginBottom: 16 }}>Error: {error}</p>
      )}
      <JobList jobs={jobs} />
    </div>
  );
}
```

**Step 2: Write main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 4: Build the frontend**

Run: `cd frontend && npm run build`
Expected: `dist/` directory created with built assets

**Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat(frontend): add App and main entry point"
```

---

### Task 20: Docker Integration — Update Existing Files

**Files:**
- Modify: `docker-compose.yml` (add services, network, secret)
- Modify: `squid.conf` (add www.racv.com.au)
- Modify: `docker-setup.sh` (add token gen, scraper run)
- Modify: `.env.example` (add FRONTEND_PORT)

**Step 1: Update squid.conf**

Add `www.racv.com.au` to the `allowed_car_research` ACL (line ~49) and `allowed_destinations` ACL (line ~60).

In `allowed_car_research`:
```
acl allowed_car_research dstdomain \
    www.carsguide.com.au \
    www.drive.com.au \
    www.redbook.com.au \
    www.carsales.com.au \
    www.caradvice.com.au \
    www.racv.com.au
```

In `allowed_destinations`:
```
    www.caradvice.com.au \
    www.racv.com.au \
    en.wikipedia.org
```

**Step 2: Update docker-compose.yml**

Add after the `egress-proxy` service (before the `secrets:` section):

```yaml
  # ----------------------------------------------------------
  # Express Backend — serves React frontend + proxies to OpenClaw
  # ----------------------------------------------------------
  express-backend:
    build: ./backend
    container_name: car3d-express-backend
    restart: unless-stopped

    user: "1000:1000"
    read_only: true
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true

    tmpfs:
      - /tmp:size=64m

    ports:
      - "0.0.0.0:${FRONTEND_PORT:-3000}:3000"

    volumes:
      - ./workspace:/workspace:ro
      - ./frontend/dist:/app/frontend/dist:ro

    environment:
      - NODE_ENV=production
      - CARS_JSON_PATH=/workspace/output/cars.json

    secrets:
      - frontend_token

    networks:
      - openclaw-internal
      - frontend-bridge

    depends_on:
      - openclaw-gateway

    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ----------------------------------------------------------
  # Car Scraper — on-demand, fetches car data from RACV/CarsGuide/Redbook
  # ----------------------------------------------------------
  car-scraper:
    build: ./scraper
    container_name: car3d-car-scraper
    profiles:
      - scraper

    user: "1000:1000"
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true

    tmpfs:
      - /tmp:size=512m

    volumes:
      - ./workspace:/workspace:z

    environment:
      - HTTPS_PROXY=http://egress-proxy:3128
      - HTTP_PROXY=http://egress-proxy:3128
      - NO_PROXY=localhost,127.0.0.1

    networks:
      - openclaw-internal

    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
```

Add to the `secrets:` section:
```yaml
  frontend_token:
    file: ./secrets/frontend_token.txt
```

Add to the `networks:` section:
```yaml
  frontend-bridge:
    name: car3d-frontend-bridge
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
```

**Step 3: Update docker-setup.sh**

After the API key section (step 2), add a new step for frontend token:

```bash
# ============================================================
# 3. Frontend token (Docker secret)
# ============================================================
echo -e "${YELLOW}[3/9] Checking frontend token...${NC}"

if [ ! -f secrets/frontend_token.txt ]; then
    echo "  Generating frontend token..."
    openssl rand -hex 32 > secrets/frontend_token.txt
    chmod 0400 secrets/frontend_token.txt
    echo -e "${GREEN}  ✓ Frontend token generated${NC}"
else
    echo "  ✓ Frontend token already exists"
fi

FRONTEND_TOKEN=$(cat secrets/frontend_token.txt)
```

Renumber subsequent steps (3→4, 4→5, 5→6, 6→7).

After the "Pull images" step, add:

```bash
# ============================================================
# 8. Build frontend
# ============================================================
echo -e "${YELLOW}[8/9] Building frontend...${NC}"

cd frontend && npm install && npm run build && cd ..
echo "  ✓ Frontend built"
```

After starting services, add:

```bash
# Run initial scraper
echo "  Running initial car scraper..."
docker compose run --rm --profile scraper car-scraper || {
    echo -e "${YELLOW}  ⚠ Scraper failed — seed data will be used as fallback${NC}"
}
```

Also start the express-backend:
```bash
docker compose up -d express-backend
echo "  ✓ Express backend started"
```

At the end, in the "Done" section, add:
```bash
echo ""
echo -e "  Frontend token (share with your team):"
echo -e "     ${BLUE}${FRONTEND_TOKEN}${NC}"
echo ""
echo -e "  5. Open the frontend:"
echo -e "     ${BLUE}http://localhost:3000${NC}"
```

**Step 4: Update .env.example**

Add at the end:
```
# Frontend port (bound to 0.0.0.0 — accessible from LAN)
FRONTEND_PORT=3000
```

**Step 5: Verify docker-compose.yml parses**

Run: `cd /Users/samhudson/Documents/Projects/Car-3d-model && docker compose config > /dev/null`
Expected: No errors

**Step 6: Commit**

```bash
git add docker-compose.yml squid.conf docker-setup.sh .env.example
git commit -m "feat(docker): add express-backend, car-scraper services, frontend-bridge network, RACV to allowlist"
```

---

### Task 21: Verification

**Step 1: Check all files exist**

Run:
```bash
ls -la scraper/seeds/cars-seed.json \
  scraper/src/index.ts \
  scraper/src/scrapers/racv.ts \
  scraper/src/scrapers/carsguide.ts \
  scraper/src/scrapers/redbook.ts \
  scraper/package.json \
  scraper/tsconfig.json \
  scraper/Dockerfile \
  backend/src/index.ts \
  backend/src/middleware/auth.ts \
  backend/src/routes/cars.ts \
  backend/src/routes/jobs.ts \
  backend/src/services/openclaw.ts \
  backend/package.json \
  backend/tsconfig.json \
  backend/Dockerfile \
  frontend/src/main.tsx \
  frontend/src/App.tsx \
  frontend/src/types.ts \
  frontend/src/api/client.ts \
  frontend/src/components/CarForm.tsx \
  frontend/src/components/JobList.tsx \
  frontend/src/components/TokenPrompt.tsx \
  frontend/src/hooks/useCars.ts \
  frontend/src/hooks/useJobs.ts \
  frontend/package.json \
  frontend/vite.config.ts \
  frontend/tsconfig.json \
  frontend/index.html
```
Expected: All files listed

**Step 2: Verify TypeScript compiles in each project**

Run: `cd scraper && npx tsc --noEmit && echo "scraper OK"`
Run: `cd backend && npx tsc --noEmit && echo "backend OK"`
Run: `cd frontend && npx tsc --noEmit && echo "frontend OK"`
Expected: All three print OK

**Step 3: Verify frontend builds**

Run: `cd frontend && npm run build && ls dist/index.html`
Expected: `dist/index.html` exists

**Step 4: Verify docker-compose.yml parses**

Run: `docker compose config > /dev/null && echo "compose OK"`
Expected: `compose OK`

**Step 5: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: verification complete — all files present and compiling"
```
