"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/backend/auth";
import {
  normalizeAgentSkillSlug,
  suggestSlugFromName,
  USER_AGENT_SKILL_INSTRUCTION_MAX,
  USER_AGENT_SKILL_MAX_COUNT,
  USER_AGENT_SKILL_NAME_MAX,
  validateAgentSkillMetricKeys,
  validateAgentSkillSlugFormat,
} from "@/backend/lib/agent/skill";
import type { WorkspaceMetricKey } from "@/generated/prisma/client";
import {
  countUserAgentSkills,
  createUserAgentSkillForUser,
  deleteUserAgentSkillForUser,
  findUserAgentSkillByIdForUser,
  isUserAgentSkillSlugTaken,
  listUserAgentSkillsPublic,
  listUserAgentSkillsSlashPublic,
  updateUserAgentSkillForUser,
  type UserAgentSkillPublic,
  type UserAgentSkillSlashPublic,
} from "@/backend/models/user-agent-skill.model";

export type AgentSkillActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
  skills?: UserAgentSkillPublic[];
};

const metricKeySchema = z.enum([
  "vtex_revenue",
  "vtex_orders",
  "ga4_sessions",
  "ga4_conversion_pct",
  "gsc_clicks",
  "clarity_sessions",
  "clarity_dead_clicks",
  "clarity_quick_backs",
]);

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

function readMetricKeys(formData: FormData): WorkspaceMetricKey[] {
  const raw = formData.getAll("metricKeys");
  const keys: WorkspaceMetricKey[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") {
      continue;
    }
    const parsed = metricKeySchema.safeParse(entry);
    if (parsed.success) {
      keys.push(parsed.data);
    }
  }
  return keys;
}

function validateSkillPayload(input: {
  name: string;
  slugRaw: string;
  instruction: string;
  metricKeys: WorkspaceMetricKey[];
  userId: string;
  excludeSkillId?: string;
}):
  | { ok: true; slug: string; name: string; instruction: string; metricKeys: WorkspaceMetricKey[] }
  | { ok: false; fieldErrors: Record<string, string[]>; error?: string } {
  const fieldErrors: Record<string, string[]> = {};

  if (!input.name) {
    fieldErrors.name = ["Informe um nome."];
  } else if (input.name.length > USER_AGENT_SKILL_NAME_MAX) {
    fieldErrors.name = [
      `Use no máximo ${USER_AGENT_SKILL_NAME_MAX} caracteres.`,
    ];
  }

  const slug = normalizeAgentSkillSlug(input.slugRaw || suggestSlugFromName(input.name));
  const slugCheck = validateAgentSkillSlugFormat(slug);
  if (!slugCheck.ok) {
    fieldErrors.slug = [slugCheck.error];
  }

  if (!input.instruction) {
    fieldErrors.instruction = ["Descreva o que a skill deve fazer."];
  } else if (input.instruction.length > USER_AGENT_SKILL_INSTRUCTION_MAX) {
    fieldErrors.instruction = [
      `Use no máximo ${USER_AGENT_SKILL_INSTRUCTION_MAX} caracteres.`,
    ];
  }

  const metricsCheck = validateAgentSkillMetricKeys(input.metricKeys);
  if (!metricsCheck.ok) {
    fieldErrors.metricKeys = [metricsCheck.error];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    slug,
    name: input.name,
    instruction: input.instruction,
    metricKeys: [...new Set(input.metricKeys)],
  };
}

export async function fetchAccountAgentSkills(): Promise<UserAgentSkillPublic[]> {
  const userId = await requireUserId();
  return listUserAgentSkillsPublic(userId);
}

export async function fetchAgentSkillSlashCatalog(): Promise<
  UserAgentSkillSlashPublic[]
> {
  const userId = await requireUserId();
  return listUserAgentSkillsSlashPublic(userId);
}

export async function saveUserAgentSkill(
  _prev: AgentSkillActionState,
  formData: FormData,
): Promise<AgentSkillActionState> {
  const userId = await requireUserId();
  const skillId = optionalTrimmed(formData.get("skillId"));
  const name = optionalTrimmed(formData.get("name"));
  const slugRaw = optionalTrimmed(formData.get("slug"));
  const instruction = optionalTrimmed(formData.get("instruction"));
  const metricKeys = readMetricKeys(formData);

  const validated = validateSkillPayload({
    name,
    slugRaw,
    instruction,
    metricKeys,
    userId,
    excludeSkillId: skillId || undefined,
  });

  if (!validated.ok) {
    return { fieldErrors: validated.fieldErrors };
  }

  const slugTaken = await isUserAgentSkillSlugTaken(
    userId,
    validated.slug,
    skillId || undefined,
  );
  if (slugTaken) {
    return {
      fieldErrors: { slug: ["Este slug já está em uso na sua conta."] },
    };
  }

  try {
    if (skillId) {
      const existing = await findUserAgentSkillByIdForUser(userId, skillId);
      if (!existing) {
        return { error: "Skill não encontrada." };
      }
      await updateUserAgentSkillForUser(userId, skillId, {
        name: validated.name,
        slug: validated.slug,
        instruction: validated.instruction,
        metricKeys: validated.metricKeys,
      });
    } else {
      const count = await countUserAgentSkills(userId);
      if (count >= USER_AGENT_SKILL_MAX_COUNT) {
        return {
          error: `Limite de ${USER_AGENT_SKILL_MAX_COUNT} skills por conta.`,
        };
      }
      await createUserAgentSkillForUser(userId, {
        name: validated.name,
        slug: validated.slug,
        instruction: validated.instruction,
        metricKeys: validated.metricKeys,
      });
    }

    const skills = await listUserAgentSkillsPublic(userId);
    return { success: "Skill salva.", skills };
  } catch {
    return { error: "Não foi possível salvar a skill." };
  }
}

export async function removeUserAgentSkill(
  _prev: AgentSkillActionState,
  formData: FormData,
): Promise<AgentSkillActionState> {
  const userId = await requireUserId();
  const skillId = optionalTrimmed(formData.get("skillId"));
  if (!skillId) {
    return { error: "Skill inválida." };
  }

  const removed = await deleteUserAgentSkillForUser(userId, skillId);
  if (!removed) {
    return { error: "Skill não encontrada." };
  }

  const skills = await listUserAgentSkillsPublic(userId);
  return { success: "Skill removida.", skills };
}
