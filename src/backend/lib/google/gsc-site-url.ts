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
