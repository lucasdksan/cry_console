import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import {
  discoverAllHelpCenterLinks,
  VTEX_HELP_SECTION_SEEDS,
} from "@/backend/lib/agent/help-center-scraper";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile =
  process.env.VTEX_HELP_LINKS_FILE ??
  join(root, "tmp", "vtex-help-links.json");

async function main(): Promise<void> {
  mkdirSync(dirname(outFile), { recursive: true });

  const needsBrowser = VTEX_HELP_SECTION_SEEDS.some(
    (seed) => seed.source === "known-issues",
  );

  const browser = needsBrowser ? await chromium.launch({ headless: true }) : null;
  const context = browser
    ? await browser.newContext({ locale: "pt-BR" })
    : null;
  const page = context ? await context.newPage() : null;

  try {
    const started = Date.now();
    const links = await discoverAllHelpCenterLinks(page, VTEX_HELP_SECTION_SEEDS);
    writeFileSync(outFile, `${JSON.stringify(links, null, 2)}\n`, "utf8");
    const bySource = Object.fromEntries(
      VTEX_HELP_SECTION_SEEDS.map((seed) => [
        seed.source,
        links.filter((link) => link.source === seed.source).length,
      ]),
    );
    console.log(
      `Descobertos ${links.length} links em ${((Date.now() - started) / 1000).toFixed(1)}s.`,
    );
    console.log(JSON.stringify(bySource, null, 2));
    console.log(`Salvo em ${outFile}`);
  } finally {
    await context?.close();
    await browser?.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
