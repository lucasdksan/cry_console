import type { PageSpeedPair, PageSpeedSignals } from "@/backend/lib/page-audit/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs";

function fmt(value: number | null, suffix = ""): string {
  if (value === null) return "—";
  return `${value}${suffix}`;
}

function VitalsGrid({ pagespeed }: { pagespeed: PageSpeedSignals | null }) {
  if (!pagespeed) {
    return <p className="text-sm text-muted-foreground">Métricas indisponíveis nesta execução.</p>;
  }

  const items = [
    { label: "Performance", value: fmt(pagespeed.performanceScore) },
    { label: "LCP (ms)", value: fmt(pagespeed.lcp) },
    { label: "INP (ms)", value: fmt(pagespeed.inp) },
    { label: "CLS", value: fmt(pagespeed.cls) },
    { label: "TTFB (ms)", value: fmt(pagespeed.ttfb) },
    { label: "TBT (ms)", value: fmt(pagespeed.tbt) },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border px-3 py-2">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="text-lg font-semibold tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type PageAuditVitalsStripProps = {
  pagespeed: PageSpeedPair | null;
};

export function PageAuditVitalsStrip({ pagespeed }: PageAuditVitalsStripProps) {
  if (!pagespeed || (!pagespeed.mobile && !pagespeed.desktop)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Core Web Vitals</CardTitle>
          <CardDescription>PageSpeed indisponível nesta execução.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Core Web Vitals</CardTitle>
        <CardDescription>Fonte: Google PageSpeed Insights (mobile e desktop)</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={pagespeed.mobile ? "mobile" : "desktop"}>
          <TabsList className="flex h-auto w-full flex-wrap gap-1">
            <TabsTrigger value="mobile" disabled={!pagespeed.mobile}>
              Mobile
            </TabsTrigger>
            <TabsTrigger value="desktop" disabled={!pagespeed.desktop}>
              Desktop
            </TabsTrigger>
          </TabsList>
          <TabsContent value="mobile" className="pt-4">
            <VitalsGrid pagespeed={pagespeed.mobile} />
          </TabsContent>
          <TabsContent value="desktop" className="pt-4">
            <VitalsGrid pagespeed={pagespeed.desktop} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
