import { getAuthErrorMessage } from "@/backend/lib/auth/errors";
import { sanitizeRedirectPath } from "@/backend/lib/auth/redirect";
import { AuthFooterLink } from "@/frontend/components/molecules/auth-footer-link";
import { LoginForm } from "@/frontend/components/organisms/login-form";
import { AuthCardTemplate } from "@/frontend/components/templates/auth-card-template";

type EntrarPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EntrarPage({ searchParams }: EntrarPageProps) {
  const params = await searchParams;
  const redirectTo = sanitizeRedirectPath(
    typeof params.to === "string" ? params.to : undefined,
  );
  const errorMessage = getAuthErrorMessage(
    typeof params.error === "string" ? params.error : undefined,
  );
  const successMessage =
    typeof params.success === "string" ? params.success : undefined;

  return (
    <AuthCardTemplate
      title="Acesse sua conta"
      footer={
        <AuthFooterLink
          href={`/cadastro?to=${encodeURIComponent(redirectTo)}`}
          prefix="Não tem uma conta?"
          highlight="Crie sua conta grátis"
        />
      }
    >
      {successMessage ? (
        <p className="rounded-[var(--radius-md)] border border-brand-secondary/40 bg-brand-secondary/10 px-3 py-2 text-sm text-brand-secondary">
          {successMessage}
        </p>
      ) : null}
      <LoginForm redirectTo={redirectTo} errorMessage={errorMessage} />
    </AuthCardTemplate>
  );
}
