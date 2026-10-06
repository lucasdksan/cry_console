import { describe, expect, it } from "vitest";

import { buildWorkflowPartFromPlanMarkdown } from "@/backend/lib/agent/workflow";

describe("buildWorkflowPartFromPlanMarkdown", () => {
  it("agrupa semanas e ações sem markdown cru", () => {
    const part = buildWorkflowPartFromPlanMarkdown(`# Plano

## Passos

Semana 1 (Dias 1 a 7): Homologação de Checkout e Auditoria do Funil

**Ação 1.1**: Realizar teste técnico ponta a ponta de checkout.

**Ação 1.2**: Mapear páginas de entrada das sessões.

Semana 2 (Dias 8 a 15): Reestruturação de Snippets SEO

**Ação 2.1**: Revisar title tags das categorias.

## Entrega prevista

Gráficos.
`);
    expect(part?.phases).toHaveLength(2);
    expect(part?.phases?.[0]?.title).toMatch(/Semana 1/);
    expect(part?.phases?.[0]?.steps[0]?.label).toBe("Ação 1.1");
    expect(part?.phases?.[0]?.steps[0]?.detail).toMatch(/teste técnico/);
    expect(part?.phases?.[0]?.steps[0]?.label).not.toContain("**");
  });
});
