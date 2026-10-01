import { sanitizeRedirectPath } from "@/backend/lib/redirect";
import { AuthFooterLink } from "@/frontend/components/molecules/auth-footer-link";
import { RegisterForm } from "@/frontend/components/organisms/register-form";
import { AuthCardTemplate } from "@/frontend/components/templates/auth-card-template";

type CadastroPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CadastroPage({ searchParams }: CadastroPageProps) {
  const params = await searchParams;
  const redirectTo = sanitizeRedirectPath(
    typeof params.to === "string" ? params.to : undefined,
  );

  return (
    <AuthCardTemplate
      title="Cadastre-se gratuitamente"
      footer={
        <AuthFooterLink
          href={`/entrar?to=${encodeURIComponent(redirectTo)}`}
          prefix="Já possui uma conta?"
          highlight="Entre na plataforma"
        />
      }
    >
      <RegisterForm redirectTo={redirectTo} />
    </AuthCardTemplate>
  );
}
