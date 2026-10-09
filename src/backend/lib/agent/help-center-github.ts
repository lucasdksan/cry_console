import { humanizeHelpCenterSlug } from "@/backend/lib/agent/help-center-section";
import type {
  HelpCenterDiscoveredLink,
  HelpCenterSource,
} from "@/backend/lib/agent/help-center-types";

const REPO_TREE_URL =
  "https://api.github.com/repos/vtexdocs/help-center-content/git/trees/main?recursive=1";

/** Fontes com markdown em docs/pt/ no repositório oficial. */
export const HELP_CENTER_GITHUB_SOURCES: HelpCenterSource[] = [
  "tutorials",
  "tracks",
  "faq",
  "troubleshooting",
  "announcements",
];

let cachedMarkdownPaths: string[] | null = null;

export function resetHelpCenterGitHubTreeCacheForTests(): void {
  cachedMarkdownPaths = null;
}

async function fetchMarkdownPathsFromGitHub(): Promise<string[]> {
  if (cachedMarkdownPaths) {
    return cachedMarkdownPaths;
  }

  const response = await fetch(REPO_TREE_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "cry-console-vtex-help-indexer",
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub tree (${response.status}): não foi possível listar help-center-content.`,
    );
  }

  const json = (await response.json()) as {
    tree?: { path?: string; type?: string }[];
  };

  cachedMarkdownPaths =
    json.tree
      ?.filter((entry) => entry.type === "blob" && entry.path?.endsWith(".md"))
      .map((entry) => entry.path!)
      .filter(Boolean) ?? [];

  return cachedMarkdownPaths;
}

export function helpCenterRepoPathToLink(
  repoPath: string,
): HelpCenterDiscoveredLink | null {
  if (!repoPath.startsWith("docs/pt/") || !repoPath.endsWith(".md")) {
    return null;
  }

  const slug = repoPath.split("/").pop()?.replace(/\.md$/i, "") ?? "";
  if (!slug) {
    return null;
  }

  const label = humanizeHelpCenterSlug(slug);
  const base = "https://help.vtex.com";

  if (repoPath.startsWith("docs/pt/tutorials/")) {
    return {
      url: `${base}/pt/docs/tutorials/${slug}`,
      label,
      source: "tutorials",
    };
  }
  if (repoPath.startsWith("docs/pt/tracks/")) {
    return {
      url: `${base}/pt/docs/tracks/${slug}`,
      label,
      source: "tracks",
    };
  }
  if (repoPath.startsWith("docs/pt/faq/")) {
    return {
      url: `${base}/pt/faq/${slug}`,
      label,
      source: "faq",
    };
  }
  if (repoPath.startsWith("docs/pt/troubleshooting/")) {
    return {
      url: `${base}/pt/troubleshooting/${slug}`,
      label,
      source: "troubleshooting",
    };
  }
  if (repoPath.startsWith("docs/pt/announcements/")) {
    return {
      url: `${base}/pt/announcements/${slug}`,
      label,
      source: "announcements",
    };
  }

  return null;
}

export async function discoverHelpCenterLinksFromGitHub(
  sources: HelpCenterSource[],
): Promise<HelpCenterDiscoveredLink[]> {
  const wanted = new Set(sources);
  const paths = await fetchMarkdownPathsFromGitHub();
  const merged = new Map<string, HelpCenterDiscoveredLink>();

  for (const path of paths) {
    const link = helpCenterRepoPathToLink(path);
    if (!link || !wanted.has(link.source)) {
      continue;
    }
    merged.set(link.url, link);
  }

  return [...merged.values()];
}
