import * as cheerio from "cheerio";
import type { CarMake, CarModel } from "../types.js";
import { fetchHtml, sleep, escapeRegex } from "../utils.js";

const RATE_LIMIT_MS = 500;
const MAX_MAKES = 30;

export async function scrapeCarsguide(): Promise<CarMake[]> {
  console.log("[CarsGuide] Starting scrape...");

  try {
    const html = await fetchHtml("https://www.carsguide.com.au/car-reviews/");
    const $ = cheerio.load(html);

    // Extract make links from the reviews page
    const makeLinks: Array<{ make: string; url: string }> = [];

    $("a[href*='/car-reviews/']").each((_i, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();

      // Match links like /car-reviews/toyota or /car-reviews/mazda
      const match = href.match(/\/car-reviews\/([a-z-]+)\/?$/i);
      if (match && text && !text.toLowerCase().includes("review")) {
        const make = text.replace(/\s+reviews?$/i, "").trim();
        if (make && make.length > 1 && make.length < 30) {
          const fullUrl = href.startsWith("http")
            ? href
            : `https://www.carsguide.com.au${href}`;
          makeLinks.push({ make, url: fullUrl });
        }
      }
    });

    // Also look for make options in any select/filter elements
    $("select option, [data-make]").each((_i, el) => {
      const make =
        $(el).attr("data-make") || $(el).attr("value") || $(el).text().trim();
      if (make && make.length > 1 && make.length < 30 && make !== "All") {
        makeLinks.push({
          make,
          url: `https://www.carsguide.com.au/car-reviews/${make.toLowerCase().replace(/\s+/g, "-")}`,
        });
      }
    });

    // Deduplicate makes
    const uniqueMakes = new Map<string, string>();
    for (const { make, url } of makeLinks) {
      const key = make.toLowerCase();
      if (!uniqueMakes.has(key)) {
        uniqueMakes.set(key, url);
      }
    }

    console.log(`[CarsGuide] Found ${uniqueMakes.size} makes`);

    const makes: CarMake[] = [];
    let count = 0;

    for (const [makeLower, url] of uniqueMakes) {
      if (count >= MAX_MAKES) break;
      count++;

      await sleep(RATE_LIMIT_MS);

      try {
        const makeHtml = await fetchHtml(url);
        const make$ = cheerio.load(makeHtml);
        const makeName =
          makeLower.charAt(0).toUpperCase() + makeLower.slice(1);

        const models: CarModel[] = [];
        const seenModels = new Set<string>();

        // Extract model names from the make page
        make$("a[href*='/car-reviews/'], .model-name, .vehicle-name").each(
          (_i, el) => {
            const text = make$(el).text().trim();
            const href = make$(el).attr("href") || "";

            // Look for model-specific links (escape makeLower for safe regex)
            const modelMatch = href.match(
              new RegExp(
                `/${escapeRegex(makeLower)}/([a-z0-9-]+)`,
                "i"
              )
            );
            if (modelMatch) {
              const modelName = modelMatch[1]
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
              if (!seenModels.has(modelName.toLowerCase())) {
                seenModels.add(modelName.toLowerCase());
                models.push({ name: modelName, types: [] });
              }
            } else if (text && text.length > 1 && text.length < 40) {
              // Try to extract model from text (escape makeName for safe regex)
              const cleaned = text
                .replace(new RegExp(escapeRegex(makeName), "gi"), "")
                .replace(/reviews?/gi, "")
                .trim();
              if (
                cleaned &&
                cleaned.length > 1 &&
                !seenModels.has(cleaned.toLowerCase())
              ) {
                seenModels.add(cleaned.toLowerCase());
                models.push({ name: cleaned, types: [] });
              }
            }
          }
        );

        if (models.length > 0) {
          makes.push({ make: makeName, models });
        }
      } catch (err) {
        console.warn(`[CarsGuide] Failed to scrape make: ${makeLower}`, err);
      }
    }

    console.log(`[CarsGuide] Scraped ${makes.length} makes with models`);
    return makes;
  } catch (error) {
    console.error("[CarsGuide] Scrape failed:", error);
    return [];
  }
}
