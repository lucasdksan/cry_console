export { VtexClient, validateVtexCredentials, buildVtexBaseUrl } from "@/backend/lib/vtex/client";
export type { VtexClientConfig } from "@/backend/lib/vtex/client";
export { VtexApiError, VtexConfigError } from "@/backend/lib/vtex/errors";
export { runVtexCollect } from "@/backend/lib/vtex/run-collectors";
export type { RunVtexCollectOptions } from "@/backend/lib/vtex/run-collectors";
export {
  mergeVtexCollectorOutputs,
  computeVtexMetrics,
} from "@/backend/lib/vtex/normalize";
export {
  VTEX_COLLECTORS,
  defaultCollectorsForInsights,
  requiredVtexCollectors,
  isVtexCollector,
} from "@/backend/lib/vtex/registry";
export type { VtexCollector, Pillar } from "@/backend/lib/vtex/registry";
export * from "@/backend/lib/vtex/schemas";
export { parseOrder, parseOrderValue, extractOrderBatch } from "@/backend/lib/vtex/parse-order";
