import { describe, expect, it } from "vitest";

import {
  configDotsForWorkspace,
  isGa4Configured,
  isVtexConfigured,
  sourceStateFromCollect,
} from "@/backend/lib/overview-status";
import type { WorkspaceOverviewListItem } from "@/backend/models/workspace.model";

function workspace(
  partial: Partial<WorkspaceOverviewListItem>,
): WorkspaceOverviewListItem {
  return {
    id: "ws1",
    name: "Loja",
    siteUrl: "https://loja.example",
    vtexAccountName: null,
    vtexEnvironment: null,
    hasVtexAppKey: false,
    hasVtexAppToken: false,
    hasClarityToken: false,
    hasGaServiceAccount: false,
    gaPropertyId: null,
    ...partial,
  };
}

describe("overview-status", () => {
  it("detecta VTEX configurado", () => {
    expect(
      isVtexConfigured(
        workspace({
          vtexAccountName: "acct",
          vtexEnvironment: "vtexcommercestable",
          hasVtexAppKey: true,
          hasVtexAppToken: true,
        }),
      ),
    ).toBe(true);
  });

  it("GA4 exige service account e property id", () => {
    expect(
      isGa4Configured(
        workspace({ hasGaServiceAccount: true, gaPropertyId: "123" }),
      ),
    ).toBe(true);
    expect(
      isGa4Configured(workspace({ hasGaServiceAccount: true, gaPropertyId: null })),
    ).toBe(false);
  });

  it("configDots marca missing vs untested", () => {
    const dots = configDotsForWorkspace(
      workspace({ hasClarityToken: true, hasGaServiceAccount: true, gaPropertyId: "1" }),
    );
    expect(dots.clarity).toBe("untested");
    expect(dots.analytics).toBe("untested");
    expect(dots.vtex).toBe("missing");
  });

  it("sourceStateFromCollect reflete coleta", () => {
    expect(sourceStateFromCollect(true, "ok").dot).toBe("ok");
    expect(sourceStateFromCollect(true, "failed", "erro").dot).toBe("failed");
    expect(sourceStateFromCollect(false, "ok").dot).toBe("missing");
  });
});
