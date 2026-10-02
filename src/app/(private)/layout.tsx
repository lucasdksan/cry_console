import { auth } from "@/backend/auth";
import { NavSessionSlot } from "@/frontend/components/molecules/nav-session-slot";
import { PrivateShell } from "@/frontend/components/templates/private-shell";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <PrivateShell
      slots={{
        session: (
          <NavSessionSlot
            email={session?.user?.email}
            name={session?.user?.name}
            image={session?.user?.image}
          />
        ),
      }}
    >
      {children}
    </PrivateShell>
  );
}
