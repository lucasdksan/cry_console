"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/backend/auth";
import {
  defaultCollectorsForInsights,
  isVtexCollector,
  runVtexCollect,
  vtexCollectInputSchema,
  type VtexCollectResult,
} from "@/backend/lib/vtex";
import { getWorkspaceVtexConfigForUser } from "@/backend/models/workspace.model";

export type VtexCollectActionState =
  | { ok: true; data: VtexCollectResult }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }
  return session.user.id;
}

const collectInputSchema = vtexCollectInputSchema.extend({
  collectors: z.array(z.string()).optional(),
});

export async function collectVtexData(
  input: z.input<typeof collectInputSchema>,
): Promise<VtexCollectActionState> {
  const userId = await requireUserId();

  const parsed = collectInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Parâmetros de coleta inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const collectors = parsed.data.collectors?.length
    ? parsed.data.collectors.filter(isVtexCollector)
    : defaultCollectorsForInsights();

  if (parsed.data.collectors?.length && collectors.length === 0) {
    return {
      ok: false,
      error: "Nenhum coletor VTEX válido foi informado.",
    };
  }

  let vtexConfig;
  try {
    vtexConfig = await getWorkspaceVtexConfigForUser(
      userId,
      parsed.data.workspaceId,
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar credenciais VTEX.",
    };
  }

  try {
    const data = await runVtexCollect({
      config: {
        account: vtexConfig.account,
        environment: vtexConfig.environment,
        appKey: vtexConfig.appKey,
        appToken: vtexConfig.appToken,
      },
      siteUrl: vtexConfig.siteUrl,
      period: parsed.data.period,
      collectors,
    });

    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao coletar dados VTEX.",
    };
  }
}
