export interface AnalyticsNormalized {
  totals?: {
    sessions?: number;
    totalUsers?: number;
    ecommercePurchases?: number;
    purchaseRevenue?: number;
    addToCarts?: number;
    checkouts?: number;
    itemViewEvents?: number;
  };
  funnel_rates?: {
    view_to_cart_pct?: number;
    cart_to_checkout_pct?: number;
    checkout_to_purchase_pct?: number;
    session_to_purchase_pct?: number;
  };
  channels?: Array<{ channel: string; sessions: number; conversion_pct: number; revenue: number }>;
  devices?: Array<{ device: string; sessions: number; share_pct: number }>;
  comparison?: {
    variacao_receita_pct?: number;
    variacao_pedidos_pct?: number;
    receita_atual?: number;
    receita_anterior?: number;
  };
}

export interface ClarityNormalized {
  sessions?: number;
  deadClicks?: number;
  quickBacks?: number;
  devices?: Array<{ device: string; sessions: number; share_pct: number }>;
  top_rage_pages?: Array<{ url: string; rage_clicks: number }>;
}

export interface SearchConsoleNormalized {
  overview?: { clicks: number; impressions: number; ctr: number; position: number };
  top_queries?: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  striking_distance?: Array<{ query: string; impressions: number; position: number; ctr: number }>;
  brand_ctr?: number;
}

export interface PeriodComparison {
  receita_periodo1?: number;
  receita_periodo2?: number;
  pedidos_periodo1?: number;
  pedidos_periodo2?: number;
  ticket_medio?: number;
  variacao_receita_pct?: number;
  variacao_pedidos_pct?: number;
  period1_label?: string;
  period2_label?: string;
}

