export function normalizePathname(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  try {
    const withProtocol = trimmed.startsWith("http")
      ? trimmed
      : `https://placeholder.local${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
    const parsed = new URL(withProtocol);
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    return path.toLowerCase();
  } catch {
    let path = trimmed.split("?")[0] ?? trimmed;
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    return path.toLowerCase();
  }
}
