import "dotenv/config";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { buildHelpCenterChunksFromPage } from "@/backend/lib/agent/help-center-chunk";
import { isHelpCenterPineconeConfigured } from "@/backend/lib/agent/help-center-config";
import {
  isHelpCenterUrlIndexed,
  upsertHelpCenterChunks,
} from "@/backend/lib/agent/help-center-pinecone";
import type { HelpCenterDiscoveredLink } from "@/backend/lib/agent/help-center-types";
import {
  discoverAllHelpCenterLinks,
  scrapeHelpCenterPage,
  VTEX_HELP_SECTION_SEEDS,
} from "@/backend/lib/agent/help-center-scraper";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const linksFile = join(root, "tmp", "vtex-help-links.json");
const progressFile = join(root, "tmp", "vtex-help-index-progress.json");
const UPSERT_BATCH = Number(process.env.VTEX_HELP_UPSERT_BATCH) || 20;
const SCRAPE_CONCURRENCY = 1;

type IndexProgress = { completedUrls: string[] };

function loadIndexProgress(): Set<string> {
  if (process.env.VTEX_HELP_FULL_REINDEX === "1") {
    return new Set();
  }
  try {
    const raw = readFileSync(progressFile, "utf8");
    const parsed = JSON.parse(raw) as IndexProgress;
    return new Set(parsed.completedUrls ?? []);
  } catch {
    return new Set();
  }
}

function saveIndexProgress(completedUrls: Set<string>): void {
  mkdirSync(dirname(progressFile), { recursive: true });
  writeFileSync(
    progressFile,
    `${JSON.stringify({ completedUrls: [...completedUrls] }, null, 2)}\n`,
    "utf8",
  );
}

async function loadLinks(): Promise<HelpCenterDiscoveredLink[]> {
  const skipDiscover = process.env.VTEX_HELP_SKIP_DISCOVER === "1";
  if (!skipDiscover) {
    return [];
  }
  try {
    const raw = readFileSync(linksFile, "utf8");
    return JSON.parse(raw) as HelpCenterDiscoveredLink[];
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  if (!isHelpCenterPineconeConfigured()) {
    console.error(
      "Configure PINECONE_API_KEY, PINECONE_INDEX e GEMINI_API_KEY no .env.",
    );
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "pt-BR" });
  const page = await context.newPage();

  let links = await loadLinks();
  if (links.length === 0) {
    console.log("Descobrindo links no Help Center VTEX…");
    links = await discoverAllHelpCenterLinks(page, VTEX_HELP_SECTION_SEEDS);
    mkdirSync(dirname(linksFile), { recursive: true });
    writeFileSync(linksFile, `${JSON.stringify(links, null, 2)}\n`, "utf8");
    console.log(`Encontrados ${links.length} links (salvos em ${linksFile}).`);
  } else {
    console.log(`Usando ${links.length} links de ${linksFile}.`);
  }

  const completedUrls = loadIndexProgress();
  const pendingLinks: HelpCenterDiscoveredLink[] = [];
  let skippedByPinecone = 0;
  let revivedFromProgress = 0;

  for (const link of links) {
    if (process.env.VTEX_HELP_FULL_REINDEX === "1") {
      pendingLinks.push(link);
      continue;
    }
    const markedDone = completedUrls.has(link.url);
    if (markedDone) {
      const indexed = await isHelpCenterUrlIndexed(link.url);
      if (indexed) {
        skippedByPinecone += 1;
        continue;
      }
      revivedFromProgress += 1;
    }
    pendingLinks.push(link);
  }

  if (completedUrls.size > 0 || skippedByPinecone > 0) {
    console.log(
      `Retomando: ${skippedByPinecone} URLs confirmadas no Pinecone, ${revivedFromProgress} reabertas (progresso sem vetores), faltam ${pendingLinks.length}.`,
    );
  }

  const pendingChunks: Awaited<ReturnType<typeof buildHelpCenterChunksFromPage>> =
    [];
  let pagesOk = 0;
  let pagesFailed = 0;
  let totalChunks = 0;
  let chunksUpserted = 0;
  let chunksSkipped = 0;

  for (let i = 0; i < pendingLinks.length; i += 1) {
    const link = pendingLinks[i]!;
    process.stdout.write(
      `[${i + 1}/${pendingLinks.length}] ${link.url}\n`,
    );
    const doc = await scrapeHelpCenterPage(page, link.url, link.source);
    if (!doc) {
      pagesFailed += 1;
      continue;
    }
    pagesOk += 1;
    const pageChunks = buildHelpCenterChunksFromPage(doc);
    totalChunks += pageChunks.length;
    pendingChunks.push(...pageChunks);

    while (pendingChunks.length >= UPSERT_BATCH) {
      const batch = pendingChunks.splice(0, UPSERT_BATCH);
      const summary = await upsertHelpCenterChunks(batch);
      chunksUpserted += summary.upserted;
      chunksSkipped += summary.skipped;
      console.log(
        `  Upsert: ${summary.upserted} novos, ${summary.skipped} já indexados (lote ${batch.length})`,
      );
    }

    completedUrls.add(link.url);
    saveIndexProgress(completedUrls);

    if (SCRAPE_CONCURRENCY > 1) {
      await page.waitForTimeout(100);
    }
  }

  if (pendingChunks.length > 0) {
    const summary = await upsertHelpCenterChunks(pendingChunks);
    chunksUpserted += summary.upserted;
    chunksSkipped += summary.skipped;
    console.log(
      `  Upsert final: ${summary.upserted} novos, ${summary.skipped} já indexados (lote ${pendingChunks.length})`,
    );
  }

  await context.close();
  await browser.close();

  console.log(
    JSON.stringify(
      {
        links: links.length,
        pagesOk,
        pagesFailed,
        chunksBuilt: totalChunks,
        chunksUpserted,
        chunksSkipped,
        urlsSkippedConfirmed: skippedByPinecone,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
