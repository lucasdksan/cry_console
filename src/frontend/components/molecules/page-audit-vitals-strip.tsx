import type { PageSpeedSignals } from "@/backend/lib/page-audit/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

function fmt(value: number | null, suffix = ""): string {
  if (value === null) return "—";
  return `${value}${suffix}`;
}

type PageAuditVitalsStripProps = {
  pagespeed: PageSpeedSignals | null;
};

export function PageAuditVitalsStrip({ pagespeed }: PageAuditVitalsStripProps) {
  if (!pagespeed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Core Web Vitals</CardTitle>
          <CardDescription>PageSpeed indisponível nesta execução.</CardDescription>
        </CardHeader>
      </Card>
    );
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Core Web Vitals (mobile)</CardTitle>
        <CardDescription>Fonte: Google PageSpeed Insights</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="rounded-md border px-3 py-2">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
