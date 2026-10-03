import { z } from "zod";

import { validatePathnameGlob } from "@/backend/lib/sentry/pathname-glob";

export const pageTypeSchema = z.enum(["home", "pdp", "plp"]);

export const pathnameGlobSchema = z
  .string()
  .trim()
  .min(1, "Informe um pathname.")
  .superRefine((value, ctx) => {
    const error = validatePathnameGlob(value);
    if (error) {
      ctx.addIssue({ code: "custom", message: error });
    }
  });

export const observabilityPatternInputSchema = z.object({
  pageType: pageTypeSchema,
  pathnameGlob: pathnameGlobSchema,
});

export const saveObservabilitySchema = z.object({
  workspaceId: z.string().min(1),
  patterns: z
    .array(observabilityPatternInputSchema)
    .max(30, "Limite de 30 padrões por loja."),
});
