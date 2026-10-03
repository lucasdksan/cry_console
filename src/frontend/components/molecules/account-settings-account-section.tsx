import { User } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/frontend/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

type AccountSettingsAccountSectionProps = {
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

export function AccountSettingsAccountSection({
  email,
  name,
  image,
}: AccountSettingsAccountSectionProps) {
  return (
    <Card className="border-border bg-card/80">
      <CardHeader>
        <CardTitle className="font-heading text-base">Perfil</CardTitle>
        <CardDescription>
          Informações da sessão atual neste dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            {image ? (
              <AvatarImage src={image} alt={name ?? email ?? "Usuário"} />
            ) : null}
            <AvatarFallback>
              <User aria-hidden />
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            {name ? (
              <span className="truncate text-base font-medium text-foreground">
                {name}
              </span>
            ) : null}
            <span className="truncate text-sm text-muted-foreground">
              {email ?? "Conta"}
            </span>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Nome e e-mail vêm do provedor de login. Edição de perfil e senha
          entrarão em fluxos dedicados.
        </p>
      </CardContent>
    </Card>
  );
}
