import { describe, expect, it } from "vitest";

import {
  ASK_WORKSPACE_BLOCK_MESSAGE,
  isWorkspaceCommandBlockedInAsk,
  parseAgentInput,
} from "@/backend/lib/agent/command";

describe("parseAgentInput", () => {
  it("troca modo sem enviar ao modelo", () => {
    expect(parseAgentInput("/plan")).toEqual({ kind: "mode_only", mode: "plan" });
  });

  it("parseia saúde por pilar", () => {
    const parsed = parseAgentInput("/saude comercial");
    expect(parsed.kind).toBe("message");
    if (parsed.kind === "message") {
      expect(parsed.workspaceCommand).toEqual({
        kind: "health",
        pillar: "comercial",
      });
    }
  });

  it("parseia comandos de pilar Iliada", () => {
    const aquisicao = parseAgentInput("/aquisicao");
    expect(aquisicao.kind).toBe("message");
    if (aquisicao.kind === "message") {
      expect(aquisicao.workspaceCommand).toEqual({
        kind: "health",
        pillar: "aquisicao",
      });
    }

    const operacao = parseAgentInput("/operacao");
    if (operacao.kind === "message") {
      expect(operacao.workspaceCommand).toEqual({
        kind: "health",
        pillar: "operacional",
      });
    }
  });

  it("parseia comandos analíticos", () => {
    const funil = parseAgentInput("/funil");
    if (funil.kind === "message") {
      expect(funil.workspaceCommand).toEqual({ kind: "funnel" });
    }

    const busca = parseAgentInput("/busca");
    if (busca.kind === "message") {
      expect(busca.workspaceCommand).toEqual({ kind: "search" });
    }

    const alertas = parseAgentInput("/alertas");
    if (alertas.kind === "message") {
      expect(alertas.workspaceCommand).toEqual({ kind: "alerts" });
    }

    const projecao = parseAgentInput("/projecao sessões");
    if (projecao.kind === "message") {
      expect(projecao.workspaceCommand).toEqual({
        kind: "projection",
        metricHint: "sessões",
      });
    }
  });

  it("bloqueia comando de loja no Ask", () => {
    expect(isWorkspaceCommandBlockedInAsk({ kind: "chart" })).toBe(true);
    expect(isWorkspaceCommandBlockedInAsk(undefined)).toBe(false);
    expect(ASK_WORKSPACE_BLOCK_MESSAGE).toMatch(/Agent ou Plan/);
  });
});
