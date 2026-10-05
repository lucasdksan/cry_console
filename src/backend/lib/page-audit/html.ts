import { parse } from "node-html-parser";

import type { HtmlHeading, HtmlSignals } from "@/backend/lib/page-audit/types";

const CTA_PATTERN =
  /\b(comprar|adicionar ao carrinho|add to cart|finalizar|checkout|eu quero|assinar)\b/i;

export function parseHtmlSignals(html: string): Omit<HtmlSignals, "originChecks"> {
  const root = parse(html, {
    lowerCaseTagName: true,
    comment: false,
  });

  const title = root.querySelector("title")?.text.trim() || null;
  const description =
    root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ||
    null;
  const canonical =
    root.querySelector('link[rel="canonical"]')?.getAttribute("href")?.trim() || null;
  const robots =
    root.querySelector('meta[name="robots"]')?.getAttribute("content")?.trim() || null;
  const lang = root.querySelector("html")?.getAttribute("lang")?.trim() || null;
  const viewport = Boolean(root.querySelector('meta[name="viewport"]'));

  const headings: HtmlHeading[] = [];
  for (const level of [1, 2, 3] as const) {
    for (const el of root.querySelectorAll(`h${level}`)) {
      const text = el.text.replace(/\s+/g, " ").trim();
      if (text.length > 0) {
        headings.push({ level, text: text.slice(0, 200) });
      }
    }
  }

  const jsonLdBlocks: string[] = [];
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    const raw = script.text.trim();
    if (raw.length > 0) {
      jsonLdBlocks.push(raw.slice(0, 8000));
    }
  }

  const images = root.querySelectorAll("img").slice(0, 80);
  let imagesWithoutAlt = 0;
  for (const img of images) {
    const alt = img.getAttribute("alt");
    if (!alt || alt.trim().length === 0) {
      imagesWithoutAlt += 1;
    }
  }

  let hasPurchaseCta = false;
  for (const el of root.querySelectorAll("a, button")) {
    const text = el.text.replace(/\s+/g, " ").trim();
    if (text.length >= 3 && CTA_PATTERN.test(text)) {
      hasPurchaseCta = true;
      break;
    }
  }

  return {
    title,
    description,
    canonical,
    robots,
    lang,
    viewport,
    headings,
    jsonLdBlocks,
    imagesWithoutAlt,
    imagesSampled: images.length,
    hasPurchaseCta,
  };
}

export function parseRobotsTxt(
  robotsBody: string,
  pathname: string,
): { robotsTxtOk: boolean; sitemapHint: string | null; pathBlocked: boolean } {
  const lines = robotsBody.split(/\r?\n/);
  let inStarAgent = false;
  const disallows: string[] = [];
  let sitemapHint: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith("user-agent:")) {
      const agent = line.slice("user-agent:".length).trim();
      inStarAgent = agent === "*";
      continue;
    }
    if (!inStarAgent) continue;
    if (lower.startsWith("disallow:")) {
      const path = line.slice("disallow:".length).trim();
      if (path) disallows.push(path);
    }
    if (lower.startsWith("sitemap:") && !sitemapHint) {
      sitemapHint = line.slice("sitemap:".length).trim() || null;
    }
  }

  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const pathBlocked = disallows.some((rule) => {
    if (rule === "/") return true;
    return normalizedPath.startsWith(rule);
  });

  return {
    robotsTxtOk: robotsBody.trim().length > 0,
    sitemapHint,
    pathBlocked,
  };
}

export function robotsNoindex(robots: string | null | undefined): boolean {
  return String(robots ?? "")
    .toLowerCase()
    .includes("noindex");
}
