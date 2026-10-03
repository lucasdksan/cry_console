import { z } from "zod";

export const dateOrDatetime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T[\d:.+-Z]+)?$/);

export const vtexPeriodSchema = z.object({
  start: dateOrDatetime,
  end: dateOrDatetime,
});

export type VtexPeriod = z.infer<typeof vtexPeriodSchema>;

export const vtexOrderItemSchema = z.object({
  skuId: z.string(),
  quantity: z.number().int().nonnegative(),
});

export type VtexOrderItem = z.infer<typeof vtexOrderItemSchema>;

export const vtexOrderSchema = z.object({
  orderId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  value: z.number(),
  creationDate: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  items: z.array(vtexOrderItemSchema),
});

export type VtexOrder = z.infer<typeof vtexOrderSchema>;

export const vtexInventoryRowSchema = z.object({
  skuId: z.string(),
  quantity: z.number().nullable().optional(),
  error: z.string().optional(),
});

export type VtexInventoryRow = z.infer<typeof vtexInventoryRowSchema>;

export const vtexPricingRowSchema = z.object({
  skuId: z.string(),
  price: z.number().nullable().optional(),
});

export type VtexPricingRow = z.infer<typeof vtexPricingRowSchema>;

export const vtexCheckoutSchema = z.object({
  storeUrl: z.string().optional(),
  note: z.string().optional(),
});

export type VtexCheckout = z.infer<typeof vtexCheckoutSchema>;

export const vtexSamplingSchema = z.object({
  sampleSize: z.number().int().positive(),
  totalPopulation: z.number().int().nonnegative(),
  confidence: z.string(),
});

export type VtexSampling = z.infer<typeof vtexSamplingSchema>;

export const vtexNormalizedSchema = z.object({
  orders: z.array(vtexOrderSchema),
  inventory: z.array(vtexInventoryRowSchema),
  pricing: z.array(vtexPricingRowSchema),
  categories: z.array(z.unknown()),
  shipments: z.array(z.unknown()),
  checkout: vtexCheckoutSchema,
  collectedAt: z.string(),
  sampling: vtexSamplingSchema.optional(),
});

export type VtexNormalized = z.infer<typeof vtexNormalizedSchema>;

export const vtexCollectInputSchema = z.object({
  workspaceId: z.string().min(1),
  period: vtexPeriodSchema,
  collectors: z.array(z.string()).optional(),
});

export type VtexCollectInput = z.infer<typeof vtexCollectInputSchema>;

export const collectorStatusSchema = z.enum(["ok", "partial", "failed"]);

export type CollectorStatus = z.infer<typeof collectorStatusSchema>;

export const vtexCollectorResultSchema = z.object({
  collector: z.string(),
  status: collectorStatusSchema,
  error: z.string().optional(),
});

export type VtexCollectorResult = z.infer<typeof vtexCollectorResultSchema>;

export const vtexDataGapSchema = z.object({
  source: z.literal("vtex"),
  reason: z.string(),
  impact: z.string(),
});

export type VtexDataGap = z.infer<typeof vtexDataGapSchema>;

export const vtexCollectResultSchema = z.object({
  normalized: vtexNormalizedSchema,
  collectorResults: z.array(vtexCollectorResultSchema),
  dataGaps: z.array(vtexDataGapSchema),
  metrics: z.object({
    order_count: z.number(),
    revenue: z.number(),
    canceled: z.number(),
  }),
});

export type VtexCollectResult = z.infer<typeof vtexCollectResultSchema>;
