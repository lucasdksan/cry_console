import { jsonLdHasType } from "@/backend/lib/page-audit/json-ld";
import { robotsNoindex } from "@/backend/lib/page-audit/html";
import type { HtmlSignals, SeoFinding } from "@/backend/lib/page-audit/types";
import type { PageAuditRoleId } from "@/backend/lib/page-audit/roles";

function pushFinding(findings: SeoFinding[], finding: SeoFinding): void {
  if (findings.some((f) => f.id === finding.id)) return;
  findings.push(finding);
}

function isAbsoluteUrl(url: string | null): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url.trim());
}

export function applyRoleSeoRules(input: {
  role: PageAuditRoleId;
  html: HtmlSignals | null;
  findings: SeoFinding[];
}): void {
  const { role, html, findings } = input;
  if (!html) return;

  if (html.canonicalCount > 1) {
    pushFinding(findings, {
      id: "DUPLICATE_CANONICAL",
      severity: "high",
      category: "indexacao",
      title: "Múltiplas tags canonical na página",
      whyItMatters: "Mais de uma canonical confunde mecanismos de busca sobre a URL preferida.",
      howToFix: ["Manter apenas uma rel=canonical por página.", "Validar no HTML final servido."],
    });
  }

  if (html.canonical && !isAbsoluteUrl(html.canonical)) {
    pushFinding(findings, {
      id: "CANONICAL_NOT_ABSOLUTE",
      severity: "medium",
      category: "indexacao",
      title: "Canonical não é URL absoluta",
      whyItMatters: "URLs relativas em canonical podem ser interpretadas de forma inconsistente.",
      howToFix: ["Usar URL absoluta com protocolo e domínio de produção."],
    });
  }

  const noindex = robotsNoindex(html.robots);
  const shouldIndex = role === "home" || role === "category" || role === "product";

  if (role === "search" && !noindex) {
    pushFinding(findings, {
      id: "SEARCH_SHOULD_NOINDEX",
      severity: "high",
      category: "indexacao",
      title: "Página de busca deveria usar noindex",
      whyItMatters: "Resultados de busca interna geram URLs finas e duplicadas na indexação.",
      howToFix: ['Configurar meta robots "noindex, follow" para busca em produção.'],
    });
  }

  if (shouldIndex && noindex) {
    return;
  }

  if (role === "home") {
    if (!jsonLdHasType(html.jsonLdBlocks, "Organization")) {
      pushFinding(findings, {
        id: "HOME_MISSING_ORGANIZATION",
        severity: "low",
        category: "dados_estruturados",
        title: "JSON-LD Organization ausente na home",
        whyItMatters: "Organization reforça entidade da marca nos rich results.",
        howToFix: ["Implementar schema Organization consistente com a marca."],
      });
    }
    if (!jsonLdHasType(html.jsonLdBlocks, "WebSite")) {
      pushFinding(findings, {
        id: "HOME_MISSING_WEBSITE",
        severity: "low",
        category: "dados_estruturados",
        title: "JSON-LD WebSite ausente na home",
        whyItMatters: "WebSite identifica o site como entidade própria.",
        howToFix: ["Adicionar WebSite vinculado à Organization quando aplicável."],
      });
    }
  }

  if (role === "category") {
    if (!jsonLdHasType(html.jsonLdBlocks, "ItemList") && !jsonLdHasType(html.jsonLdBlocks, "BreadcrumbList")) {
      pushFinding(findings, {
        id: "CATEGORY_WEAK_STRUCTURED",
        severity: "medium",
        category: "dados_estruturados",
        title: "Categoria sem ItemList ou BreadcrumbList",
        whyItMatters: "Listagens se beneficiam de schema de lista ou trilha de navegação.",
        howToFix: ["Adicionar BreadcrumbList alinhado ao visual.", "Usar ItemList para a vitrine quando fizer sentido."],
      });
    }
    if (!html.hasVisibleBreadcrumb) {
      pushFinding(findings, {
        id: "CATEGORY_MISSING_BREADCRUMB",
        severity: "medium",
        category: "estrutura",
        title: "Breadcrumb visual não detectado",
        whyItMatters: "Breadcrumb ajuda usuários e reforça hierarquia para buscadores.",
        howToFix: ["Exibir breadcrumb com links <a> no HTML inicial.", "Espelhar níveis no BreadcrumbList."],
      });
    }
    if (html.anchorLinkCount < 3) {
      pushFinding(findings, {
        id: "CATEGORY_FEW_INTERNAL_LINKS",
        severity: "low",
        category: "links",
        title: "Poucos links internos detectados no HTML",
        whyItMatters: "Vitrine e navegação devem expor links rastreáveis sem depender só de JS.",
        howToFix: ["Garantir links <a href> para produtos e categorias no HTML servido."],
      });
    }
  }

  if (role === "product") {
    if (!jsonLdHasType(html.jsonLdBlocks, "Product")) {
      pushFinding(findings, {
        id: "PRODUCT_MISSING_SCHEMA",
        severity: "high",
        category: "dados_estruturados",
        title: "JSON-LD Product ausente na PDP",
        whyItMatters: "Product/Offer habilitam rich results de produto.",
        howToFix: ["Implementar Product com Offer, preço e disponibilidade reais."],
      });
    }
    if (!html.hasVisibleBreadcrumb) {
      pushFinding(findings, {
        id: "PRODUCT_MISSING_BREADCRUMB",
        severity: "medium",
        category: "estrutura",
        title: "Breadcrumb visual não detectado na PDP",
        whyItMatters: "Trilha de navegação clarifica hierarquia produto → categoria.",
        howToFix: ["Renderizar breadcrumb com links intermediários no HTML inicial."],
      });
    }
  }
}
