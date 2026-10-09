const ADMIN_CONTEXT_RE =
  /\b(admin(?:\s*vtex)?|myvtex|painel|backoffice|backend da loja)\b/i;

const IO_CONTEXT_RE =
  /\b(vtex\s*io|vtexio|\bio\b|site\s*editor|cms|storefront|app store|apps?\b|tema|theme|workspace dev|link builder)\b/i;

const NAVIGATION_INTENT_RE =
  /\b(como\s+(acesso|acessar|chego|chegar|ir|navego|navegar|encontro|achar|localizo|configuro)|onde\s+(fica|encontro|acho|acesso|configuro)|caminho|menu|navega[cç][aã]o|passo a passo|tutorial|tela|submenu|barra lateral|busca global)\b/i;

const OPERATIONAL_ADMIN_RE =
  /\b(pedido|oms|cat[aá]logo|sku|pre[cç]o|promo[cç][aã]o|frete|pagamento|master\s*data|pol[ií]tica comercial|estoque|seller|marketplace)\b/i;

/** Pergunta provavelmente sobre chegar a uma tela ou fluxo no Admin VTEX ou VTEX IO. */
export function isVtexAdminNavigationQuery(query: string): boolean {
  const text = query.trim();
  if (!text) {
    return false;
  }
  const hasVtex = /\bvtex\b/i.test(text);
  const hasAdminContext = ADMIN_CONTEXT_RE.test(text) || IO_CONTEXT_RE.test(text);
  const hasNavIntent = NAVIGATION_INTENT_RE.test(text);
  const hasOperational = OPERATIONAL_ADMIN_RE.test(text);

  if (hasNavIntent && (hasAdminContext || (hasVtex && hasOperational))) {
    return true;
  }
  if (hasAdminContext && hasOperational) {
    return true;
  }
  return false;
}

export function mentionsVtexIoAdmin(query: string): boolean {
  return IO_CONTEXT_RE.test(query);
}

export function mentionsLegacyOrOperationalAdmin(query: string): boolean {
  return (
    ADMIN_CONTEXT_RE.test(query) ||
    OPERATIONAL_ADMIN_RE.test(query) ||
    (!IO_CONTEXT_RE.test(query) && NAVIGATION_INTENT_RE.test(query))
  );
}

/**
 * Variantes de busca para recuperar tutoriais de navegação no Help Center.
 * A primeira entrada é sempre a pergunta original.
 */
export function buildAskKnowledgeSearchQueries(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  if (!isVtexAdminNavigationQuery(trimmed)) {
    return [trimmed];
  }

  const variants = new Set<string>([trimmed]);
  variants.add(`${trimmed} admin vtex menu navegação tutorial help center`);

  if (mentionsVtexIoAdmin(trimmed)) {
    variants.add(`${trimmed} vtex io admin apps cms site editor storefront`);
    variants.add("vtex io cms site editor admin navegação");
  }

  if (mentionsLegacyOrOperationalAdmin(trimmed)) {
    variants.add(`${trimmed} admin vtex comece aqui navegação menu lateral`);
    variants.add("admin vtex menu de navegação central de informações");
  }

  return [...variants];
}

export const ASK_ADMIN_NAVIGATION_HINT =
  "Quando a pergunta for como chegar, acessar ou configurar algo no Admin VTEX ou no VTEX IO, responda como tutorial de navegação: passos numerados (1., 2., …), do login ou entrada no admin até a tela final, citando menus, seções e botões que apareçam nos trechos. Se couber nos dois ambientes, separe em **Admin VTEX (operacional/legacy)** e **VTEX IO (Apps, CMS/Site Editor)** — não misture caminhos. Use o Caminho no Help Center como breadcrumbs quando existir. Se faltar detalhe nas fontes, diga o que não está documentado em vez de inventar telas.";
