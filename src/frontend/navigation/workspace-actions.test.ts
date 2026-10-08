import { describe, expect, it } from "vitest";

import { WORKSPACE_ACTION_CATALOG } from "@/frontend/navigation/workspace-actions";

describe("WORKSPACE_ACTION_CATALOG", () => {
  it("inclui rota de observabilidade da loja", () => {
    const item = WORKSPACE_ACTION_CATALOG.find(
      (entry) => entry.id === "observabilidade",
    );
    expect(item).toBeDefined();
    expect(item?.href("cmurmlq200000vcvgzg0f37el")).toBe(
      "/lojas/cmurmlq200000vcvgzg0f37el/observabilidade",
    );
  });
});