function pctBetween(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function pickChannelPeriod(data: Record<string, unknown>): unknown[] {
  if (Array.isArray(data.channels)) return data.channels;
  const channelsByPeriod = asRecord(data.channels_by_period);
  for (const key of Object.keys(channelsByPeriod).sort().reverse()) {
    const value = channelsByPeriod[key];
    if (Array.isArray(value) && value.length) return value;
  }
  return [];
}

function pickFunnelTotal(data: Record<string, unknown>): Record<string, unknown> {
  const funnel = asRecord(data.funnel);
  if (funnel.view_item !== undefined || funnel.add_to_cart !== undefined) return funnel;
  // accept formats like funnel_aug2026, funnel_aug2026.total, etc.
  for (const key of Object.keys(data)) {
    if (key.toLowerCase().startsWith("funnel")) {
      const candidate = asRecord(data[key]);
      if (candidate.total && typeof candidate.total === "object") return asRecord(candidate.total);
      if (candidate.view_item !== undefined || candidate.add_to_cart !== undefined) return candidate;
    }
  }
  return {};
}

function pickTotals(data: Record<string, unknown>): Record<string, unknown> {
  const totals = asRecord(data.totals);
  if (totals.sessions !== undefined) return totals;
  for (const key of Object.keys(data)) {
    if (key.toLowerCase().startsWith("totals")) {
      const candidate = asRecord(data[key]);
      if (candidate.sessions !== undefined) return candidate;
    }
  }
  return {};
}

function pickDevices(data: Record<string, unknown>): Array<{ device: string; sessions: number; share_pct: number }> | undefined {
  if (Array.isArray(data.devices)) {
    return data.devices.map((row) => {
      const d = asRecord(row);
      return {
        device: String(d.device ?? ""),
        sessions: Number(d.sessions ?? 0),
        share_pct: Number(d.share_pct ?? d.share_pct_sessions ?? 0),
      };
    });
  }
  for (const key of Object.keys(data)) {
    if (key.toLowerCase().startsWith("devices")) {
      const value = data[key];
      if (Array.isArray(value)) {
        return value.map((row) => {
          const d = asRecord(row);
          return {
            device: String(d.device ?? ""),
            sessions: Number(d.sessions ?? 0),
            share_pct: Number(d.share_pct ?? d.share_pct_sessions ?? 0),
          };
        });
      }
    }
  }
  return undefined;
}

function computePeriodComparison(data: Record<string, unknown>): AnalyticsNormalized["comparison"] | undefined {
  const comparison = asRecord(data.comparison);
  if (comparison.variacao_receita_pct !== undefined || comparison.receita_periodo1 !== undefined) {
    return comparison as AnalyticsNormalized["comparison"];
  }
  const comparisonRaw = asRecord(data.comparison_july_2026);
  if (comparisonRaw.variacao_receita_pct !== undefined) {
    return {
      variacao_receita_pct: Number(comparisonRaw.variacao_receita_pct),
      variacao_pedidos_pct: Number(comparisonRaw.variacao_compras_pct ?? comparisonRaw.variacao_pedidos_pct),
      receita_atual: Number(comparisonRaw.purchaseRevenue ?? comparisonRaw.receita),
      receita_anterior: Number(comparisonRaw.receita_anterior ?? 0),
    };
  }

  // Compare totals_aug2026 vs totals_jul2026 when both exist
  const totalsByMonth = new Map<string, Record<string, unknown>>();
  for (const key of Object.keys(data)) {
    if (key.toLowerCase().startsWith("totals")) {
      const candidate = asRecord(data[key]);
      if (candidate.sessions !== undefined) {
        totalsByMonth.set(key.toLowerCase(), candidate);
      }
    }
  }
  const augKey = [...totalsByMonth.keys()].find((k) => k.includes("aug"));
  const julKey = [...totalsByMonth.keys()].find((k) => k.includes("jul"));
  if (augKey && julKey) {
    const aug = totalsByMonth.get(augKey)!;
    const jul = totalsByMonth.get(julKey)!;
    const receitaAtual = Number(aug.purchaseRevenue ?? 0);
    const receitaAnterior = Number(jul.purchaseRevenue ?? 0);
    if (receitaAnterior > 0) {
      return {
        receita_atual: receitaAtual,
        receita_anterior: receitaAnterior,
        variacao_receita_pct: ((receitaAtual - receitaAnterior) / receitaAnterior) * 100,
        variacao_pedidos_pct: 0,
      };
    }
  }

  // Fallback: compare revenue from channels_by_period Aug vs Jul
  const channelsByPeriod = asRecord(data.channels_by_period);
  const augChannels = Array.isArray(channelsByPeriod.Aug2026) ? (channelsByPeriod.Aug2026 as Array<Record<string, unknown>>) : [];
  const julChannels = Array.isArray(channelsByPeriod.Jul2026) ? (channelsByPeriod.Jul2026 as Array<Record<string, unknown>>) : [];
  if (augChannels.length && julChannels.length) {
    const receitaAtual = augChannels.reduce((sum, ch) => sum + Number(ch.purchaseRevenue ?? 0), 0);
    const receitaAnterior = julChannels.reduce((sum, ch) => sum + Number(ch.purchaseRevenue ?? 0), 0);
    if (receitaAnterior > 0) {
      return {
        receita_atual: receitaAtual,
        receita_anterior: receitaAnterior,
        variacao_receita_pct: ((receitaAtual - receitaAnterior) / receitaAnterior) * 100,
        variacao_pedidos_pct: 0,
      };
    }
  }
  return undefined;
}

export function adaptAnalytics(raw: unknown): AnalyticsNormalized | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  // If already normalized, preserve it and just backfill totals.
  const existing = data as AnalyticsNormalized;
  if (existing.funnel_rates?.view_to_cart_pct !== undefined) {
    return {
      ...existing,
      totals: existing.totals ?? pickTotals(data),
    };
  }

  const totalsRaw = pickTotals(data);
  const funnelRaw = pickFunnelTotal(data);

  const sessions = Number(totalsRaw.sessions ?? 0);
  const viewItem = Number(funnelRaw.view_item ?? totalsRaw.itemViewEvents ?? 0);
  const addToCart = Number(funnelRaw.add_to_cart ?? totalsRaw.addToCarts ?? 0);
  const beginCheckout = Number(funnelRaw.begin_checkout ?? totalsRaw.checkouts ?? 0);
  const purchase = Number(funnelRaw.purchase ?? totalsRaw.ecommercePurchases ?? 0);

  const convRateRaw = totalsRaw.taxa_conversao_sessao ?? totalsRaw.session_to_purchase_pct;
  let sessionToPurchase = Number(convRateRaw ?? 0);
  if (sessionToPurchase > 0 && sessionToPurchase <= 1) sessionToPurchase *= 100;
  if (!sessionToPurchase && sessions > 0 && purchase > 0) {
    sessionToPurchase = pctBetween(purchase, sessions);
  }

  let totalUsers = Number(totalsRaw.activeUsers ?? totalsRaw.totalUsers ?? 0);
  const channelsRaw = pickChannelPeriod(data);
  const channels = channelsRaw.map((row) => {
    const ch = asRecord(row);
    let conv = Number(ch.conversion_pct ?? ch.conv_rate ?? 0);
    if (conv > 0 && conv <= 1) conv *= 100;
    return {
      channel: String(ch.channel ?? ""),
      sessions: Number(ch.sessions ?? 0),
      conversion_pct: conv,
      revenue: Number(ch.revenue ?? ch.purchaseRevenue ?? 0),
    };
  });
  if (!totalUsers && channels.length) {
    totalUsers = channels.reduce((sum, ch) => sum + ch.sessions, 0);
  }

  const devices = pickDevices(data);

  return {
    totals: {
      sessions,
      totalUsers,
      ecommercePurchases: purchase,
      purchaseRevenue: Number(totalsRaw.purchaseRevenue ?? 0),
      addToCarts: addToCart,
      checkouts: beginCheckout,
      itemViewEvents: viewItem,
    },
    funnel_rates: {
      view_to_cart_pct: pctBetween(addToCart, viewItem),
      cart_to_checkout_pct: pctBetween(beginCheckout, addToCart),
      checkout_to_purchase_pct: pctBetween(purchase, beginCheckout),
      session_to_purchase_pct: sessionToPurchase,
    },
    channels,
    devices,
    comparison: computePeriodComparison(data),
  };
}

