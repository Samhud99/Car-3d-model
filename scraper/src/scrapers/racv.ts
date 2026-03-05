import puppeteer from "puppeteer";
import type { CarMake, CarModel } from "../types.js";

export type { CarMake, CarModel };

export async function scrapeRacv(): Promise<CarMake[]> {
  console.log("[RACV] Starting Puppeteer scrape...");

  const launchArgs = [
    // --no-sandbox is acceptable here: the container itself provides process
    // isolation (read-only rootfs, all caps dropped, no-new-privileges, non-root
    // user 1000). Running Chromium's sandbox inside an already-sandboxed
    // container is unnecessary and requires privileged capabilities.
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
  ];

  // Route Puppeteer traffic through the egress proxy when configured
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    launchArgs.push(`--proxy-server=${proxyUrl}`);
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: launchArgs,
    });

    const page = await browser.newPage();

    // Strategy 1: Intercept JSON API responses containing car data
    const interceptedData: CarMake[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      const contentType = response.headers()["content-type"] || "";

      if (!contentType.includes("application/json")) return;

      try {
        const json = await response.json();
        const makes = extractCarDataFromJson(json);
        if (makes.length > 0) {
          console.log(
            `[RACV] Intercepted ${makes.length} makes from ${url}`
          );
          interceptedData.push(...makes);
        }
      } catch {
        // Not valid JSON or couldn't parse — skip
      }
    });

    await page.goto("https://www.racv.com.au/car-match.html", {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });

    // Wait a bit for any lazy-loaded API calls
    await new Promise((resolve) => setTimeout(resolve, 3000));

    if (interceptedData.length > 0) {
      console.log(
        `[RACV] Strategy 1 succeeded: ${interceptedData.length} makes from API interception`
      );
      return deduplicateMakes(interceptedData);
    }

    // Strategy 2: DOM extraction fallback
    console.log("[RACV] Strategy 1 yielded no results, trying DOM extraction...");

    const domData = await page.evaluate(() => {
      const makes: Array<{ make: string; models: Array<{ name: string; types: string[] }> }> = [];
      const makeMap = new Map<string, Map<string, Set<string>>>();

      // Look for car cards, listings, select options, or any structured car data
      const selectors = [
        "[data-make]",
        "[data-model]",
        ".car-card",
        ".car-listing",
        ".vehicle-card",
        ".make-model",
        "select[name*='make'] option",
        "select[name*='model'] option",
        "[class*='car-'] [class*='make']",
        "[class*='vehicle'] [class*='make']",
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const makeAttr =
            el.getAttribute("data-make") ||
            el.getAttribute("data-brand") ||
            "";
          const modelAttr =
            el.getAttribute("data-model") ||
            el.getAttribute("data-name") ||
            "";
          const typeAttr =
            el.getAttribute("data-type") ||
            el.getAttribute("data-body") ||
            "";

          if (makeAttr && modelAttr) {
            if (!makeMap.has(makeAttr)) {
              makeMap.set(makeAttr, new Map());
            }
            const modelMap = makeMap.get(makeAttr)!;
            if (!modelMap.has(modelAttr)) {
              modelMap.set(modelAttr, new Set());
            }
            if (typeAttr) {
              modelMap.get(modelAttr)!.add(typeAttr);
            }
          }
        }
      }

      for (const [make, modelMap] of makeMap) {
        const models: Array<{ name: string; types: string[] }> = [];
        for (const [model, types] of modelMap) {
          models.push({ name: model, types: Array.from(types) });
        }
        if (models.length > 0) {
          makes.push({ make, models });
        }
      }

      return makes;
    });

    if (domData.length > 0) {
      console.log(
        `[RACV] Strategy 2 succeeded: ${domData.length} makes from DOM extraction`
      );
      return deduplicateMakes(domData);
    }

    console.log("[RACV] No car data found from either strategy");
    return [];
  } catch (error) {
    console.error("[RACV] Scrape failed:", error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function extractCarDataFromJson(data: unknown): CarMake[] {
  const makes: CarMake[] = [];

  if (!data || typeof data !== "object") return makes;

  // If data is an array, check if items have make/model fields
  if (Array.isArray(data)) {
    const makeMap = new Map<string, Map<string, Set<string>>>();

    for (const item of data) {
      if (typeof item !== "object" || item === null) continue;
      const record = item as Record<string, unknown>;

      const make =
        (record.make as string) ||
        (record.brand as string) ||
        (record.manufacturer as string) ||
        "";
      const model =
        (record.model as string) ||
        (record.name as string) ||
        (record.modelName as string) ||
        "";
      const type =
        (record.type as string) ||
        (record.bodyType as string) ||
        (record.body as string) ||
        (record.category as string) ||
        "";

      if (make && model) {
        if (!makeMap.has(make)) makeMap.set(make, new Map());
        const modelMap = makeMap.get(make)!;
        if (!modelMap.has(model)) modelMap.set(model, new Set());
        if (type) modelMap.get(model)!.add(type);
      }
    }

    for (const [make, modelMap] of makeMap) {
      const models: CarModel[] = [];
      for (const [model, types] of modelMap) {
        models.push({ name: model, types: Array.from(types) });
      }
      makes.push({ make, models });
    }
  }

  // If data is an object, look for nested arrays
  if (!Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key])) {
        const nested = extractCarDataFromJson(obj[key]);
        makes.push(...nested);
      }
    }
  }

  return makes;
}

function deduplicateMakes(makes: CarMake[]): CarMake[] {
  const makeMap = new Map<string, Map<string, Set<string>>>();

  for (const make of makes) {
    const normalizedMake = make.make.trim();
    if (!makeMap.has(normalizedMake)) {
      makeMap.set(normalizedMake, new Map());
    }
    const modelMap = makeMap.get(normalizedMake)!;

    for (const model of make.models) {
      const normalizedModel = model.name.trim();
      if (!modelMap.has(normalizedModel)) {
        modelMap.set(normalizedModel, new Set());
      }
      const typeSet = modelMap.get(normalizedModel)!;
      for (const type of model.types) {
        typeSet.add(type.trim());
      }
    }
  }

  const result: CarMake[] = [];
  for (const [make, modelMap] of makeMap) {
    const models: CarModel[] = [];
    for (const [model, types] of modelMap) {
      models.push({ name: model, types: Array.from(types) });
    }
    result.push({ make, models });
  }

  return result;
}
