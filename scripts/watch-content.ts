import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const CONTENT_DIR = path.join(process.cwd(), "content");
const DEBOUNCE_MS = 500;

let timeout: ReturnType<typeof setTimeout> | null = null;

function rebuild() {
  console.log("[watch] Content changed, rebuilding JSON...");
  try {
    execSync("tsx scripts/md-to-json.ts", { stdio: "inherit" });
  } catch (e) {
    console.error("[watch] Build failed:", e);
  }
}

// Initial build
rebuild();

// Watch for changes
console.log("[watch] Watching content/ for changes...");
fs.watch(CONTENT_DIR, { recursive: true }, (_event, filename) => {
  if (!filename?.endsWith(".md")) return;

  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(rebuild, DEBOUNCE_MS);
});
