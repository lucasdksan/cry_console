import { describe, expect, it } from "vitest";

import {
  matchPageType,
  validatePathnameGlob,
} from "@/backend/lib/sentry/pathname-glob";

describe("pathname-glob", () => {
  it("validates globs", () => {
    expect(validatePathnameGlob("/")).toBeNull();
    expect(validatePathnameGlob("/p/*")).toBeNull();
    expect(validatePathnameGlob("pdp")).toMatch(/começar/);
    expect(validatePathnameGlob("/x?y=1")).toMatch(/query/);
  });

  it("matches home, pdp and plp patterns", () => {
    const patterns = [
      { pageType: "home" as const, pathnameGlob: "/" },
      { pageType: "pdp" as const, pathnameGlob: "/p/*" },
      { pageType: "plp" as const, pathnameGlob: "/*/p" },
    ];
    expect(matchPageType("/", patterns)).toBe("home");
    expect(matchPageType("/p/sapato-123", patterns)).toBe("pdp");
    expect(matchPageType("/sapatos/p", patterns)).toBe("plp");
    expect(matchPageType("/checkout", patterns)).toBeNull();
  });

  it("supports ** remainder", () => {
    const patterns = [{ pageType: "pdp" as const, pathnameGlob: "/p/**" }];
    expect(matchPageType("/p/a/b/c", patterns)).toBe("pdp");
  });
});
