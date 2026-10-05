"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/backend/auth";
import { CredentialsCryptoError } from "@/backend/lib/credentials-crypto";
import {
  assertVtexAccountFields,
  parseGaServiceAccountJson,
  workspaceBaseSchema,
} from "@/backend/lib/workspace-policy";
import type { SecretField } from "@/backend/lib/credentials-crypto";
import {
  deleteSentryProject,
  isSentryServerConfigured,
  SentryApiError,
} from "@/backend/lib/sentry";
import { getSentryProjectSlugForUserWorkspace } from "@/backend/models/observability.model";
import {
  clearWorkspaceSecretForUser,
  createWorkspaceForUser,
  deleteWorkspaceForUser,
  setActiveWorkspaceForUser,
  updateWorkspaceForUser,
  WorkspaceLimitError,
  WorkspaceNameConflictError,
} from "@/backend/models/workspace.model";

export type WorkspaceActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};

const secretFieldSchema = z.enum([
  "vtexAppKey",
  "vtexAppToken",
  "clarityToken",
  "gaServiceAccount",
]);

function fieldErrors(error: z.ZodError) {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }
  return session.user.id;
}

function optionalTrimmed(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function readSecretInput(
  formData: FormData,
  name: string,
  configured: boolean,
): { action: "set"; value: string } | { action: "keep" } {
  const raw = optionalTrimmed(formData.get(name));
  if (raw) {
    return { action: "set", value: raw };
  }
  if (configured) {
    return { action: "keep" };
  }
  return { action: "keep" };
}

async function readGaSecretInput(
  formData: FormData,
  configured: boolean,
): Promise<
  | { action: "set"; value: string; clientEmail: string }
  | { action: "keep" }
  | { action: "clear" }
> {
  const file = formData.get("gaServiceAccountFile");
  if (file instanceof File && file.size > 0) {
    const text = await file.text();
    const parsed = parseGaServiceAccountJson(text);
    return {
      action: "set",
      value: JSON.stringify(parsed),
      clientEmail: parsed.client_email,
    };
  }

  const pasted = optionalTrimmed(formData.get("gaServiceAccountJson"));
  if (pasted) {
    const parsed = parseGaServiceAccountJson(pasted);
    return {
      action: "set",
      value: JSON.stringify(parsed),
      clientEmail: parsed.client_email,
    };
  }

  if (configured) {
    return { action: "keep" };
  }

  return { action: "keep" };
}

type ParsedWorkspaceForm = {
  name: string;
  siteUrl: string;
  vtexAccountName: string | null;
  vtexEnvironment: string | null;
  gaClientEmail: string | null;
  gaPropertyId: string | null;
  secrets: Parameters<typeof createWorkspaceForUser>[1]["secrets"];
};

async function parseWorkspaceForm(
  formData: FormData,
  options: { mode: "create" | "update"; configured: Record<SecretField, boolean> },
): Promise<ParsedWorkspaceForm | WorkspaceActionState> {
  const gaPropertyRaw = optionalTrimmed(formData.get("gaPropertyId"));
  const baseParsed = workspaceBaseSchema.safeParse({
    name: formData.get("name"),
    siteUrl: formData.get("siteUrl"),
    vtexAccountName: optionalTrimmed(formData.get("vtexAccountName")) || undefined,
    vtexEnvironment:
      optionalTrimmed(formData.get("vtexEnvironment")) || undefined,
    gaPropertyId: gaPropertyRaw || undefined,
  });

  if (!baseParsed.success) {
    return { fieldErrors: fieldErrors(baseParsed.error) };
  }

  const vtexAppKey = readSecretInput(
    formData,
    "vtexAppKey",
    options.configured.vtexAppKey,
  );
  const vtexAppToken = readSecretInput(
    formData,
    "vtexAppToken",
    options.configured.vtexAppToken,
  );
  const clarityToken = readSecretInput(
    formData,
    "clarityToken",
    options.configured.clarityToken,
  );

  let gaUpdate: Awaited<ReturnType<typeof readGaSecretInput>>;
  try {
    gaUpdate = await readGaSecretInput(
      formData,
      options.configured.gaServiceAccount,
    );
  } catch (error) {
    return {
      fieldErrors: {
        gaServiceAccount: [
          error instanceof Error ? error.message : "JSON inválido.",
        ],
      },
    };
  }

  const vtexKeyValue =
    vtexAppKey.action === "set" ? vtexAppKey.value : undefined;
  const vtexTokenValue =
    vtexAppToken.action === "set" ? vtexAppToken.value : undefined;

  try {
    assertVtexAccountFields({
      vtexAccountName: baseParsed.data.vtexAccountName,
      vtexEnvironment: baseParsed.data.vtexEnvironment,
      vtexAppKey: vtexKeyValue,
      vtexAppToken: vtexTokenValue,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Dados VTEX inválidos.",
    };
  }

  const hasConfiguredVtex =
    options.configured.vtexAppKey || options.configured.vtexAppToken;

  if (vtexKeyValue || vtexTokenValue || hasConfiguredVtex) {
    try {
      assertVtexAccountFields({
        vtexAccountName: baseParsed.data.vtexAccountName,
        vtexEnvironment: baseParsed.data.vtexEnvironment,
        vtexAppKey: vtexKeyValue ?? (options.configured.vtexAppKey ? "x" : undefined),
        vtexAppToken:
          vtexTokenValue ?? (options.configured.vtexAppToken ? "x" : undefined),
      });
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Dados VTEX inválidos.",
      };
    }
  }

  const gaClientEmail =
    gaUpdate.action === "set" ? gaUpdate.clientEmail : null;

  const gaPropertyId =
    baseParsed.data.gaPropertyId?.trim() || gaPropertyRaw || null;

  return {
    name: baseParsed.data.name,
    siteUrl: baseParsed.data.siteUrl,
    vtexAccountName: baseParsed.data.vtexAccountName?.trim() || null,
    vtexEnvironment: baseParsed.data.vtexEnvironment ?? null,
    gaClientEmail,
    gaPropertyId: gaPropertyId?.trim() ? gaPropertyId.trim() : null,
    secrets: {
      vtexAppKey: vtexAppKey,
      vtexAppToken: vtexAppToken,
      clarityToken: clarityToken,
      gaServiceAccount:
        gaUpdate.action === "set"
          ? { action: "set", value: gaUpdate.value }
          : gaUpdate.action === "clear"
            ? { action: "clear" }
            : { action: "keep" },
    },
  };
}

function mapWriteError(error: unknown): WorkspaceActionState {
  if (error instanceof WorkspaceLimitError) {
    return { error: error.message };
  }
  if (error instanceof WorkspaceNameConflictError) {
    return { fieldErrors: { name: [error.message] } };
  }
  if (error instanceof CredentialsCryptoError) {
    return {
      error:
        "Não foi possível salvar credenciais: chave de criptografia ausente ou inválida.",
    };
  }
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: "Não foi possível salvar a loja." };
}

