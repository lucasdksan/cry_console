export const PILLARS = [
  "aquisicao",
  "comercial",
  "crescimento",
  "estrategica",
  "experiencia",
  "operacional",
] as const;

export type Pillar = (typeof PILLARS)[number];

export const VTEX_COLLECTORS = [
  "orders",
  "category_tree",
  "inventory",
  "checkout",
  "logistics_shipments",
  "pricing",
] as const;

export type VtexCollector = (typeof VTEX_COLLECTORS)[number];

export const PILLAR_REGISTRY: Record<
  Pillar,
  { vtexCollectors: readonly VtexCollector[] }
> = {
  aquisicao: { vtexCollectors: ["orders", "category_tree"] },
  comercial: { vtexCollectors: ["orders", "pricing", "inventory"] },
  crescimento: { vtexCollectors: ["orders", "pricing"] },
  estrategica: { vtexCollectors: ["orders", "category_tree", "pricing"] },
  experiencia: { vtexCollectors: ["orders", "checkout"] },
  operacional: { vtexCollectors: ["orders", "inventory", "logistics_shipments"] },
};

export function requiredVtexCollectors(pillars?: Pillar[]): VtexCollector[] {
  const set = new Set<VtexCollector>();
  const list = pillars?.length ? pillars : [...PILLARS];
  for (const pillar of list) {
    for (const collector of PILLAR_REGISTRY[pillar].vtexCollectors) {
      set.add(collector);
    }
  }
  if (set.size === 0) {
    set.add("orders");
  }
  return [...set];
}

export function defaultCollectorsForInsights(): VtexCollector[] {
  return requiredVtexCollectors([...PILLARS]);
}

export function isVtexCollector(value: string): value is VtexCollector {
  return (VTEX_COLLECTORS as readonly string[]).includes(value);
}
