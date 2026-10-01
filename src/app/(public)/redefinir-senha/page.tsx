import Link from "next/link";

import { ResetPasswordForm } from "@/frontend/components/organisms/reset-password-form";
import { AuthCardTemplate } from "@/frontend/components/templates/auth-card-template";

type RedefinirSenhaPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RedefinirSenhaPage({
  searchParams,
}: RedefinirSenhaPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <AuthCardTemplate
      title="Redefinir senha"
      footer={
        <p className="text-center text-sm lg:text-left">
          <Link href="/entrar" className="font-medium text-link hover:underline">
            Voltar para o login
          </Link>
        </p>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthCardTemplate>
  );
}
