import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

const CONTENT_DIR = path.join(process.cwd(), "content");
const OUTPUT_DIR = path.join(process.cwd(), "public", "data");

const CATEGORIES = [
  "cameras",
  "lenses",
  "filters",
  "spots",
  "shooting-guides",
  "settings-rules",
];

function getAllMdFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllMdFiles(fullPath));
    } else if (
      entry.name.endsWith(".md") &&
      !entry.name.startsWith("_")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

async function processCategory(category: string): Promise<void> {
  const categoryDir = path.join(CONTENT_DIR, category);
  const outputDir = path.join(OUTPUT_DIR, category);

  if (!fs.existsSync(categoryDir)) {
    console.log(`  Skipping ${category} (no directory)`);
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const mdFiles = getAllMdFiles(categoryDir);
  const index: Record<string, unknown>[] = [];

  for (const filePath of mdFiles) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data: frontmatter, content } = matter(raw);

    if (!frontmatter.id) {
      console.warn(`  Warning: ${filePath} has no id in frontmatter, skipping`);
      continue;
    }

    const bodyHtml = await marked(content);

    // Add to index (frontmatter only)
    index.push(frontmatter);

    // Write individual file (full with HTML body)
    const slug = frontmatter.id as string;
    const fullData = { ...frontmatter, body_html: bodyHtml };
    fs.writeFileSync(
      path.join(outputDir, `${slug}.json`),
      JSON.stringify(fullData, null, 2)
    );
  }

  // Write index file
  fs.writeFileSync(
    path.join(outputDir, "index.json"),
    JSON.stringify(index, null, 2)
  );

  console.log(`  ${category}: ${index.length} items processed`);
}

async function processOpportunityRules(): Promise<void> {
  const rulesDir = path.join(CONTENT_DIR, "opportunity-rules");

  if (!fs.existsSync(rulesDir)) {
    console.log("  Skipping opportunity-rules (no directory)");
    return;
  }

  const mdFiles = getAllMdFiles(rulesDir);
  const rules: Record<string, unknown>[] = [];

  for (const filePath of mdFiles) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data: frontmatter, content } = matter(raw);

    if (!frontmatter.id) {
      console.warn(`  Warning: ${filePath} has no id in frontmatter, skipping`);
      continue;
    }

    const bodyHtml = await marked(content);
    rules.push({ ...frontmatter, body_html: bodyHtml });
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "opportunity-rules.json"),
    JSON.stringify(rules, null, 2)
  );

  console.log(`  opportunity-rules: ${rules.length} rules processed`);
}

async function main() {
  console.log("Building content JSON...");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const category of CATEGORIES) {
    await processCategory(category);
  }

  await processOpportunityRules();

  console.log("Content build complete!");
}

main().catch(console.error);
