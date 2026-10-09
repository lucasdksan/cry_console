import { createHash } from "node:crypto";

import { resolveHelpCenterChunkSection } from "@/backend/lib/agent/help-center-section";
import type {
  HelpCenterChunk,
  HelpCenterPageDocument,
  HelpCenterSource,
} from "@/backend/lib/agent/help-center-types";

export {
  deriveHelpCenterNavigationFromRepoPath,
  firstMarkdownHeadingInText,
  humanizeHelpCenterSlug,
  resolveHelpCenterChunkSection,
} from "@/backend/lib/agent/help-center-section";

const DEFAULT_MAX_CHARS = 1800;

export function helpCenterChunkId(input: {
  url: string;
  title: string;
  index: number;
}): string {
  const raw = `${input.url}\0${input.title}\0${input.index}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function splitOversizedBlock(text: string, maxChars: number): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) {
    return trimmed ? [trimmed] : [];
  }
  const parts: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    let end = Math.min(start + maxChars, trimmed.length);
    if (end < trimmed.length) {
      const slice = trimmed.slice(start, end);
      const lastBreak = Math.max(
        slice.lastIndexOf("\n\n"),
        slice.lastIndexOf(". "),
        slice.lastIndexOf(" "),
      );
      if (lastBreak > maxChars * 0.5) {
        end = start + lastBreak + 1;
      }
    }
    const piece = trimmed.slice(start, end).trim();
    if (piece) {
      parts.push(piece);
    }
    start = end;
  }
  return parts;
}

/**
 * Divide o texto por cabeçalios markdown (## / ###) e limita o tamanho de cada chunk.
 */
export function chunkHelpCenterPageText(
  text: string,
  maxChars = DEFAULT_MAX_CHARS,
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const sections = normalized.split(/(?=^#{2,3}\s)/m);
  const chunks: string[] = [];

  for (const section of sections) {
    const blocks = splitOversizedBlock(section, maxChars);
    chunks.push(...blocks);
  }

  return chunks.filter(Boolean);
}

export function buildHelpCenterChunksFromPage(
  page: HelpCenterPageDocument,
  maxChars = DEFAULT_MAX_CHARS,
): HelpCenterChunk[] {
  const pieces = chunkHelpCenterPageText(page.text, maxChars);
  if (pieces.length === 0) {
    return [];
  }

  return pieces.map((content, index) => ({
    id: helpCenterChunkId({ url: page.url, title: page.title, index }),
    url: page.url,
    title: page.title,
    section: resolveHelpCenterChunkSection(page.section, content),
    content,
    source: page.source,
  }));
}

export function inferHelpCenterSourceFromUrl(url: string): HelpCenterSource {
  const path = new URL(url).pathname;
  if (path.includes("/docs/tutorials")) {
    return "tutorials";
  }
  if (path.includes("/docs/tracks")) {
    return "tracks";
  }
  if (path.startsWith("/pt/faq") || path.includes("/faq/")) {
    return "faq";
  }
  if (path.includes("known-issues")) {
    return "known-issues";
  }
  if (path.includes("troubleshooting")) {
    return "troubleshooting";
  }
  if (path.includes("announcements")) {
    return "announcements";
  }
  return "tutorials";
}
