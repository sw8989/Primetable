/**
 * Populate the restaurant database from the curated London catalog.
 *
 * Usage:
 *   npm run populate:restaurants
 *   npm run populate:restaurants -- --detect   # HTTP-detect platforms not in catalog
 *   npm run populate:restaurants -- --clear    # wipe existing rows first
 *
 * Behaviour:
 *   - Upserts on name. Existing rows are updated, not duplicated.
 *   - When knownPlatform is set in the catalog, uses it directly (no HTTP fetch).
 *   - When knownPlatform is absent and --detect is passed, calls analyzeWebsite().
 */

import "dotenv/config";
import { db } from "../db.js";
import { restaurants } from "../../shared/schema.js";
import { londonRestaurantCatalog, type CatalogEntry } from "../data/londonRestaurantCatalog.js";
import { analyzeWebsite, BookingPlatform } from "../services/booking/platformDetector.js";
import { eq, ilike } from "drizzle-orm";

const args = process.argv.slice(2);
const DETECT_UNKNOWN = args.includes("--detect");
const CLEAR_FIRST = args.includes("--clear");

const PLATFORM_LABEL: Record<string, string> = {
  [BookingPlatform.OPENTABLE]: "OpenTable",
  [BookingPlatform.RESY]: "Resy",
  [BookingPlatform.TOCK]: "Tock",
  [BookingPlatform.SEVENROOMS]: "SevenRooms",
  [BookingPlatform.DIRECT]: "Direct",
  [BookingPlatform.UNKNOWN]: "Unknown",
};

async function resolvePlatform(entry: CatalogEntry): Promise<{ platform: string; confidence: number }> {
  if (entry.knownPlatform) {
    return { platform: entry.knownPlatform, confidence: 1 };
  }
  if (DETECT_UNKNOWN && entry.websiteUrl) {
    try {
      const result = await analyzeWebsite(entry.websiteUrl);
      const label = PLATFORM_LABEL[result.platform] ?? result.platform;
      return { platform: label, confidence: result.confidence };
    } catch {
      return { platform: "Unknown", confidence: 0 };
    }
  }
  return { platform: "Unknown", confidence: 0 };
}

async function upsert(entry: CatalogEntry, platform: string) {
  const patch = {
    description: entry.description,
    cuisine: entry.cuisine,
    location: entry.location,
    bookingDifficulty: entry.bookingDifficulty,
    bookingInfo: entry.bookingInfo ?? "",
    bookingNotes: entry.bookingNotes ?? null,
    websiteUrl: entry.websiteUrl ?? null,
    bookingUrl: entry.bookingUrl ?? null,
    bookingPlatform: platform,
    platformId: entry.platformId ?? null,
  };

  const [existing] = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(ilike(restaurants.name, entry.name));

  if (existing) {
    await db.update(restaurants).set(patch).where(eq(restaurants.id, existing.id));
  } else {
    await db.insert(restaurants).values({
      name: entry.name,
      imageUrl: null,
      platformDetails: null,
      lastScrapedAt: null,
      ...patch,
    });
  }
}

async function main() {
  console.log(`\nPrime Table — Restaurant Populate Script`);
  console.log(`Catalog entries : ${londonRestaurantCatalog.length}`);
  console.log(`Auto-detect     : ${DETECT_UNKNOWN}`);
  console.log(`Clear first     : ${CLEAR_FIRST}\n`);

  if (CLEAR_FIRST) {
    await db.delete(restaurants);
    console.log("Cleared existing restaurants.\n");
  }

  const results: Array<{ name: string; platform: string; status: string }> = [];

  for (const entry of londonRestaurantCatalog) {
    process.stdout.write(`  ${entry.name.padEnd(42)} `);
    try {
      const { platform, confidence } = await resolvePlatform(entry);
      await upsert(entry, platform);
      const tag = entry.knownPlatform ? "known" : `${Math.round(confidence * 100)}%`;
      process.stdout.write(`${platform.padEnd(14)} ${tag}\n`);
      results.push({ name: entry.name, platform, status: "ok" });
    } catch (err: any) {
      process.stdout.write(`ERROR: ${err.message}\n`);
      results.push({ name: entry.name, platform: "?", status: "error" });
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const errors = results.filter((r) => r.status === "error").length;
  const byPlatform = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.platform] = (acc[r.platform] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\n─── Summary ─────────────────────────────────`);
  console.log(`Upserted: ${ok}  Errors: ${errors}`);
  console.log(`By platform:`);
  Object.entries(byPlatform)
    .sort((a, b) => b[1] - a[1])
    .forEach(([p, n]) => console.log(`  ${p.padEnd(14)} ${n}`));
  console.log(`─────────────────────────────────────────────\n`);

  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
