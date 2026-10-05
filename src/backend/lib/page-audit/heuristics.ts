import { robotsNoindex } from "@/backend/lib/page-audit/html";
import type {
  HtmlSignals,
  PageSpeedSignals,
  SeoAuditBlock,
  SeoFinding,
  SeoModule,
  StoreContextBlock,
} from "@/backend/lib/page-audit/types";
import { SEO_MODULE_DEFS } from "@/backend/lib/page-audit/types";

const SEVERITY_PENALTY = { high: 18, medium: 10, low: 5, info: 2 } as const;

function clampScore(n: number | null): number | null {
  if (n === null || Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function countSummary(findings: SeoFinding[]) {
  const summary = { high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    summary[f.severity] += 1;
  }
  return summary;
}

function healthFromFindings(findings: SeoFinding[]): number | null {
  if (findings.length === 0) {
    return null;
  }
  let score = 100;
  for (const f of findings) {
    score -= SEVERITY_PENALTY[f.severity];
  }
  return clampScore(score);
}

function moduleScores(
  findings: SeoFinding[],
): Map<string, { issueCount: number; passCount: number; score: number | null }> {
  const map = new Map<string, { issueCount: number; passCount: number; score: number | null }>();
  for (const def of SEO_MODULE_DEFS) {
    map.set(def.id, { issueCount: 0, passCount: 0, score: 100 });
  }
  for (const f of findings) {
    const entry = map.get(f.category);
    if (!entry) continue;
    entry.issueCount += 1;
    entry.score = (entry.score ?? 100) - SEVERITY_PENALTY[f.severity];
  }
  for (const def of SEO_MODULE_DEFS) {
    const entry = map.get(def.id);
    if (!entry) continue;
    if (entry.issueCount === 0 && findings.length > 0) {
      entry.passCount = 1;
    }
    entry.score = clampScore(entry.score);
  }
  return map;
}

export function buildSeoAudit(input: {
  html: HtmlSignals | null;
  pagespeed: PageSpeedSignals | null;
  storeContext: StoreContextBlock | null;
}): SeoAuditBlock {
  const findings: SeoFinding[] = [];
  const html = input.html;
  const ps = input.pagespeed;

  if (ps?.performanceScore != null && ps.performanceScore < 50) {
    findings.push({
      id: "LOW_PERFORMANCE",
      severity: "high",
      category: "performance",
      title: "Velocidade de carregamento abaixo do esperado",
      whyItMatters:
        "Core Web Vitals fracos reduzem competitividade orgânica e aumentam abandono antes da oferta.",
      howToFix: [
        "Priorizar LCP e INP no mobile.",
        "Otimizar imagens above-the-fold e adiar scripts não críticos.",
        "Revalidar no PageSpeed após as mudanças.",
      ],
    });
  } else if (ps?.performanceScore != null && ps.performanceScore < 70) {
    findings.push({
      id: "MODERATE_PERFORMANCE",
      severity: "medium",
      category: "performance",
      title: "Performance mobile com margem de melhoria",
      whyItMatters: "Páginas medianas perdem cliques e conversão frente a concorrentes mais rápidos.",
      howToFix: [
        "Revisar peso de JS e CSS bloqueantes.",
        "Comprimir e dimensionar imagens principais.",
      ],
    });
  }

  if (html) {
    if (!html.title) {
      findings.push({
        id: "MISSING_TITLE",
        severity: "high",
        category: "conteudo",
        title: "A página não possui title HTML",
        whyItMatters: "O title define o snippet na busca e a aba do navegador.",
        howToFix: ["Definir um <title> único alinhado à oferta.", "Validar no HTML servido."],
      });
    } else if (html.title.length < 15 || html.title.length > 60) {
      findings.push({
        id: "WEAK_TITLE_LENGTH",
        severity: "low",
        category: "conteudo",
        title: "Title com comprimento fora da faixa recomendada",
        whyItMatters: "Titles truncados ou curtos reduzem clareza na SERP.",
        howToFix: ["Ajustar para ~15–60 caracteres com palavra-chave principal."],
      });
    }

    if (!html.description) {
      findings.push({
        id: "MISSING_META_DESCRIPTION",
        severity: "medium",
        category: "conteudo",
        title: "Meta description ausente",
        whyItMatters: "Sem meta description, o Google escolhe um trecho aleatório na SERP.",
        howToFix: ["Escrever ~120–160 caracteres com benefício e CTA suave."],
      });
    }

    const hasH1 = html.headings.some((h) => h.level === 1);
    if (!hasH1) {
      findings.push({
        id: "MISSING_H1",
        severity: "medium",
        category: "estrutura",
        title: "Nenhum H1 encontrado no HTML",
        whyItMatters: "H1 estrutura a página para buscadores e leitura humana.",
        howToFix: ["Adicionar um H1 único alinhado ao title e à oferta."],
      });
    }

    if (!html.canonical) {
      findings.push({
        id: "MISSING_CANONICAL",
        severity: "medium",
        category: "indexacao",
        title: "Link canonical ausente",
        whyItMatters: "Sem canonical, variantes de URL podem competir entre si.",
        howToFix: ["Definir rel=canonical para a URL preferida."],
      });
    }

    if (robotsNoindex(html.robots)) {
      findings.push({
        id: "ROBOTS_NOINDEX",
        severity: "high",
        category: "indexacao",
        title: "Meta robots indica noindex",
        whyItMatters: "A página pede para não ser indexada.",
        howToFix: ["Remover noindex se a página deve ranquear.", "Confirmar em staging vs produção."],
      });
    }

    if (html.originChecks?.pathBlocked) {
      findings.push({
        id: "ROBOTS_PATH_BLOCKED",
        severity: "high",
        category: "indexacao",
        title: "Caminho bloqueado no robots.txt",
        whyItMatters: "O robots.txt impede rastreamento deste caminho.",
        howToFix: ["Revisar regras Disallow para este path.", "Liberar URLs que devem indexar."],
      });
    }

    if (!html.viewport) {
      findings.push({
        id: "MISSING_VIEWPORT",
        severity: "medium",
        category: "experiencia",
        title: "Meta viewport ausente",
        whyItMatters: "Sem viewport, mobile-first e usabilidade ficam comprometidos.",
        howToFix: ['Incluir <meta name="viewport" content="width=device-width, initial-scale=1">.'],
      });
    }

    if (html.imagesSampled > 0 && html.imagesWithoutAlt / html.imagesSampled > 0.3) {
      findings.push({
        id: "IMAGES_MISSING_ALT",
        severity: "low",
        category: "conteudo",
        title: "Muitas imagens sem texto alternativo",
        whyItMatters: "Alt text ajuda acessibilidade e contexto para busca de imagens.",
        howToFix: ["Preencher alt descritivo nas imagens principais.", "Decorativas podem usar alt vazio."],
      });
    }

    if (html.jsonLdBlocks.length === 0) {
      findings.push({
        id: "MISSING_JSON_LD",
        severity: "medium",
        category: "dados_estruturados",
        title: "Nenhum JSON-LD detectado",
        whyItMatters: "Dados estruturados habilitam rich results e clarificam a oferta.",
        howToFix: ["Adicionar schema Product/Offer ou WebPage conforme o tipo de página."],
      });
    }
  } else {
    findings.push({
      id: "HTML_UNAVAILABLE",
      severity: "info",
      category: "rastreamento",
      title: "HTML da página não pôde ser analisado",
      whyItMatters: "Achados on-page dependem do HTML servido ao crawler.",
      howToFix: ["Verificar se a URL responde 200 e não bloqueia bots.", "Tentar gerar novamente."],
    });
  }

  if (input.storeContext?.gscPosition != null && input.storeContext.gscPosition > 15) {
    findings.push({
      id: "GSC_WEAK_POSITION",
      severity: "low",
      category: "rastreamento",
      title: "Posição média GSC acima de 15",
      whyItMatters: "Posição fraca na loja reduz cliques orgânicos agregados.",
      howToFix: [
        "Corrigir achados on-page desta URL.",
        "Reforçar conteúdo e links internos para páginas estratégicas.",
      ],
    });
  }

  const summary = countSummary(findings);
  const scores = moduleScores(findings);
  const modules: SeoModule[] = SEO_MODULE_DEFS.map((def) => {
    const s = scores.get(def.id)!;
    return {
      id: def.id,
      label: def.label,
      score: s.score,
      issueCount: s.issueCount,
      passCount: s.passCount,
    };
  });

  return {
    healthScore: healthFromFindings(findings),
    modules,
    findings,
    summary,
  };
}
