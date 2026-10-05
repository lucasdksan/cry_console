<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Cry Console — guia para agentes

Documentação operacional do repositório. Visão de produto e diagramas mais amplos: [README.md](./README.md).

## O que é este projeto

Monólito **Next.js 16** (App Router) para o Cry Console — plataforma B2B de insights para e-commerce. Hoje o código cobre **autenticação**, **proxy de rotas** e **shell** da área privada; integrações (GA4, Clarity, GSC, VTEX) são roadmap.

## Onde colocar código

| Intenção | Local |
|----------|--------|
| Nova página ou layout | `src/app/` — preferir grupos `(public)` ou `(private)` |
| Rota HTTP / webhook | `src/app/api/...` |
| Regra de sessão, redirect, rate limit na borda | `src/proxy.ts` + `src/backend/lib/proxy/` |
| Server Action ou mutação server-side | `src/backend/controllers/` (`"use server"`) |
| Query/mutation Prisma por entidade | `src/backend/models/` |
| Config Auth.js, callbacks | `src/backend/auth.ts`, `auth.config.ts` |
| Utilitário backend sem I/O | `src/backend/lib/<domínio>/` (ver abaixo) |
| Helper de UI ou browser (client) | `src/frontend/lib/` — ex.: `utils.ts`, `browser/prompt.ts` |
| Componente visual reutilizável | `src/frontend/components/` (átomos → templates) |
| Primitivo shadcn | `src/frontend/components/ui/` |
| Schema e migrations | `prisma/` — client gerado em `src/generated/prisma` (**não editar**) |

**Evitar:** lógica de negócio ou Prisma dentro de componentes React; duplicar listas de rotas públicas fora de `proxy/routes.ts`; arquivos soltos na raiz de `backend/lib` (use a pasta do domínio).

### `src/backend/lib/` — pastas

Código puro ou infra por domínio, **sem prefixo repetido no nome do arquivo** (ex.: `agent/prompt.ts`, não `agent/agent-prompt.ts`):

| Pasta | Conteúdo |
|-------|----------|
| `account/` | políticas e crypto de conta |
| `agent/` | chat, plano, gráficos do agente |
| `ai/` | roteamento e geração de texto |
| `analysis/` | heurísticas, LLM, scoring, DTOs |
| `auth/` | rate limit, redirect, tokens |
| `clarity/`, `google/`, `measurement/`, `sentry/`, `vtex/` | integrações |
| `overview/` | visão geral e status de fontes |
| `proxy/` | rotas públicas e política do proxy |
| `shared/` | adaptadores usados por vários domínios |
| `workspace/` | métricas, períodos, políticas de loja |

Orquestração com I/O de banco deve ficar em **controllers** ou **models**, não em `lib`.

## Aliases TypeScript

- `@/*` → `src/*` (`tsconfig.json`) — ex.: `@/backend/auth`, `@/frontend/components/ui/button`.
- shadcn (`components.json`): `@/frontend/components`, `@/frontend/lib/utils`, `@/ui` → `components/ui`.

Importe auth via `@/backend/auth` (`auth`, `signIn`, `signOut`, `handlers`).

## Backend — camadas

1. **Controllers** — validam entrada (Zod), chamam models/lib, redirecionam ou retornam erros de formulário.
2. **Models** — único lugar para `prisma.*` de domínio (User, PasswordResetToken, etc.).
3. **Lib** — políticas puras ou infra compartilhada (`sanitizeRedirectPath`, rate limit, hash de tokens).

Auth usa **Prisma Adapter** + sessão JWT enriquecida com `user.id` nos callbacks.

## Frontend — camadas

- **Pages** (`src/app/**/page.tsx`) — Server Components quando possível; leem `auth()` se necessário.
- **Organisms** — formulários com estado client; recebem actions do controller.
- **Templates** — layout de fluxo (ex.: split auth).
- Estilo: **Tailwind 4** + tokens em `src/app/globals.css`; componentes UI seguem shadcn **base-nova**.

## Proxy (`src/proxy.ts`)

Substitui o middleware tradicional nesta versão do Next. Ao alterar comportamento de acesso:

1. Atualize `publicRoutes` / helpers em `backend/lib/proxy/routes.ts`.
2. Ajuste `resolveProxyRedirect` em `backend/lib/proxy/policy.ts` se a regra for mais complexa.
3. Mantenha testes em `*.test.ts` alinhados (Vitest).

Matcher atual exclui `api`, assets estáticos e arquivos com extensão.

## Dados

- PostgreSQL via `DATABASE_URL`; migrations usam `DIRECT_URL` quando definido (`prisma.config.ts`).
- Após mudar `schema.prisma`: `pnpm exec prisma migrate dev` (local) e commitar migrations.

## Testes e qualidade

- Testes unitários (Vitest): colocalize `*.test.ts` ao lado do módulo em `src/backend/lib/**` ou `src/frontend/**` (ex.: `navigation/filter-nav.test.ts`); include: `src/**/*.test.ts` — rode `pnpm test`.
- E2E (Playwright): `tests/e2e/` — `pnpm test:e2e`.
- Antes de PR: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Commits (time)

Formato: `[número da task] - [tipo] - [descrição em PT-BR imperativo]`.

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`. Branch `task_XXXXX` → número `XXXXX`. Sem task: Conventional Commits em PT-BR.

## Segredos

Nunca commitar `.env`. Placeholders em `.env.example` apenas.
