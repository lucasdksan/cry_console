const SOURCE_FOLDER_LABELS: Record<string, string> = {
  tutorials: "Tutoriais",
  tracks: "Trilhas",
  faq: "FAQ",
  "known-issues": "Problemas conhecidos",
  troubleshooting: "Solução de problemas",
  announcements: "Comunicados",
};

const PATH_SEGMENT_LABELS: Record<string, string> = {
  "admin-vtex": "Admin VTEX",
  "vtex-io": "VTEX IO",
};

export function humanizeHelpCenterSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Ex.: docs/pt/tutorials/admin-vtex/foo.md → Tutoriais > Admin Vtex
 */
export function deriveHelpCenterNavigationFromRepoPath(
  path: string,
): string | null {
  const normalized = path.replace(/\.md$/i, "").trim();
  if (!normalized) {
    return null;
  }
  const parts = normalized.split("/").filter(Boolean);
  const ptIndex = parts.indexOf("pt");
  const rest = ptIndex >= 0 ? parts.slice(ptIndex + 1) : parts;
  if (rest.length <= 1) {
    return null;
  }
  const folders = rest.slice(0, -1);
  if (folders.length === 0) {
    return null;
  }
  return folders
    .map(
      (seg) =>
        SOURCE_FOLDER_LABELS[seg] ??
        PATH_SEGMENT_LABELS[seg] ??
        humanizeHelpCenterSlug(seg),
    )
    .join(" > ");
}

export function firstMarkdownHeadingInText(text: string): string | null {
  const match = text.match(/^#{2,3}\s+(.+)$/m);
  const heading = match?.[1]?.trim();
  return heading || null;
}

export function resolveHelpCenterChunkSection(
  pageSection: string | null | undefined,
  chunkContent: string,
): string | undefined {
  const trail = pageSection?.trim() || "";
  const heading = firstMarkdownHeadingInText(chunkContent);
  const combined = [trail, heading].filter(Boolean).join(" > ");
  return combined || undefined;
}
