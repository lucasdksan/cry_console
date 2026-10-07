import type { SeoChecklistItemStatus } from "@/generated/prisma/client";

export type SeoChecklistGroupId = "indexacao" | "cms" | "mensuracao" | "homologacao";

export type SeoChecklistCatalogItem = {
  key: string;
  group: SeoChecklistGroupId;
  title: string;
  description: string;
};

export const SEO_CHECKLIST_GROUP_LABELS: Record<SeoChecklistGroupId, string> = {
  indexacao: "Indexação e robots",
  cms: "Conteúdo no CMS (FastStore)",
  mensuracao: "Mensuração",
  homologacao: "Homologação",
};

export const SEO_CHECKLIST_CATALOG: SeoChecklistCatalogItem[] = [
  {
    key: "robots_filter_noindex_follow",
    group: "indexacao",
    title: "Filtro: noindex, follow",
    description: "Páginas de filtro devem usar noindex, follow em produção.",
  },
  {
    key: "robots_checkout_noindex_follow",
    group: "indexacao",
    title: "Checkout: noindex, follow",
    description: "Checkout não deve indexar, mas links internos devem ser seguidos.",
  },
  {
    key: "robots_cart_noindex_follow",
    group: "indexacao",
    title: "Carrinho: noindex, follow",
    description: "Carrinho com noindex, follow conforme playbook FastStore.",
  },
  {
    key: "robots_login_noindex_follow",
    group: "indexacao",
    title: "Login: noindex, follow",
    description: "Login e área de conta não indexáveis em produção.",
  },
  {
    key: "pagination_canonical_policy",
    group: "indexacao",
    title: "Canonical de paginação",
    description: "Paginações indexáveis com canonical própria (não apontar tudo para página 1).",
  },
  {
    key: "cms_editable_h1",
    group: "cms",
    title: "H1 editável no CMS",
    description: "Campo editorial (seoH1/h1) sem alterar nome de categoria no catálogo.",
  },
  {
    key: "cms_category_faq",
    group: "cms",
    title: "FAQ abaixo da vitrine",
    description: "Section de FAQ com pares pergunta/resposta renderizados no HTML inicial.",
  },
  {
    key: "cms_category_body",
    group: "cms",
    title: "Texto de categoria (≥2.000 caracteres)",
    description: "Conteúdo editorial abaixo da vitrine; “ver mais” só visual, texto completo no DOM.",
  },
  {
    key: "cms_rich_text_sanitize",
    group: "cms",
    title: "HTML/Markdown sanitizado",
    description: "FAQ e texto de categoria com tags permitidas e sem script arbitrário.",
  },
  {
    key: "ga4_preserved",
    group: "mensuracao",
    title: "GA4 / GTM preservados",
    description: "Mesma propriedade, eventos de funil e consentimento após migração.",
  },
  {
    key: "gsc_verification",
    group: "mensuracao",
    title: "Google Search Console verificado",
    description: "Método de verificação (meta tag, DNS ou arquivo) mantido no go-live.",
  },
  {
    key: "hml_robots_block_all",
    group: "homologacao",
    title: "robots.txt de HML bloqueia bots",
    description: "Homologação com Disallow global e noindex em todas as páginas.",
  },
];

export type SeoChecklistItemDTO = {
  key: string;
  group: SeoChecklistGroupId;
  groupLabel: string;
  title: string;
  description: string;
  status: SeoChecklistItemStatus;
};

export function mergeChecklistWithCatalog(
  stored: ReadonlyArray<{ itemKey: string; status: SeoChecklistItemStatus }>,
): SeoChecklistItemDTO[] {
  const byKey = new Map(stored.map((s) => [s.itemKey, s.status]));
  return SEO_CHECKLIST_CATALOG.map((item) => ({
    key: item.key,
    group: item.group,
    groupLabel: SEO_CHECKLIST_GROUP_LABELS[item.group],
    title: item.title,
    description: item.description,
    status: byKey.get(item.key) ?? "pending",
  }));
}

export function isValidChecklistItemKey(key: string): boolean {
  return SEO_CHECKLIST_CATALOG.some((c) => c.key === key);
}
