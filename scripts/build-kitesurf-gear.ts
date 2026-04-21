/**
 * Build kitesurf gear catalog from scraped raw JSON files.
 *
 * Reads content/kitesurf-gear/{brand}-raw.json and writes
 * public/data/kitesurf-gear/{kites,boards}.json for the client to fetch.
 *
 * Runs as part of `prebuild` so Vercel has fresh catalog data.
 */

import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content", "kitesurf-gear");
const OUTPUT_DIR = path.join(process.cwd(), "public", "data", "kitesurf-gear");

interface RawItem {
  id: string;
  brand: string;
  model: string;
  type: string;
  sizes_m2?: number[];
  sizes_cm?: string[];
  discipline?: string[];
  wind_range_knots?: [number, number] | null;
  year?: number | null;
  url?: string;
  summary?: string;
}

function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log("  No kitesurf-gear content dir — skipping.");
    return;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const kites: RawItem[] = [];
  const boards: RawItem[] = [];

  const brandFiles = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith("-raw.json"));

  for (const file of brandFiles) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    const items: RawItem[] = JSON.parse(raw);
    for (const item of items) {
      const base = {
        id: item.id,
        brand: item.brand,
        model: item.model,
        discipline: item.discipline ?? [],
        year: item.year ?? null,
        url: item.url,
        summary: item.summary ?? "",
      };
      if (item.type === "kite") {
        kites.push({
          ...base,
          type: "kite",
          sizes_m2: item.sizes_m2 ?? [],
          wind_range_knots: item.wind_range_knots ?? null,
        });
      } else {
        boards.push({
          ...base,
          type: item.type || "twintip",
          sizes_cm: item.sizes_cm ?? [],
        });
      }
    }
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "kites.json"),
    JSON.stringify(kites, null, 2)
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "boards.json"),
    JSON.stringify(boards, null, 2)
  );

  console.log(
    `  kitesurf-gear: ${kites.length} kites, ${boards.length} boards written to public/data/kitesurf-gear/`
  );
}

main();
