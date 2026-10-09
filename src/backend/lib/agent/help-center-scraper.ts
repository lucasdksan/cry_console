import type { Page } from "@playwright/test";

import {
  deriveHelpCenterNavigationFromRepoPath,
  humanizeHelpCenterSlug,
  inferHelpCenterSourceFromUrl,
} from "@/backend/lib/agent/help-center-chunk";
import type {
  HelpCenterDiscoveredLink,
  HelpCenterPageDocument,
  HelpCenterSectionSeed,
  HelpCenterSource,
} from "@/backend/lib/agent/help-center-types";
import {
  discoverHelpCenterLinksFromGitHub,
  HELP_CENTER_GITHUB_SOURCES,
} from "@/backend/lib/agent/help-center-github";
import { VTEX_HELP_SECTION_SEEDS } from "@/backend/lib/agent/help-center-types";

export { VTEX_HELP_SECTION_SEEDS };

const HELP_HOST = "help.vtex.com";
const LOCALE_PREFIX = "/pt/";

function normalizeHelpUrl(href: string, baseUrl: string): string | null {
  try {
    const url = new URL(href, baseUrl);
    if (url.hostname !== HELP_HOST) {
      return null;
    }
    if (!url.pathname.startsWith(LOCALE_PREFIX)) {
      return null;
    }
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function isContentUrl(url: string, source: HelpCenterSource): boolean {
  const path = new URL(url).pathname;
  switch (source) {
    case "tutorials":
      return /\/pt\/docs\/tutorials\/.+/.test(path);
    case "tracks":
      return /\/pt\/docs\/tracks\/.+/.test(path);
    case "faq":
      return path.includes("/faq/") && path !== "/pt/faq";
    case "known-issues":
      return path.includes("/known-issues/") && path !== "/pt/known-issues";
    case "troubleshooting":
      return (
        path.includes("/troubleshooting/") && path !== "/pt/troubleshooting"
      );
    case "announcements":
      return path.includes("/announcements/") && path !== "/pt/announcements";
    default:
      return false;
  }
}

async function expandSidebarTree(page: Page): Promise<void> {
  const sidebarComponent = page.locator(".sidebar-component").first();
  const hasSidebarComponent = (await sidebarComponent.count()) > 0;
  const aside = page.locator("aside").first();
  const hasAside = (await aside.count()) > 0;
  const root = hasSidebarComponent
    ? sidebarComponent
    : hasAside
      ? aside
      : page.locator("nav").first();

  const expandSelector =
    'button[aria-label="Expand category"], button[aria-label="Expandir categoria"], button[aria-expanded="false"], [role="button"][aria-expanded="false"]';

  for (let step = 0; step < 2_500; step += 1) {
    const btn = root.locator(expandSelector).first();
    if ((await btn.count()) === 0) {
      break;
    }
    if (!(await btn.isVisible().catch(() => false))) {
      break;
    }
    await btn.scrollIntoViewIfNeeded().catch(() => undefined);
    await btn.click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(120);
  }

  const scrollHost = root.locator('[style*="overflow"], .overflow-auto').first();
  if ((await scrollHost.count()) > 0) {
    for (let i = 0; i < 8; i += 1) {
      await scrollHost.evaluate((el) => {
        el.scrollTop += el.clientHeight;
      }).catch(() => undefined);
      await page.waitForTimeout(100);
    }
  }
}

async function collectAnchorsFromPage(
  page: Page,
  source: HelpCenterSource,
): Promise<HelpCenterDiscoveredLink[]> {
  const baseUrl = page.url();
  const pairs = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a[href]"));
    return anchors.map((a) => ({
      href: a.getAttribute("href") ?? "",
      label: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
    }));
  });

  const out: HelpCenterDiscoveredLink[] = [];
  const seen = new Set<string>();

  for (const { href, label } of pairs) {
    const normalized = normalizeHelpUrl(href, baseUrl);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    if (!isContentUrl(normalized, source)) {
      continue;
    }
    seen.add(normalized);
    out.push({
      url: normalized,
      label: label || normalized,
      source,
    });
  }
  return out;
}

async function paginateListingPages(
  page: Page,
  source: HelpCenterSource,
): Promise<HelpCenterDiscoveredLink[]> {
  const collected: HelpCenterDiscoveredLink[] = [];
  const seenPages = new Set<string>();

  for (let pageIndex = 0; pageIndex < 400; pageIndex += 1) {
    const current = page.url();
    if (seenPages.has(current)) {
      break;
    }
    seenPages.add(current);
    collected.push(...(await collectAnchorsFromPage(page, source)));

    const next = page.getByRole("link", { name: /^Próxima|^Next/i }).first();
    if ((await next.count()) === 0 || !(await next.isVisible().catch(() => false))) {
      const numbered = page.locator('a[aria-label="Go to next page"], a:has-text("›")').first();
      if ((await numbered.count()) === 0) {
        break;
      }
      const disabled = await numbered.getAttribute("aria-disabled");
      if (disabled === "true") {
        break;
      }
      await numbered.click().catch(() => undefined);
    } else {
      await next.click().catch(() => undefined);
    }
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(400);
  }

  return collected;
}

