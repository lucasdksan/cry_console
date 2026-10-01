import { auth } from "@/backend/auth";
import { logoutUser } from "@/backend/controllers/auth.controller";
import { BrandLogo } from "@/frontend/components/atoms/brand-logo";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="min-h-dvh bg-background p-5 sm:p-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 sm:gap-8">
        <BrandLogo className="justify-start" />
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>
              Área autenticada mínima do Cry Console.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <p className="text-sm text-muted-foreground sm:text-base">
              Logado como{" "}
              <span className="font-medium text-foreground">
                {session?.user?.email}
              </span>
            </p>
            <form action={logoutUser}>
              <Button type="submit" variant="outline">
                Sair
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