export function adaptClarity(raw: unknown): ClarityNormalized | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const existing = data as ClarityNormalized;
  if (existing.deadClicks !== undefined && (existing.sessions !== undefined || existing.devices !== undefined)) return existing;

  const sessions = Number(data.sessions ?? 0);
  const deadClicks = Number(data.dead_clicks ?? data.deadClicks ?? 0);
  const quickBacks = Number(data.quick_backs ?? data.quickBacks ?? 0);
  const topRageRaw = Array.isArray(data.top_rage_pages) ? data.top_rage_pages : [];
  const top_rage_pages = topRageRaw.map((row) => {
    const r = asRecord(row);
    return { url: String(r.url ?? ""), rage_clicks: Number(r.rage_clicks ?? 0) };
  });

  const devicesRaw = Array.isArray(data.devices) ? data.devices : [];
  const devices = devicesRaw.length
    ? devicesRaw.map((row) => {
        const d = asRecord(row);
        return { device: String(d.device ?? ""), sessions: Number(d.sessions ?? 0), share_pct: Number(d.share_pct ?? 0) };
      })
    : existing.devices;

  return { sessions, deadClicks, quickBacks, devices, top_rage_pages };
}

export function adaptSearchConsole(raw: unknown): SearchConsoleNormalized | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const existing = data as SearchConsoleNormalized;

  // New format: overview + query_comparison_aug_vs_jul
  const overview = asRecord(data.overview);
  const overviewOk = overview.clicks !== undefined;
  const queryComparison = Array.isArray(data.query_comparison_aug_vs_jul)
    ? (data.query_comparison_aug_vs_jul as Array<Record<string, unknown>>)
    : [];
  const gscRows = Array.isArray(data.rows)
    ? (data.rows as Array<Record<string, unknown>>)
    : [];

  if (overviewOk || queryComparison.length || gscRows.length) {
    let top_queries = queryComparison.map((row) => {
      const clicks = Number(row.aug_clicks ?? row.clicks ?? 0);
      const ctr = Number(row.aug_ctr ?? row.ctr ?? 0);
      const impressions = Number(row.aug_impressions ?? row.impressions ?? (ctr > 0 ? clicks / ctr : 0));
      return {
        query: String(row.query ?? ""),
        clicks,
        impressions: Math.round(impressions),
        ctr,
        position: Number(row.aug_position ?? row.position ?? 0),
      };
    });

    if (!top_queries.length && gscRows.length) {
      top_queries = gscRows.map((row) => {
        const keys = Array.isArray(row.keys) ? row.keys : [];
        return {
          query: String(keys[0] ?? row.query ?? ""),
          clicks: Number(row.clicks ?? 0),
          impressions: Number(row.impressions ?? 0),
          ctr: Number(row.ctr ?? 0),
          position: Number(row.position ?? 0),
        };
      });
    }

    let striking_distance = queryComparison
      .filter((row) => {
        const pos = Number(row.aug_position ?? row.position ?? 0);
        return pos >= 4 && pos <= 10;
      })
      .map((row) => {
        const clicks = Number(row.aug_clicks ?? row.clicks ?? 0);
        const ctr = Number(row.aug_ctr ?? row.ctr ?? 0);
        const impressions = Number(row.aug_impressions ?? row.impressions ?? (ctr >  0 ? clicks / ctr : 0));
        return {
          query: String(row.query ?? ""),
          impressions: Math.round(impressions),
          position: Number(row.aug_position ?? row.position ?? 0),
          ctr,
        };
      });

    if (!striking_distance.length) {
      striking_distance = top_queries
        .filter((row) => row.position >= 4 && row.position <= 10)
        .map(({ query, impressions, position, ctr }) => ({
          query,
          impressions,
          position,
          ctr,
        }));
    }

    const brandKeyword = String(data.brandKeyword ?? "").toLowerCase();
    const brandRowFromKeyword = brandKeyword
      ? top_queries.find((row) => row.query.toLowerCase().includes(brandKeyword))
      : undefined;
    const brandRowLegacy = queryComparison.find((row) => {
      const q = String(row.query ?? "").toLowerCase();
      return q.includes("clovis");
    });
    const brand_ctr = brandRowFromKeyword
      ? brandRowFromKeyword.ctr
      : brandRowLegacy
        ? Number(brandRowLegacy.aug_ctr ?? brandRowLegacy.ctr ?? 0)
        : undefined;

    return {
      overview: overviewOk
        ? {
            clicks: Number(overview.clicks),
            impressions: Number(overview.impressions),
            ctr: Number(overview.ctr),
            position: Number(overview.position),
          }
        : undefined,
      top_queries: top_queries.length ? top_queries : existing.top_queries,
      striking_distance: striking_distance.length
        ? striking_distance
        : existing.striking_distance,
      brand_ctr,
    };
  }

  if (!existing.top_queries?.length && !existing.striking_distance?.length) return null;
  return existing;
}

