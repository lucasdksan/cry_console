import { prisma } from "@/backend/models/prisma";

export async function createPasswordResetToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  await prisma.passwordResetToken.deleteMany({
    where: { userId: input.userId, usedAt: null },
  });

  return prisma.passwordResetToken.create({
    data: input,
  });
}

export async function findValidPasswordResetToken(tokenHash: string) {
  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
}

export async function markPasswordResetTokenUsed(id: string) {
  return prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}
