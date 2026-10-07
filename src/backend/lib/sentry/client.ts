import {
  assertSentryTokenCanManageProjects,
  messageForSentryApiFailure,
} from "@/backend/lib/sentry/api-error";
import {
  parseSentryServerConfig,
  sentryProjectSlugForWorkspace,
} from "@/backend/lib/sentry/config";
import { SentryApiError } from "@/backend/lib/sentry/errors";

const SENTRY_API_BASE = "https://sentry.io/api/0";

export type SentryProjectRecord = {
  projectId: string;
  projectSlug: string;
  publicKey: string;
  ingestHost: string;
};

type SentryProjectResponse = {
  id: string;
  slug: string;
};

type SentryKeyResponse = {
  id: string;
  name: string;
  public: string | null;
  secret: string | null;
  dsn?: {
    public: string;
    secret: string;
    cdn?: string;
  };
};

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function sentryFetch<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const { authToken } = parseSentryServerConfig();
  const response = await fetch(`${SENTRY_API_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders(authToken),
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new SentryApiError(
      messageForSentryApiFailure(response.status, text, authToken),
      response.status,
      path,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function parseDsnParts(dsnPublic: string): {
  publicKey: string;
  ingestHost: string;
  projectId: string;
} {
  const url = new URL(dsnPublic);
  const publicKey = url.username;
  const ingestHost = url.host;
  const projectId = url.pathname.replace(/^\//, "");
  if (!publicKey || !ingestHost || !projectId) {
    throw new SentryApiError("DSN inválido retornado pelo Sentry.", 500, "dsn");
  }
  return { publicKey, ingestHost, projectId };
}

export async function createJavascriptProjectForWorkspace(
  workspaceId: string,
  workspaceName: string,
): Promise<SentryProjectRecord> {
  const { orgSlug, teamSlug, authToken } = parseSentryServerConfig();
  assertSentryTokenCanManageProjects(authToken);
  const slug = sentryProjectSlugForWorkspace(workspaceId);

  let project: SentryProjectResponse;
  try {
    project = await sentryFetch<SentryProjectResponse>(
      `/teams/${orgSlug}/${teamSlug}/projects/`,
      {
        method: "POST",
        body: JSON.stringify({
          name: workspaceName.slice(0, 50) || slug,
          slug,
          platform: "javascript",
        }),
      },
    );
  } catch (error) {
    if (
      error instanceof SentryApiError &&
      error.status === 409
    ) {
      project = await sentryFetch<SentryProjectResponse>(
        `/projects/${orgSlug}/${slug}/`,
        { method: "GET" },
      );
    } else {
      throw error;
    }
  }

  const keys = await sentryFetch<SentryKeyResponse[]>(
    `/projects/${orgSlug}/${project.slug}/keys/`,
    { method: "GET" },
  );

  const defaultKey =
    keys.find((k) => k.name === "Default") ?? keys[0];
  if (!defaultKey?.dsn?.public) {
    throw new SentryApiError(
      "Nenhuma client key padrão encontrada no projeto Sentry.",
      500,
      "keys",
    );
  }

  const parts = parseDsnParts(defaultKey.dsn.public);

  return {
    projectId: parts.projectId,
    projectSlug: project.slug,
    publicKey: parts.publicKey,
    ingestHost: parts.ingestHost,
  };
}

export async function deleteSentryProject(projectSlug: string): Promise<void> {
  const { orgSlug, authToken } = parseSentryServerConfig();
  assertSentryTokenCanManageProjects(authToken);
  await sentryFetch<void>(`/projects/${orgSlug}/${projectSlug}/`, {
    method: "DELETE",
  });
}

export function buildPublicDsn(record: {
  publicKey: string;
  ingestHost: string;
  projectId: string;
}): string {
  return `https://${record.publicKey}@${record.ingestHost}/${record.projectId}`;
}
