import { describe, expect, it } from "vitest";

import { scrubEnvelopeBody, scrubUrlQuery } from "@/backend/lib/sentry/scrub";

describe("scrub", () => {
  it("redacts sensitive query params in URLs", () => {
    const url = scrubUrlQuery(
      "https://loja.com/p/x?email=a@b.com&page=2&token=secret",
    );
    expect(url).toContain("email=%5BFiltered%5D");
    expect(url).toContain("token=%5BFiltered%5D");
    expect(url).toContain("page=2");
  });

  it("scrubs envelope payload strings", () => {
    const body =
      '{"request":{"url":"https://x.com/?cpf=123&ok=1"}}';
    expect(scrubEnvelopeBody(body)).toContain("cpf=[Filtered]");
    expect(scrubEnvelopeBody(body)).toContain("ok=1");
  });
});
