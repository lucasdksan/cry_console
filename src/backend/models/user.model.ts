import { prisma } from "@/backend/models/prisma";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { accounts: true },
  });
}

export async function createPasswordUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
    },
  });
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export function userHasGoogleAccount(
  user: Awaited<ReturnType<typeof findUserByEmail>>,
) {
  return Boolean(user?.accounts.some((account) => account.provider === "google"));
}

export function userHasPassword(user: Awaited<ReturnType<typeof findUserByEmail>>) {
  return Boolean(user?.passwordHash);
}
