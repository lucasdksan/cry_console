import { z } from "zod";

import { dateOrDatetime } from "@/backend/lib/vtex/schemas";

export const MEASUREMENT_SOURCES = [
  "analytics",
  "search-console",
  "clarity",
] as const;

export type MeasurementSource = (typeof MEASUREMENT_SOURCES)[number];

export const measurementPeriodSchema = z.object({
  start: dateOrDatetime,
  end: dateOrDatetime,
});

export type MeasurementPeriod = z.infer<typeof measurementPeriodSchema>;

export const measurementCollectInputSchema = z.object({
  workspaceId: z.string().min(1),
  period: measurementPeriodSchema,
  sources: z.array(z.enum(MEASUREMENT_SOURCES)).optional(),
  gaPropertyId: z.string().trim().min(1).optional(),
  gscSiteUrl: z.string().trim().min(1).optional(),
  brandKeyword: z.string().trim().optional(),
});

export type MeasurementCollectInput = z.infer<
  typeof measurementCollectInputSchema
>;

export const measurementSourceResultSchema = z.object({
  source: z.enum(MEASUREMENT_SOURCES),
  status: z.enum(["ok", "failed", "skipped"]),
  error: z.string().optional(),
});

export type MeasurementSourceResult = z.infer<
  typeof measurementSourceResultSchema
>;

export const measurementDataGapSchema = z.object({
  source: z.enum(MEASUREMENT_SOURCES),
  reason: z.string(),
  impact: z.string(),
});

export type MeasurementDataGap = z.infer<typeof measurementDataGapSchema>;

export const clarityCollectMetaSchema = z.object({
  fromCache: z.boolean(),
  stale: z.boolean(),
  collectedAt: z.string(),
});

export type ClarityCollectMetaDto = z.infer<typeof clarityCollectMetaSchema>;

export const measurementCollectResultSchema = z.object({
  collectedAt: z.string(),
  analytics: z.unknown().nullable(),
  searchConsole: z.unknown().nullable(),
  clarity: z.unknown().nullable(),
  clarityCollectMeta: clarityCollectMetaSchema.optional(),
  sourceResults: z.array(measurementSourceResultSchema),
  dataGaps: z.array(measurementDataGapSchema),
});

export type MeasurementCollectResult = z.infer<
  typeof measurementCollectResultSchema
>;

export function isMeasurementSource(value: string): value is MeasurementSource {
  return (MEASUREMENT_SOURCES as readonly string[]).includes(value);
}

export function defaultMeasurementSources(): MeasurementSource[] {
  return [...MEASUREMENT_SOURCES];
}
