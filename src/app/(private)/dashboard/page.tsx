export default function DashboardPage() {
  return (
    <div className="flex w-full flex-col gap-3">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight sm:text-3xl">
        Dashboard
      </h1>
      <p className="text-sm text-muted-foreground sm:text-base">
        Área autenticada do Cry Console. Use o menu para navegar.
      </p>
    </div>
  );
}