export function normalizePeriodComparison(raw: unknown): PeriodComparison | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;

  if (c.receita_periodo1 !== undefined || c.variacao_receita_pct !== undefined) {
    return c as PeriodComparison;
  }

  const receita = asRecord(c.receita);
  const compras = asRecord(c.compras ?? c.pedidos);
  const receitaGa4 = asRecord(c.receita_ga4);

  if (receita.atual !== undefined) {
    const pedidosAtual = Number(compras.atual ?? 0);
    const pedidosAnterior = Number(compras.anterior ?? 0);
    const receitaAtual = Number(receita.atual ?? 0);
    const receitaAnterior = Number(receita.anterior ?? 0);
    return {
      receita_periodo1: receitaAtual,
      receita_periodo2: receitaAnterior,
      pedidos_periodo1: pedidosAtual,
      pedidos_periodo2: pedidosAnterior,
      ticket_medio: pedidosAtual > 0 ? receitaAtual / pedidosAtual : undefined,
      variacao_receita_pct: Number(receita.variacao_pct ?? 0),
      variacao_pedidos_pct: Number(compras.variacao_pct ?? 0),
      period1_label: String(c.period1 ?? ""),
      period2_label: String(c.period2 ?? ""),
    };
  }

  if (receitaGa4.agosto !== undefined) {
    return {
      receita_periodo1: Number(receitaGa4.agosto),
      receita_periodo2: Number(receitaGa4.julho),
      variacao_receita_pct: Number(receitaGa4.variacao_pct ?? 0),
      variacao_pedidos_pct: Number(asRecord(c.compras_ga4).variacao_pct ?? 0),
    };
  }

  return null;
}

export function hasNormalizedPayload(raw: unknown): boolean {
  if (raw === null || raw === undefined) return false;
  if (typeof raw !== "object") return false;
  return Object.keys(raw as object).length > 0;
}
