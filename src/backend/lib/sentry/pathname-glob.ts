export type PageType = "home" | "pdp" | "plp";

export type PathPattern = {
  pageType: PageType;
  pathnameGlob: string;
};

const GLOB_SEGMENT = "[^/]+";

export function normalizePathname(pathname: string): string {
  if (!pathname.startsWith("/")) {
    return `/${pathname}`;
  }
  return pathname.replace(/\/+$/, "") || "/";
}

export function validatePathnameGlob(glob: string): string | null {
  const trimmed = glob.trim();
  if (!trimmed) {
    return "Informe um pathname.";
  }
  if (!trimmed.startsWith("/")) {
    return "O pathname deve começar com /.";
  }
  if (trimmed.includes("?") || trimmed.includes("#")) {
    return "Use apenas pathname, sem query ou hash.";
  }
  if (/[\\[\]{}()]/.test(trimmed)) {
    return "Use apenas *, ** e segmentos literais.";
  }
  return null;
}

function globToRegExp(glob: string): RegExp {
  const normalized = normalizePathname(glob);
  let pattern = "^";
  let i = 0;
  while (i < normalized.length) {
    if (normalized[i] === "*" && normalized[i + 1] === "*") {
      pattern += ".*";
      i += 2;
      continue;
    }
    if (normalized[i] === "*") {
      pattern += GLOB_SEGMENT;
      i += 1;
      continue;
    }
    const char = normalized[i];
    if (/[.+^${}()|[\]\\]/.test(char)) {
      pattern += `\\${char}`;
    } else {
      pattern += char;
    }
    i += 1;
  }
  pattern += "$";
  return new RegExp(pattern);
}

export function matchPageType(
  pathname: string,
  patterns: PathPattern[],
): PageType | null {
  const path = normalizePathname(pathname);
  for (const pattern of patterns) {
    const re = globToRegExp(pattern.pathnameGlob);
    if (re.test(path)) {
      return pattern.pageType;
    }
  }
  return null;
}

export function pathnameMatchesAnyPattern(
  pathname: string,
  patterns: PathPattern[],
): boolean {
  return matchPageType(pathname, patterns) !== null;
}
