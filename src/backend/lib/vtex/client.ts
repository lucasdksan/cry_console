import { VtexApiError } from "@/backend/lib/vtex/errors";

export type VtexClientConfig = {
  account: string;
  environment: string;
  appKey: string;
  appToken: string;
  timeoutMs?: number;
};

export type VtexRequestParams = Record<
  string,
  string | number | boolean | undefined | null
>;

const DEFAULT_TIMEOUT_MS = 60_000;

export function buildVtexBaseUrl(account: string, environment: string): string {
  return `https://${account}.${environment}.com.br`;
}

export class VtexClient {
  readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(config: VtexClientConfig) {
    this.baseUrl = buildVtexBaseUrl(config.account, config.environment);
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.headers = {
      "X-VTEX-API-AppKey": config.appKey,
      "X-VTEX-API-AppToken": config.appToken,
      Accept: "application/json",
    };
  }

  async get(path: string, params?: VtexRequestParams): Promise<unknown> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: this.headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new VtexApiError(
          text || `VTEX HTTP ${response.status}`,
          response.status,
          path,
        );
      }

      if (response.status === 204) {
        return null;
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength === "0") {
        return null;
      }

      const text = await response.text();
      if (!text.trim()) {
        return null;
      }

      return JSON.parse(text) as unknown;
    } catch (error) {
      if (error instanceof VtexApiError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new VtexApiError("VTEX request timeout", 408, path);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async getPaginated(
    path: string,
    params?: VtexRequestParams,
    options?: { maxPages?: number; perPage?: number },
  ): Promise<unknown[]> {
    const maxPages = options?.maxPages ?? 200;
    const perPage =
      options?.perPage ??
      Number((params?.per_page as number | undefined) ?? 50);

    const allItems: unknown[] = [];
    let page = 1;

    while (page <= maxPages) {
      const query: VtexRequestParams = { ...(params ?? {}), page, per_page: perPage };
      const data = await this.get(path, query);

      if (Array.isArray(data)) {
        if (data.length === 0) {
          break;
        }
        allItems.push(...data);
        if (data.length < perPage) {
          break;
        }
      } else if (data !== null && typeof data === "object") {
        const record = data as Record<string, unknown>;
        const items =
          record.list ?? record.items ?? record.data ?? [];
        if (!Array.isArray(items) || items.length === 0) {
          break;
        }
        allItems.push(...items);
        if (items.length < perPage) {
          break;
        }
      } else {
        break;
      }

      page += 1;
    }

    return allItems;
  }
}

export async function validateVtexCredentials(
  config: VtexClientConfig,
): Promise<boolean> {
  const client = new VtexClient(config);
  try {
    await client.get("/api/oms/pvt/orders", { page: 1, per_page: 1 });
    return true;
  } catch {
    return false;
  }
}
