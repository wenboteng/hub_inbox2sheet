import { startCrawl } from "../lib/crawler";

console.log("[DEBUG] Current working directory:", process.cwd());

async function main() {
  try {
    console.log("Starting crawl...");
    await startCrawl();

    console.log("Crawl completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Crawl failed:", error);
    process.exit(1);
  }
}

main(); 