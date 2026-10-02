import { describe, expect, it } from "vitest";

import {
  filterNavFooter,
  filterNavSections,
  navHasVisibleTargets,
} from "@/frontend/navigation/filter-nav";
import {
  defaultNavFooter,
  defaultNavSections,
  LogOut,
} from "@/frontend/navigation/nav";

describe("filterNavSections", () => {
  it("retorna tudo quando a busca está vazia", () => {
    expect(filterNavSections(defaultNavSections, "")).toEqual(defaultNavSections);
    expect(filterNavSections(defaultNavSections, "   ")).toEqual(
      defaultNavSections,
    );
  });

  it("filtra link pelo rótulo sem diferenciar maiúsculas", () => {
    const filtered = filterNavSections(defaultNavSections, "VISÃO");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toMatchObject({ type: "group", label: "Geral" });
  });

  it("remove grupo sem filhos após filtrar", () => {
    expect(filterNavSections(defaultNavSections, "inexistente")).toEqual([]);
  });
});

describe("filterNavFooter", () => {
  it("mantém slot sem rótulo durante a busca", () => {
    const filtered = filterNavFooter(defaultNavFooter, "xyz");
    expect(filtered).toEqual([{ type: "slot", id: "session" }]);
  });

  it("filtra ação pelo rótulo", () => {
    const filtered = filterNavFooter(defaultNavFooter, "sair");
    expect(filtered).toEqual([
      { type: "slot", id: "session" },
      {
        type: "action",
        id: "logout",
        label: "Sair",
        icon: LogOut,
      },
    ]);
  });
});

describe("navHasVisibleTargets", () => {
  it("detecta quando só restam slots", () => {
    expect(
      navHasVisibleTargets(
        filterNavSections(defaultNavSections, "nada"),
        filterNavFooter(defaultNavFooter, "nada"),
      ),
    ).toBe(false);
  });

  it("detecta destinos visíveis após filtro parcial", () => {
    expect(
      navHasVisibleTargets(
        filterNavSections(defaultNavSections, "visão"),
        filterNavFooter(defaultNavFooter, "nada"),
      ),
    ).toBe(true);
  });
});