async function discoverLinksForListingSection(
  page: Page,
  seed: HelpCenterSectionSeed,
): Promise<HelpCenterDiscoveredLink[]> {
  await page.goto(seed.url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => undefined);

  await expandSidebarTree(page);
  const sidebarLinks = await collectAnchorsFromPage(page, seed.source);
  const listingLinks = await paginateListingPages(page, seed.source);

  const merged = new Map<string, HelpCenterDiscoveredLink>();
  for (const link of [...sidebarLinks, ...listingLinks]) {
    merged.set(link.url, link);
  }
  return [...merged.values()];
}

export async function discoverLinksForSection(
  page: Page | null,
  seed: HelpCenterSectionSeed,
): Promise<HelpCenterDiscoveredLink[]> {
  if (HELP_CENTER_GITHUB_SOURCES.includes(seed.source)) {
    return discoverHelpCenterLinksFromGitHub([seed.source]);
  }
  if (!page) {
    throw new Error(
      `Descoberta Playwright exige browser (fonte: ${seed.source}).`,
    );
  }
  return discoverLinksForListingSection(page, seed);
}

export async function discoverAllHelpCenterLinks(
  page: Page | null,
  seeds: HelpCenterSectionSeed[] = VTEX_HELP_SECTION_SEEDS,
): Promise<HelpCenterDiscoveredLink[]> {
  const merged = new Map<string, HelpCenterDiscoveredLink>();

  const githubSources = [
    ...new Set(
      seeds
        .map((seed) => seed.source)
        .filter((source) => HELP_CENTER_GITHUB_SOURCES.includes(source)),
    ),
  ];
  if (githubSources.length > 0) {
    const fromGitHub = await discoverHelpCenterLinksFromGitHub(githubSources);
    for (const link of fromGitHub) {
      merged.set(link.url, link);
    }
    console.log(
      `GitHub help-center-content: ${fromGitHub.length} URLs (${githubSources.join(", ")})`,
    );
  }

  for (const seed of seeds) {
    if (HELP_CENTER_GITHUB_SOURCES.includes(seed.source)) {
      continue;
    }
    const links = await discoverLinksForSection(page, seed);
    console.log(`Playwright ${seed.source}: ${links.length} URLs`);
    for (const link of links) {
      merged.set(link.url, link);
    }
  }

  return [...merged.values()];
}

type ArticleJsonPayload = {
  content?: string;
  slug?: string;
  title?: string;
  path?: string;
};

async function tryFetchArticleJson(
  url: string,
): Promise<{ title: string; text: string; section: string | null } | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("json")) {
      return null;
    }
    const json = (await response.json()) as ArticleJsonPayload;
    if (!json.content?.trim()) {
      return null;
    }
    const title =
      json.title?.trim() ||
      (json.slug ? humanizeHelpCenterSlug(json.slug) : "") ||
      url;
    const section = json.path
      ? deriveHelpCenterNavigationFromRepoPath(json.path)
      : null;
    return {
      title,
      text: json.content.trim(),
      section,
    };
  } catch {
    return null;
  }
}

export async function scrapeHelpCenterPage(
  page: Page,
  url: string,
  source?: HelpCenterSource,
): Promise<HelpCenterPageDocument | null> {
  const resolvedSource = source ?? inferHelpCenterSourceFromUrl(url);

  const fromJson = await tryFetchArticleJson(url);
  if (fromJson) {
    return {
      url,
      title: fromJson.title,
      section: fromJson.section,
      text: fromJson.text,
      source: resolvedSource,
    };
  }

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => undefined);

  const extracted = await page.evaluate(() => {
    const title =
      document.querySelector("h1")?.textContent?.trim() ||
      document.title.replace(/\s*\|\s*VTEX Help Center.*/i, "").trim();

    const breadcrumb = Array.from(
      document.querySelectorAll('[aria-label="Breadcrumb"] a, nav[aria-label*="breadcrumb" i] a'),
    )
      .map((a) => (a.textContent ?? "").trim())
      .filter(Boolean)
      .join(" > ");

    const sidebarTrail = (() => {
      const sidebar = document.querySelector(".sidebar-component");
      if (!sidebar) {
        return "";
      }
      const labels: string[] = [];
      const activeRows = sidebar.querySelectorAll('[data-sidebar-active="true"]');
      for (const row of activeRows) {
        const link = row.querySelector("a[href]");
        const label = (link?.textContent ?? row.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim();
        if (label) {
          labels.push(label);
        }
      }
      return labels.join(" > ");
    })();

    const main =
      document.querySelector("main article") ||
      document.querySelector("main") ||
      document.querySelector("article") ||
      document.querySelector('[role="main"]');

    if (!main) {
      return { title, breadcrumb, sidebarTrail, text: "" };
    }

    const clone = main.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll("nav, aside, footer, script, style, button")
      .forEach((el) => el.remove());

    const text = (clone.innerText ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return { title, breadcrumb, sidebarTrail, text };
  });

  if (!extracted.text || extracted.text.length < 40) {
    return null;
  }

  const navigationSection =
    extracted.breadcrumb || extracted.sidebarTrail || null;

  return {
    url,
    title: extracted.title || url,
    section: navigationSection,
    text: extracted.text,
    source: resolvedSource,
  };
}
