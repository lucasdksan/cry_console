import type { WorkspaceMetricKey } from "@/generated/prisma/client";

import { prisma } from "@/backend/models/prisma";

export type UserAgentSkillRow = {
  id: string;
  name: string;
  slug: string;
  instruction: string;
  metricKeys: WorkspaceMetricKey[];
  createdAt: Date;
  updatedAt: Date;
};

export type UserAgentSkillPublic = {
  id: string;
  name: string;
  slug: string;
  instruction: string;
  metricKeys: WorkspaceMetricKey[];
};

export type UserAgentSkillSlashPublic = {
  name: string;
  slug: string;
};

const skillSelect = {
  id: true,
  name: true,
  slug: true,
  instruction: true,
  metricKeys: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toPublic(row: {
  id: string;
  name: string;
  slug: string;
  instruction: string;
  metricKeys: WorkspaceMetricKey[];
}): UserAgentSkillPublic {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    instruction: row.instruction,
    metricKeys: row.metricKeys,
  };
}

export async function countUserAgentSkills(userId: string): Promise<number> {
  return prisma.userAgentSkill.count({ where: { userId } });
}

export async function listUserAgentSkillsPublic(
  userId: string,
): Promise<UserAgentSkillPublic[]> {
  const rows = await prisma.userAgentSkill.findMany({
    where: { userId },
    orderBy: [{ name: "asc" }],
    select: skillSelect,
  });
  return rows.map(toPublic);
}

export async function listUserAgentSkillsSlashPublic(
  userId: string,
): Promise<UserAgentSkillSlashPublic[]> {
  const rows = await prisma.userAgentSkill.findMany({
    where: { userId },
    orderBy: [{ name: "asc" }],
    select: { name: true, slug: true },
  });
  return rows;
}

export async function listUserAgentSkillsForAgent(
  userId: string,
): Promise<UserAgentSkillPublic[]> {
  return listUserAgentSkillsPublic(userId);
}

export async function findUserAgentSkillByIdForUser(
  userId: string,
  skillId: string,
): Promise<UserAgentSkillPublic | null> {
  const row = await prisma.userAgentSkill.findFirst({
    where: { id: skillId, userId },
    select: skillSelect,
  });
  return row ? toPublic(row) : null;
}

export async function findUserAgentSkillBySlugForUser(
  userId: string,
  slug: string,
): Promise<UserAgentSkillPublic | null> {
  const row = await prisma.userAgentSkill.findFirst({
    where: { userId, slug },
    select: skillSelect,
  });
  return row ? toPublic(row) : null;
}

export async function createUserAgentSkillForUser(
  userId: string,
  data: {
    name: string;
    slug: string;
    instruction: string;
    metricKeys: WorkspaceMetricKey[];
  },
): Promise<UserAgentSkillPublic> {
  const row = await prisma.userAgentSkill.create({
    data: {
      userId,
      name: data.name,
      slug: data.slug,
      instruction: data.instruction,
      metricKeys: data.metricKeys,
    },
    select: skillSelect,
  });
  return toPublic(row);
}

export async function updateUserAgentSkillForUser(
  userId: string,
  skillId: string,
  data: {
    name: string;
    slug: string;
    instruction: string;
    metricKeys: WorkspaceMetricKey[];
  },
): Promise<UserAgentSkillPublic | null> {
  const existing = await prisma.userAgentSkill.findFirst({
    where: { id: skillId, userId },
    select: { id: true },
  });
  if (!existing) {
    return null;
  }
  const row = await prisma.userAgentSkill.update({
    where: { id: skillId },
    data: {
      name: data.name,
      slug: data.slug,
      instruction: data.instruction,
      metricKeys: data.metricKeys,
    },
    select: skillSelect,
  });
  return toPublic(row);
}

export async function deleteUserAgentSkillForUser(
  userId: string,
  skillId: string,
): Promise<boolean> {
  const existing = await prisma.userAgentSkill.findFirst({
    where: { id: skillId, userId },
    select: { id: true },
  });
  if (!existing) {
    return false;
  }
  await prisma.userAgentSkill.delete({ where: { id: skillId } });
  return true;
}

export async function isUserAgentSkillSlugTaken(
  userId: string,
  slug: string,
  excludeSkillId?: string,
): Promise<boolean> {
  const row = await prisma.userAgentSkill.findFirst({
    where: {
      userId,
      slug,
      ...(excludeSkillId ? { NOT: { id: excludeSkillId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(row);
}
