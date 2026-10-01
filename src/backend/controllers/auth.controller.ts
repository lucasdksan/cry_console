"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn, signOut } from "@/backend/auth";
import { sanitizeRedirectPath } from "@/backend/lib/redirect";
import { createResetToken, hashResetToken } from "@/backend/lib/tokens";
import {
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
} from "@/backend/models/password-reset.model";
import {
  createPasswordUser,
  findUserByEmail,
  updateUserPassword,
  userHasGoogleAccount,
} from "@/backend/models/user.model";

const passwordSchema = z
  .string()
  .min(8, "A senha deve ter no mínimo 8 caracteres.");

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome completo."),
    email: z.email("Informe um e-mail válido."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

const forgotPasswordSchema = z.object({
  email: z.email("Informe um e-mail válido."),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type AuthActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};

function fieldErrors(error: z.ZodError) {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

export async function registerUser(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const existing = await findUserByEmail(parsed.data.email);

  if (existing && userHasGoogleAccount(existing) && !existing.passwordHash) {
    return {
      error: "Este e-mail já está cadastrado com Google. Entre com Google.",
    };
  }

  if (existing) {
    return { error: "Este e-mail já está em uso." };
  }

  const passwordHash = await hash(parsed.data.password, 12);

  await createPasswordUser({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
  });

  const redirectTo = sanitizeRedirectPath(formData.get("to")?.toString());

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      return { error: "Conta criada, mas não foi possível entrar automaticamente." };
    }

    return { error: "Conta criada, mas não foi possível entrar automaticamente." };
  }

  return {};
}

export async function loginUser(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const redirectTo = sanitizeRedirectPath(formData.get("to")?.toString());

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      return { error: "E-mail ou senha inválidos." };
    }

    return { error: "E-mail ou senha inválidos." };
  }

  return {};
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const user = await findUserByEmail(parsed.data.email);

  if (user?.passwordHash) {
    const { token, tokenHash } = createResetToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/redefinir-senha?token=${token}`;

    console.info("[Cry Console] Link de redefinição de senha:", resetUrl);
  }

  return {
    success:
      "Se o e-mail estiver cadastrado, enviaremos instruções para redefinir a senha.",
  };
}

export async function resetPassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const tokenHash = hashResetToken(parsed.data.token);
  const resetToken = await findValidPasswordResetToken(tokenHash);

  if (!resetToken) {
    return { error: "Link inválido ou expirado. Solicite uma nova redefinição." };
  }

  const passwordHash = await hash(parsed.data.password, 12);

  await updateUserPassword(resetToken.userId, passwordHash);
  await markPasswordResetTokenUsed(resetToken.id);

  redirect("/entrar?success=Senha redefinida com sucesso.");
}

export async function logoutUser() {
  await signOut({ redirectTo: "/entrar" });
}

export async function signInWithGoogle(formData: FormData) {
  const redirectTo = sanitizeRedirectPath(formData.get("to")?.toString());

  await signIn("google", { redirectTo });
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}
