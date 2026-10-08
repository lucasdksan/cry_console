import { describe, expect, it } from "vitest";

import { buildObservabilityPromptSection } from "@/backend/lib/agent/observability";
import {
  buildEmptyObservabilityDto,
  type ObservabilityIssueAvisoDTO,
  type ObservabilityReplayAvisoDTO,
  type ObservabilityVitalsGroupDTO,
} from "@/backend/lib/sentry/observability-dto";

const baseOk = buildEmptyObservabilityDto({
  workspaceId: "ws1",
  period: "14d",
  pageFilter: "all",
  status: "ok",
});

function issue(id: string): ObservabilityIssueAvisoDTO {
  return {
    id,
    title: `Erro ${id}`,
    summary: "Resumo do erro.",
    exception: "TypeError",
    where: "/checkout",
    codeLine: "foo.js:1",
    suggestion: "Corrija o bundle.",
    stackLines: ["at foo (foo.js:1:1)"],
    userCount: 3,
    unhandled: true,
    severity: "alerta",
    severityLabel: "Alerta",
    count: 10,
    lastSeen: "2026-01-01T00:00:00Z",
  };
}

describe("buildObservabilityPromptSection", () => {
  it("descreve not_configured, not_provisioned e error", () => {
    expect(
      buildObservabilityPromptSection(
        buildEmptyObservabilityDto({
          workspaceId: "ws1",
          period: "14d",
          pageFilter: "all",
          status: "not_configured",
        }),
      ),
    ).toMatch(/Sentry não está configurado/);

    expect(
      buildObservabilityPromptSection(
        buildEmptyObservabilityDto({
          workspaceId: "ws1",
          period: "14d",
          pageFilter: "all",
          status: "not_provisioned",
        }),
      ),
    ).toMatch(/sem projeto Sentry provisionado/);

    expect(
      buildObservabilityPromptSection(
        buildEmptyObservabilityDto({
          workspaceId: "ws1",
          period: "14d",
          pageFilter: "all",
          status: "error",
          errorMessage: "rate limit",
        }),
      ),
    ).toMatch(/rate limit/);
  });

  it("limita a 8 issues e não inclui stackLines", () => {
    const issues = Array.from({ length: 10 }, (_, i) => issue(String(i)));
    const text = buildObservabilityPromptSection({
      ...baseOk,
      issues,
    });
    expect(text).toMatch(/Issues \(8 de 10\)/);
    expect(text).not.toMatch(/at foo \(foo.js/);
    expect(text).toMatch(/Erro 0/);
    expect(text).toMatch(/Erro 7/);
    expect(text).not.toMatch(/Erro 8/);
  });

  it("lista vitals fora de ok com detalhe", () => {
    const vitalsGroups: ObservabilityVitalsGroupDTO[] = [
      {
        pageType: "home",
        pageTypeLabel: "Home",
        transactionCount: 100,
        severity: "atencao",
        severityLabel: "Atenção",
        summary: "LCP precisa de atenção.",
        vitals: [
          {
            key: "lcp",
            label: "LCP",
            p75: 3000,
            displayValue: "3.0 s",
            rating: "needs-improvement",
            unit: "ms",
            severity: "atencao",
            severityLabel: "Atenção",
            advice: "Otimize imagens.",
          },
          {
            key: "cls",
            label: "CLS",
            p75: 0.05,
            displayValue: "0.05",
            rating: "good",
            unit: "unitless",
            severity: "ok",
            severityLabel: "Ok",
            advice: "Estável.",
          },
        ],
      },
    ];
    const text = buildObservabilityPromptSection({
      ...baseOk,
      vitalsGroups,
    });
    expect(text).toMatch(/Métricas fora do ok: LCP/);
    expect(text).not.toMatch(/CLS 0\.05/);
  });

  it("mostra no máximo 3 replays", () => {
    const replays: ObservabilityReplayAvisoDTO[] = Array.from(
      { length: 5 },
      (_, i) => ({
        id: `r${i}`,
        startedAt: "2026-01-01T00:00:00Z",
        durationMs: 1000,
        browser: "Chrome",
        urls: [`https://loja.example/p/${i}`],
        errorCount: i,
        severity: "ok",
        severityLabel: "Ok",
        summary: `Replay ${i}`,
      }),
    );
    const text = buildObservabilityPromptSection({
      ...baseOk,
      replays,
    });
    expect(text).toMatch(/5 no total, mostrando 3/);
    expect(text).toMatch(/Replay 0/);
    expect(text).toMatch(/Replay 2/);
    expect(text).not.toMatch(/Replay 3/);
  });
});
