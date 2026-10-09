import "dotenv/config";

import { chromium } from "@playwright/test";

import { scrapeHelpCenterPage } from "@/backend/lib/agent/help-center-scraper";

async function main(): Promise<void> {
  const url = process.argv[2];
  if (!url) {
    console.error("Uso: pnpm exec tsx scripts/scrape-vtex-help-page.ts <url>");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "pt-BR" });
  const page = await context.newPage();

  try {
    const doc = await scrapeHelpCenterPage(page, url);
    if (!doc) {
      console.error("Não foi possível extrair conteúdo.");
      process.exit(2);
    }
    console.log(JSON.stringify(doc, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
