/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ObservabilityIssueCard } from "@/frontend/components/molecules/observability-issue-card";

const issue = {
  id: "1",
  title: "Campo “price” lido vazio",
  summary:
    "A função ProductPrice tentou ler “price” de um valor que ainda não existia.",
  exception: "TypeError: Cannot read properties of undefined (reading 'price')",
  where: "/p/tenis · ProductPrice em pdp.js:42",
  codeLine: "return product.price.toFixed(2)",
  suggestion: "Espere o produto chegar antes de ler price.",
  stackLines: ["ProductPrice — pdp.js:42", "render — vendor.js:1"],
  userCount: 4,
  unhandled: true,
  severity: "critico" as const,
  severityLabel: "Crítico",
  count: 12,
  lastSeen: "2026-10-08T12:00:00.000Z",
};

describe("ObservabilityIssueCard", { timeout: 20_000 }, () => {
  it("mostra onde quebrou e a sugestão de correção", () => {
    const { container } = render(
      <ObservabilityIssueCard
        issue={issue}
        analysis={null}
        analysisPending={false}
        meta="12 ocorrências · 4 visitantes"
      />,
    );

    expect(container).toHaveTextContent("Campo “price” lido vazio");
    expect(container).toHaveTextContent(
      "A função ProductPrice tentou ler “price” de um valor que ainda não existia.",
    );
    expect(container).not.toHaveTextContent(
      "TypeError: Cannot read properties of undefined (reading 'price')",
    );
    expect(container).toHaveTextContent("/p/tenis · ProductPrice em pdp.js:42");
    expect(container).toHaveTextContent("return product.price.toFixed(2)");
    expect(container).toHaveTextContent(
      "Espere o produto chegar antes de ler price.",
    );
    expect(container).toHaveTextContent("Como corrigir");
  });

  it("substitui a sugestão quando a análise traz passos", () => {
    const { container } = render(
      <ObservabilityIssueCard
        issue={issue}
        analysis={{
          whatHappened: "O preço é formatado antes do produto existir.",
          possibleCause: "A PDP renderiza ProductPrice com product undefined.",
          suggestion: "Não renderizar o preço sem produto.",
          steps: [
            {
              title: "Retorno antecipado",
              detail: "Se product não existir, mostre o skeleton.",
            },
          ],
        }}
        analysisPending={false}
        meta="12 ocorrências"
      />,
    );

    expect(container).toHaveTextContent(
      "O preço é formatado antes do produto existir.",
    );
    expect(container).toHaveTextContent(
      "A PDP renderiza ProductPrice com product undefined.",
    );
    expect(container).toHaveTextContent("Não renderizar o preço sem produto.");
    expect(container).toHaveTextContent("Retorno antecipado");
    expect(container).not.toHaveTextContent(
      "Espere o produto chegar antes de ler price.",
    );
  });
});
