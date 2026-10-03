const USABLE_GSC_PERMISSIONS = new Set([
  "siteOwner",
  "siteFullUser",
  "siteRestrictedUser",
]);

export type GscSiteEntry = {
  siteUrl?: string;
  permissionLevel?: string;
};

/** Normaliza a URL do site para o formato comum de propriedade URL-prefix no GSC. */
export function normalizeGscSiteUrl(siteUrl: string): string {
  const url = new URL(siteUrl);
  const host = url.hostname.toLowerCase();
  const path =
    !url.pathname || url.pathname === "/"
      ? "/"
      : url.pathname.endsWith("/")
        ? url.pathname
        : `${url.pathname}/`;
  return `${url.protocol}//${host}${path}`;
}

function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function hostOfSite(siteUrl: string): string | null {
  const trimmed = siteUrl.trim();
  if (trimmed.toLowerCase().startsWith("sc-domain:")) {
    const host = trimmed.slice("sc-domain:".length).trim().toLowerCase();
    return host || null;
  }
  try {
    return new URL(trimmed).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Escolhe a propriedade do Search Console que a credencial realmente pode ler.
 * Propriedade de domínio (`sc-domain:`) cobre o host mesmo quando a URL da loja
 * é um prefixo `https://` sem permissão direta.
 */
export function pickGscSiteUrl(
  requested: string,
  sites: GscSiteEntry[],
): string | null {
  const available = sites
    .map((site) => ({
      siteUrl: site.siteUrl?.trim() ?? "",
      permissionLevel: site.permissionLevel ?? "",
    }))
    .filter(
      (site) =>
        site.siteUrl.length > 0 &&
        USABLE_GSC_PERMISSIONS.has(site.permissionLevel),
    );

  const exact = available.find((site) => site.siteUrl === requested);
  if (exact) return exact.siteUrl;

  const host = hostOfSite(requested);
  if (!host) return null;
  const bare = bareHost(host);

  const domain = available.find(
    (site) => site.siteUrl.toLowerCase() === `sc-domain:${bare}`,
  );
  if (domain) return domain.siteUrl;

  const prefixes = available.filter((site) => {
    if (site.siteUrl.toLowerCase().startsWith("sc-domain:")) return false;
    try {
      const url = new URL(site.siteUrl);
      const siteHost = url.hostname.toLowerCase();
      const isRoot = url.pathname === "/" || url.pathname === "";
      return isRoot && bareHost(siteHost) === bare;
    } catch {
      return false;
    }
  });

  return (
    prefixes.find((site) => site.siteUrl === `https://www.${bare}/`)?.siteUrl ??
    prefixes.find((site) => site.siteUrl === `https://${bare}/`)?.siteUrl ??
    prefixes.find((site) => site.siteUrl.startsWith("https://"))?.siteUrl ??
    prefixes[0]?.siteUrl ??
    null
  );
}
