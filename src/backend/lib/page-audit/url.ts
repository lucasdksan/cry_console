const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
]);

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  return false;
}

function normalizeSiteBase(siteUrl: string): URL {
  const trimmed = siteUrl.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("URL da loja deve usar HTTP ou HTTPS");
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || isPrivateIpv4(host)) {
    throw new Error("URL da loja não pode apontar para endereço local ou privado");
  }
  return url;
}

export function resolveAuditUrl(siteUrl: string, pathInput?: string | null): string {
  const base = normalizeSiteBase(siteUrl);
  const path = (pathInput ?? "").trim();
  if (!path) {
    return base.toString();
  }

  if (/^javascript:/i.test(path) || /^data:/i.test(path)) {
    throw new Error("Caminho inválido");
  }

  if (/^https?:\/\//i.test(path)) {
    const absolute = new URL(path);
    if (absolute.origin !== base.origin) {
      throw new Error("A URL auditada deve pertencer ao mesmo domínio da loja");
    }
    return absolute.toString();
  }

  const relative = path.startsWith("/") ? path : `/${path}`;
  return new URL(relative, base).toString();
}

export function originOfSiteUrl(siteUrl: string): string {
  return normalizeSiteBase(siteUrl).origin;
}
