import Link from "next/link";

import { ForgotPasswordForm } from "@/frontend/components/organisms/forgot-password-form";
import { AuthCardTemplate } from "@/frontend/components/templates/auth-card-template";

export default function EsqueciSenhaPage() {
  return (
    <AuthCardTemplate
      title="Esqueci minha senha"
      footer={
        <p className="text-center text-sm lg:text-left">
          <Link href="/entrar" className="font-medium text-link hover:underline">
            Voltar para o login
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthCardTemplate>
  );
}
