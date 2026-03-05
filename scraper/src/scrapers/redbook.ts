import * as cheerio from "cheerio";
import type { CarMake, CarModel } from "../types.js";
import { fetchHtml, sleep, escapeRegex } from "../utils.js";

const RATE_LIMIT_MS = 500;
const MAX_MAKES = 30;

export async function scrapeRedbook(): Promise<CarMake[]> {
  console.log("[Redbook] Starting scrape...");

  try {
    const html = await fetchHtml(
      "https://www.redbook.com.au/cars/research/"
    );
    const $ = cheerio.load(html);

    // Extract make links from the research page
    const makeLinks: Array<{ make: string; url: string }> = [];

    // Look for make links in navigation, lists, or grid
    $(
      "a[href*='/cars/research/'], a[href*='/cars/'], .make-list a, .brand-list a"
    ).each((_i, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();

      // Match make-level links like /cars/research/toyota/
      const match = href.match(/\/cars\/(?:research\/)?([a-z-]+)\/?$/i);
      if (match && text && text.length > 1 && text.length < 30) {
        const make = text.trim();
        const fullUrl = href.startsWith("http")
          ? href
          : `https://www.redbook.com.au${href}`;
        makeLinks.push({ make, url: fullUrl });
      }
    });

    // Also check select elements for makes
    $("select option").each((_i, el) => {
      const value = $(el).attr("value") || "";
      const text = $(el).text().trim();
      if (
        value &&
        text &&
        text.length > 1 &&
        text.length < 30 &&
        text !== "Select Make" &&
        text !== "All Makes"
      ) {
        makeLinks.push({
          make: text,
          url: `https://www.redbook.com.au/cars/research/${text.toLowerCase().replace(/\s+/g, "-")}/`,
        });
      }
    });

    // Deduplicate
    const uniqueMakes = new Map<string, string>();
    for (const { make, url } of makeLinks) {
      const key = make.toLowerCase();
      if (!uniqueMakes.has(key)) {
        uniqueMakes.set(key, url);
      }
    }

    console.log(`[Redbook] Found ${uniqueMakes.size} makes`);

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
        make$(
          "a[href*='/cars/research/'], a[href*='/cars/'], .model-list a, .model-name"
        ).each((_i, el) => {
          const text = make$(el).text().trim();
          const href = make$(el).attr("href") || "";

          // Look for model-level links (escape makeLower for safe regex)
          const modelMatch = href.match(
            new RegExp(`/${escapeRegex(makeLower)}/([a-z0-9-]+)`, "i")
          );
          if (modelMatch) {
            const modelName = modelMatch[1]
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());
            if (
              !seenModels.has(modelName.toLowerCase()) &&
              modelName.length > 1
            ) {
              seenModels.add(modelName.toLowerCase());
              models.push({ name: modelName, types: [] });
            }
          } else if (
            text &&
            text.length > 1 &&
            text.length < 40 &&
            !text.toLowerCase().includes("research")
          ) {
            // Escape makeName for safe regex
            const cleaned = text
              .replace(new RegExp(escapeRegex(makeName), "gi"), "")
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
        });

        if (models.length > 0) {
          makes.push({ make: makeName, models });
        }
      } catch (err) {
        console.warn(`[Redbook] Failed to scrape make: ${makeLower}`, err);
      }
    }

    console.log(`[Redbook] Scraped ${makes.length} makes with models`);
    return makes;
  } catch (error) {
    console.error("[Redbook] Scrape failed:", error);
    return [];
  }
}
