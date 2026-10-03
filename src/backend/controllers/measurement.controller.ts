"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/backend/auth";
import {
  defaultMeasurementSources,
  isMeasurementSource,
  measurementCollectInputSchema,
  runMeasurementCollect,
  type MeasurementCollectResult,
} from "@/backend/lib/measurement";
import { getWorkspaceMeasurementSecretsForUser } from "@/backend/models/workspace.model";

export type MeasurementCollectActionState =
  | { ok: true; data: MeasurementCollectResult }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }
  return session.user.id;
}

const collectInputSchema = measurementCollectInputSchema.extend({
  sources: z.array(z.string()).optional(),
});

export async function collectMeasurementData(
  input: z.input<typeof collectInputSchema>,
): Promise<MeasurementCollectActionState> {
  const userId = await requireUserId();

  const parsed = collectInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Parâmetros de coleta inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const sources = parsed.data.sources?.length
    ? parsed.data.sources.filter(isMeasurementSource)
    : defaultMeasurementSources();

  if (parsed.data.sources?.length && sources.length === 0) {
    return {
      ok: false,
      error: "Nenhuma fonte de medição válida foi informada.",
    };
  }

  let secrets;
  try {
    secrets = await getWorkspaceMeasurementSecretsForUser(
      userId,
      parsed.data.workspaceId,
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar credenciais da loja.",
    };
  }

  try {
    const data = await runMeasurementCollect({
      secrets,
      period: parsed.data.period,
      sources,
      gaPropertyId: parsed.data.gaPropertyId,
      gscSiteUrl: parsed.data.gscSiteUrl,
      brandKeyword: parsed.data.brandKeyword,
    });

    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao coletar dados de medição.",
    };
  }
}
