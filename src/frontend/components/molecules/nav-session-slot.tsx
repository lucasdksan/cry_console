import { User } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/frontend/components/ui/avatar";

type NavSessionSlotProps = {
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

export function NavSessionSlot({ email, name, image }: NavSessionSlotProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <Avatar size="sm">
        {image ? (
          <AvatarImage src={image} alt={name ?? email ?? "Usuário"} />
        ) : null}
        <AvatarFallback>
          <User aria-hidden />
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-0.5">
        {name ? (
          <span className="truncate text-sm font-medium text-foreground">
            {name}
          </span>
        ) : null}
        <span className="truncate text-xs text-muted-foreground">
          {email ?? "Conta"}
        </span>
      </div>
    </div>
  );
}