export async function createWorkspace(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const userId = await requireUserId();

  const configured = {
    vtexAppKey: false,
    vtexAppToken: false,
    clarityToken: false,
    gaServiceAccount: false,
  };

  const parsed = await parseWorkspaceForm(formData, {
    mode: "create",
    configured,
  });
  if ("fieldErrors" in parsed && parsed.fieldErrors) {
    return parsed;
  }
  if ("error" in parsed && parsed.error) {
    return parsed;
  }
  if (!("secrets" in parsed)) {
    return { error: "Dados inválidos." };
  }

  try {
    const workspace = await createWorkspaceForUser(userId, parsed);
    revalidatePath("/", "layout");
    redirect(`/lojas/${workspace.id}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return mapWriteError(error);
  }
}

export async function updateWorkspace(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const userId = await requireUserId();
  const workspaceId = optionalTrimmed(formData.get("workspaceId"));
  if (!workspaceId) {
    return { error: "Loja inválida." };
  }

  const configured = {
    vtexAppKey: formData.get("hasVtexAppKey") === "1",
    vtexAppToken: formData.get("hasVtexAppToken") === "1",
    clarityToken: formData.get("hasClarityToken") === "1",
    gaServiceAccount: formData.get("hasGaServiceAccount") === "1",
  };

  const parsed = await parseWorkspaceForm(formData, {
    mode: "update",
    configured,
  });
  if ("fieldErrors" in parsed && parsed.fieldErrors) {
    return parsed;
  }
  if ("error" in parsed && parsed.error) {
    return parsed;
  }
  if (!("secrets" in parsed)) {
    return { error: "Dados inválidos." };
  }

  try {
    await updateWorkspaceForUser(userId, workspaceId, parsed);
    revalidatePath("/", "layout");
    return { success: "Loja atualizada." };
  } catch (error) {
    return mapWriteError(error);
  }
}

export async function removeWorkspaceSecretAction(formData: FormData): Promise<void> {
  await removeWorkspaceSecret({}, formData);
}

export async function removeWorkspaceSecret(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const userId = await requireUserId();
  const workspaceId = optionalTrimmed(formData.get("workspaceId"));
  const fieldParsed = secretFieldSchema.safeParse(formData.get("field"));

  if (!workspaceId || !fieldParsed.success) {
    return { error: "Solicitação inválida." };
  }

  try {
    await clearWorkspaceSecretForUser(userId, workspaceId, fieldParsed.data);
    revalidatePath("/", "layout");
    return { success: "Credencial removida." };
  } catch (error) {
    return mapWriteError(error);
  }
}

export async function deleteWorkspace(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const userId = await requireUserId();
  const workspaceId = optionalTrimmed(formData.get("workspaceId"));
  if (!workspaceId) {
    return { error: "Loja inválida." };
  }

  try {
    if (isSentryServerConfigured()) {
      const projectSlug = await getSentryProjectSlugForUserWorkspace(
        userId,
        workspaceId,
      );
      if (projectSlug) {
        try {
          await deleteSentryProject(projectSlug);
        } catch (error) {
          if (error instanceof SentryApiError) {
            return {
              error:
                "Não foi possível remover o projeto no Sentry. A loja não foi excluída.",
            };
          }
          return { error: "Falha ao remover observabilidade no Sentry." };
        }
      }
    }

    await deleteWorkspaceForUser(userId, workspaceId);
    revalidatePath("/", "layout");
    redirect("/lojas");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return mapWriteError(error);
  }
}

export async function activateWorkspace(workspaceId: string): Promise<void> {
  const userId = await requireUserId();
  await setActiveWorkspaceForUser(userId, workspaceId);
  revalidatePath("/", "layout");
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}
