import { parseHtmlSignals, parseRobotsTxt } from "@/backend/lib/page-audit/html";
import type { HtmlSignals } from "@/backend/lib/page-audit/types";

const HTML_TIMEOUT_MS = 10_000;
const ROBOTS_TIMEOUT_MS = 8_000;

export type FetchHtmlResult =
  | { ok: true; html: string; signals: HtmlSignals }
  | { ok: false; error: string };

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "CryConsolePageAudit/1.0",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPageHtmlSignals(auditUrl: string): Promise<FetchHtmlResult> {
  try {
    const html = await fetchText(auditUrl, HTML_TIMEOUT_MS);
    const parsed = parseHtmlSignals(html);
    const url = new URL(auditUrl);
    let originChecks: HtmlSignals["originChecks"] = null;
    try {
      const robotsUrl = new URL("/robots.txt", url.origin).toString();
      const robotsBody = await fetchText(robotsUrl, ROBOTS_TIMEOUT_MS);
      originChecks = parseRobotsTxt(robotsBody, url.pathname);
    } catch {
      originChecks = {
        robotsTxtOk: false,
        sitemapHint: null,
        pathBlocked: false,
      };
    }
    const signals: HtmlSignals = {
      ...parsed,
      originChecks,
    };
    return { ok: true, html, signals };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar HTML";
    return { ok: false, error: message };
  }
}
