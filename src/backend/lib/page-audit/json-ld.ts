export function extractJsonLdTypes(blocks: string[]): string[] {
  const types = new Set<string>();

  function collect(node: unknown): void {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (const item of node) collect(item);
      return;
    }
    if (typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const typeField = record["@type"];
    if (typeof typeField === "string") {
      types.add(typeField);
    } else if (Array.isArray(typeField)) {
      for (const t of typeField) {
        if (typeof t === "string") types.add(t);
      }
    }
    for (const value of Object.values(record)) {
      if (typeof value === "object") collect(value);
    }
  }

  for (const block of blocks) {
    try {
      collect(JSON.parse(block));
    } catch {
      for (const match of block.matchAll(/"@type"\s*:\s*"([^"]+)"/gi)) {
        types.add(match[1]!);
      }
    }
  }

  return [...types];
}

export function jsonLdHasType(blocks: string[], typeName: string): boolean {
  const hay = typeName.toLowerCase();
  return extractJsonLdTypes(blocks).some((t) => t.toLowerCase() === hay);
}
