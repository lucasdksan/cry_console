import { z } from "zod";

export const MAX_WORKSPACES_PER_USER = 3;

export const VTEX_ENVIRONMENTS = [
  "vtexcommercestable",
  "vtexcommercebeta",
  "myvtex",
] as const;

export type VtexEnvironment = (typeof VTEX_ENVIRONMENTS)[number];

export function normalizeWorkspaceNameKey(name: string): string {
  return name.trim().toLowerCase();
}

const httpsUrlSchema = z
  .string()
  .trim()
  .url("Informe uma URL válida.")
  .refine(
    (value) => value.startsWith("https://"),
    "A URL do site deve usar HTTPS.",
  );

export const gaServiceAccountSchema = z.object({
  type: z.literal("service_account"),
  project_id: z.string().min(1),
  private_key_id: z.string().min(1),
  private_key: z.string().min(1),
  client_email: z.email(),
  client_id: z.string().min(1),
});

export type GaServiceAccount = z.infer<typeof gaServiceAccountSchema>;

export function parseGaServiceAccountJson(raw: string): GaServiceAccount {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("O JSON da service account do Google é inválido.");
  }

  const result = gaServiceAccountSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      "O JSON não parece uma service account válida do Google Analytics.",
    );
  }

  return result.data;
}

export function vtexCredentialsRequireAccountFields(input: {
  vtexAppKey?: string | null;
  vtexAppToken?: string | null;
}): boolean {
  const key = input.vtexAppKey?.trim();
  const token = input.vtexAppToken?.trim();
  return Boolean(key || token);
}

export function assertVtexAccountFields(input: {
  vtexAccountName?: string | null;
  vtexEnvironment?: string | null;
  vtexAppKey?: string | null;
  vtexAppToken?: string | null;
}): void {
  if (!vtexCredentialsRequireAccountFields(input)) {
    return;
  }

  if (!input.vtexAccountName?.trim()) {
    throw new Error("Informe o VTEX Account Name.");
  }

  const env = input.vtexEnvironment?.trim();
  if (!env || !VTEX_ENVIRONMENTS.includes(env as VtexEnvironment)) {
    throw new Error("Selecione o VTEX Environment.");
  }
}

export const workspaceBaseSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da loja."),
  siteUrl: httpsUrlSchema,
  vtexAccountName: z.string().trim().optional(),
  vtexEnvironment: z.enum(VTEX_ENVIRONMENTS).optional(),
});
