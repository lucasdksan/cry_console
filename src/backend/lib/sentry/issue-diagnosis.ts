import { scrubUrlQuery } from "@/backend/lib/sentry/scrub";

export type IssueFrame = {
  functionName: string | null;
  filename: string | null;
  lineno: number | null;
  inApp: boolean;
  codeLine: string | null;
};

export type ParsedIssueEvent = {
  exceptionType: string | null;
  exceptionValue: string | null;
  pageUrl: string | null;
  culprit: string | null;
  handled: boolean | null;
  filename: string | null;
  functionName: string | null;
  frames: IssueFrame[];
};

export type IssueDiagnosisInput = {
  title: string;
  culprit: string | null;
  exceptionType: string | null;
  exceptionValue: string | null;
  filename: string | null;
  functionName: string | null;
  pageUrl: string | null;
  frames: IssueFrame[];
};

export type IssueDiagnosis = {
  headline: string;
  whatHappened: string;
  exception: string | null;
  where: string | null;
  codeLine: string | null;
  suggestion: string;
  stackLines: string[];
};

export type IssueAnalysisView = {
  whatHappened: string | null;
  possibleCause: string | null;
  suggestion: string | null;
  steps: Array<{ title: string; detail: string }>;
};

type SeerSummary = {
  whatHappened: string | null;
  possibleCause: string | null;
};

type SeerAutofix = {
  rootCause: string | null;
  solutionSummary: string | null;
  steps: IssueAnalysisView["steps"];
};

const EMPTY_AUTOFIX: SeerAutofix = {
  rootCause: null,
  solutionSummary: null,
  steps: [],
};

export function diagnoseObservabilityIssue(
  input: IssueDiagnosisInput,
): IssueDiagnosis {
  const exception = formatException(input.exceptionType, input.exceptionValue);
  const crash = pickCrashFrame(input.frames);
  const functionName = cleanFunction(
    crash?.functionName ?? input.functionName,
  );
  const filename = crash?.filename ?? input.filename;
  const codeLine = clip(crash?.codeLine ?? null, 180);
  const where = buildWhere({
    pageUrl: input.pageUrl,
    culprit: input.culprit,
    functionName,
    filename,
    lineno: crash?.lineno ?? null,
  });
  const copy = describeIssueInPortuguese({
    type: input.exceptionType,
    value: input.exceptionValue,
    title: input.title,
    functionName,
  });

  return {
    headline: copy.headline,
    whatHappened: copy.whatHappened,
    exception,
    where,
    codeLine,
    suggestion: suggestStorefrontFix({
      type: input.exceptionType ?? "",
      value: input.exceptionValue ?? input.title,
      functionName,
      filename: filename ? shortFile(filename) : null,
    }),
    stackLines: formatStack(input.frames),
  };
}

export function describeIssueInPortuguese(input: {
  type: string | null;
  value: string | null;
  title: string;
  functionName: string | null;
}): { headline: string; whatHappened: string } {
  const type = (input.type ?? "").toLowerCase();
  const value = input.value ?? input.title;
  const blob = `${type} ${value}`.toLowerCase();
  const property = readBrokenProperty(value);
  const who = input.functionName ? `A função ${input.functionName}` : "A página";

  if (
    /cannot read propert|is not an object|undefined is not an object|null is not an object/.test(
      blob,
    )
  ) {
    const field = property ? `“${property}”` : "um campo";
    return {
      headline: property ? `Campo “${property}” lido vazio` : "Campo lido de um valor vazio",
      whatHappened: `${who} tentou ler ${field} de um valor que ainda não existia.`,
    };
  }

  if (/is not a function|is not a constructor/.test(blob)) {
    return {
      headline: "Chamada inválida de função",
      whatHappened: `${who} chamou um valor que não é uma função.`,
    };
  }

  if (
    /chunkloaderror|loading chunk|failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module/.test(
      blob,
    )
  ) {
    return {
      headline: "Arquivo da página não carregou",
      whatHappened:
        "O navegador não conseguiu baixar um arquivo necessário para montar a página.",
    };
  }

  if (
    /hydration|text content does not match|did not match|minified react error #41[85]|minified react error #42[35]|minified react error #329/.test(
      blob,
    )
  ) {
    return {
      headline: "Página diferente entre servidor e navegador",
      whatHappened:
        "O HTML enviado pelo servidor não bateu com o que o navegador montou.",
    };
  }

  if (
    /failed to fetch|networkerror|network request failed|load failed|timeout|aborted/.test(
      blob,
    )
  ) {
    return {
      headline: "Falha de rede na página",
      whatHappened: `${who} não conseguiu completar uma chamada de rede.`,
    };
  }

  if (/resizeobserver loop/.test(blob)) {
    return {
      headline: "Aviso ao medir o layout",
      whatHappened: "O navegador interrompeu um cálculo de tamanho da página.",
    };
  }

  if (/script error/.test(blob)) {
    return {
      headline: "Erro em script de terceiro",
      whatHappened:
        "Um script de outro domínio falhou e o navegador escondeu o detalhe.",
    };
  }

  if (/quotaexceeded/.test(blob)) {
    return {
      headline: "Armazenamento do navegador cheio",
      whatHappened: "O navegador recusou gravar mais dados locais da visita.",
    };
  }

  if (/securityerror|blocked a frame|cross-origin/.test(blob)) {
    return {
      headline: "Acesso bloqueado pelo navegador",
      whatHappened: "O navegador bloqueou um acesso entre páginas ou iframes.",
    };
  }

  if (
    type.includes("syntaxerror") ||
    /unexpected token|unexpected end of json/.test(blob)
  ) {
    return {
      headline: "Resposta em formato inválido",
      whatHappened: "A página recebeu uma resposta que não conseguiu interpretar.",
    };
  }

  const custom = portugueseMessage(value, input.title);
  if (custom) {
    return {
      headline: clip(custom, 90) ?? "Falha na página",
      whatHappened: /[.!?]$/.test(custom) ? custom : `${custom}.`,
    };
  }

  return {
    headline: "Falha na página",
    whatHappened: input.functionName
      ? `A função ${input.functionName} interrompeu o carregamento da página.`
      : "O script da página foi interrompido por uma falha.",
  };
}

export function proseNeedsPortuguese(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || looksPortuguese(trimmed)) {
    return false;
  }
  return trimmed.split(/\s+/).length >= 3;
}

export function suggestStorefrontFix(input: {
  type: string;
  value: string;
  functionName: string | null;
  filename: string | null;
}): string {
  const type = input.type.toLowerCase();
  const value = input.value;
  const blob = `${type} ${value}`.toLowerCase();
  const fn = input.functionName;
  const property = readBrokenProperty(value);
  const place = fn
    ? `em ${fn}`
    : input.filename
      ? `em ${input.filename}`
      : "nesse ponto da página";

  if (
    /cannot read propert|is not an object|undefined is not an object|null is not an object/.test(
      blob,
    )
  ) {
    const field = property ? `“${property}”` : "um campo";
    return `O código tentou ler ${field} de um valor vazio ${place}. Espere o dado da página (produto, preço ou lista) chegar antes de usar esse campo e trate o caso vazio sem quebrar a tela.`;
  }

  if (/is not a function|is not a constructor/.test(blob)) {
    return `Algo foi chamado como função e não era ${place}. Confira se o método existe no objeto que a página recebeu e não chame quando o valor vier incompleto.`;
  }

  if (
    /chunkloaderror|loading chunk|failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module/.test(
      blob,
    )
  ) {
    return "O navegador não baixou um arquivo da página — em geral cache antigo ou publicação no meio da visita. Recarregar resolve para quem já estava no site. Depois do deploy, mantenha os arquivos anteriores no ar por alguns minutos.";
  }

  if (
    /hydration|text content does not match|did not match|minified react error #41[85]|minified react error #42[35]|minified react error #329/.test(
      blob,
    )
  ) {
    return "O HTML enviado pelo servidor não bate com o que o navegador monta. Revise dados que mudam entre as duas etapas (preço, estoque, usuário logado, data) e deixe no cliente o trecho que depende do navegador.";
  }

  if (
    /failed to fetch|networkerror|network request failed|load failed|timeout|aborted/.test(
      blob,
    )
  ) {
    return `Uma chamada de rede falhou ${place}. Confira se a API, a busca ou o checkout respondeu a tempo e o que a tela faz quando a resposta não chega.`;
  }

  if (/resizeobserver loop/.test(blob)) {
    return "O navegador avisou um loop ao medir o layout. Isso costuma ser inofensivo. Só vale investigar se a página estiver piscando ou travando a rolagem.";
  }

  if (/^script error\.?$/.test(value.trim().toLowerCase()) || blob.includes("script error")) {
    return "O navegador escondeu o detalhe porque o script é de outro domínio (pixel, chat, antifraude ou player). Confira os scripts de terceiros dessa página e o que acontece se um deles não carregar.";
  }

  if (/quotaexceeded/.test(blob)) {
    return "O navegador recusou gravar mais dados locais (carrinho ou sessão). Apague chaves antigas antes de salvar e limite o tamanho do que fica no armazenamento.";
  }

  if (/securityerror|blocked a frame|cross-origin/.test(blob)) {
    return "O navegador bloqueou um acesso entre páginas ou iframes. Revise embeds, redirecionamentos e a política de segurança do site.";
  }

  if (
    type.includes("syntaxerror") ||
    /unexpected token|unexpected end of json/.test(blob)
  ) {
    return "A resposta recebida não veio no formato esperado. Confira o corpo da API antes de interpretar e mostre um estado de erro em vez de quebrar a tela.";
  }

  return `A falha acontece ${place}. Reproduza essa página, confira o dado que esse ponto espera e impeça o fluxo de seguir quando ele não vier.`;
}

export function parseSentryLatestEvent(payload: unknown): ParsedIssueEvent | null {
  const event = asRecord(payload);
  if (!event) {
    return null;
  }

  const values = readExceptionValues(event);
  const chosen = pickExceptionValue(values);
  const frames = readFrames(chosen);
  const crash = pickCrashFrame(frames);
  const metadata = asRecord(event.metadata);
  const mechanism = chosen ? asRecord(chosen.mechanism) : null;
  const handled =
    typeof mechanism?.handled === "boolean" ? mechanism.handled : null;

  const pageUrl =
    readTag(event, "url") ??
    readRequestUrl(event) ??
    asPage(readTag(event, "transaction"));

  return {
    exceptionType:
      readString(chosen, "type") ?? readString(metadata, "type"),
    exceptionValue:
      readString(chosen, "value") ?? readString(metadata, "value"),
    pageUrl,
    culprit: readString(event, "culprit"),
    handled,
    filename:
      crash?.filename ??
      readString(metadata, "filename") ??
      readString(chosen, "filename"),
    functionName:
      crash?.functionName ??
      cleanFunction(readString(metadata, "function")),
    frames,
  };
}

export function parseSeerSummary(payload: unknown): SeerSummary | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }
  const body = asRecord(root.summary) ?? root;
  const whatsWrong = readString(body, "whatsWrong", "whats_wrong");
  const headline = readString(body, "headline");
  const possibleCause = readString(body, "possibleCause", "possible_cause");
  const whatHappened = clip(whatsWrong ?? headline, 500);
  const cause = clip(possibleCause, 500);
  if (!whatHappened && !cause) {
    return null;
  }
  return { whatHappened, possibleCause: cause };
}

export function parseSeerAutofix(payload: unknown): SeerAutofix {
  const root = asRecord(payload);
  if (!root) {
    return EMPTY_AUTOFIX;
  }
  const autofix = "autofix" in root ? root.autofix : payload;
  if (!autofix || typeof autofix !== "object") {
    return EMPTY_AUTOFIX;
  }
  const acc: SeerAutofix = {
    rootCause: null,
    solutionSummary: null,
    steps: [],
  };
  walkAutofix(autofix, 0, acc);
  return {
    rootCause: clip(acc.rootCause, 500),
    solutionSummary: clip(acc.solutionSummary, 500),
    steps: acc.steps.slice(0, 5).map((step) => ({
      title: clip(step.title, 120) ?? "Passo",
      detail: clip(step.detail, 300) ?? "",
    })),
  };
}

export function combineIssueAnalysis(
  summary: SeerSummary | null,
  autofix: SeerAutofix,
): IssueAnalysisView | null {
  const whatHappened = summary?.whatHappened ?? null;
  const rootCause = autofix.rootCause ?? summary?.possibleCause ?? null;
  const suggestion = autofix.solutionSummary;
  const possibleCause =
    rootCause && rootCause !== whatHappened && rootCause !== suggestion
      ? rootCause
      : null;

  if (
    !whatHappened &&
    !possibleCause &&
    !suggestion &&
    autofix.steps.length === 0
  ) {
    return null;
  }

  return {
    whatHappened,
    possibleCause,
    suggestion,
    steps: autofix.steps,
  };
}

function buildWhere(input: {
  pageUrl: string | null;
  culprit: string | null;
  functionName: string | null;
  filename: string | null;
  lineno: number | null;
}): string | null {
  const page = asPage(input.pageUrl) ?? asPage(input.culprit);
  const file = input.filename ? shortFile(input.filename) : null;
  const loc = file
    ? input.lineno
      ? `${file}:${input.lineno}`
      : file
    : null;
  const place =
    input.functionName && loc
      ? `${input.functionName} em ${loc}`
      : input.functionName ?? loc;
  const parts = [page, place].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatException(
  type: string | null,
  value: string | null,
): string | null {
  if (type && value) {
    if (value.toLowerCase().startsWith(type.toLowerCase())) {
      return value;
    }
    return `${type}: ${value}`;
  }
  return value ?? type;
}

function formatStack(frames: IssueFrame[]): string[] {
  const relevant = frames.some((frame) => frame.inApp)
    ? frames.filter((frame) => frame.inApp)
    : frames;
  return relevant
    .slice(-4)
    .reverse()
    .map((frame) => {
      const file = frame.filename ? shortFile(frame.filename) : null;
      const loc = file
        ? frame.lineno
          ? `${file}:${frame.lineno}`
          : file
        : null;
      if (frame.functionName && loc) {
        return `${frame.functionName} — ${loc}`;
      }
      return frame.functionName ?? loc;
    })
    .filter((line): line is string => Boolean(line));
}

function pickCrashFrame(frames: IssueFrame[]): IssueFrame | null {
  if (frames.length === 0) {
    return null;
  }
  const inApp = frames.filter((frame) => frame.inApp);
  return inApp.at(-1) ?? frames.at(-1) ?? null;
}

function pickExceptionValue(
  values: Record<string, unknown>[],
): Record<string, unknown> | null {
  if (values.length === 0) {
    return null;
  }
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (!value) {
      continue;
    }
    if (readString(value, "type") || readString(value, "value") || readFrames(value).length > 0) {
      return value;
    }
  }
  return values.at(-1) ?? null;
}

function readExceptionValues(event: Record<string, unknown>): Record<string, unknown>[] {
  const direct = asRecord(event.exception);
  const directValues = direct && Array.isArray(direct.values) ? direct.values : null;
  if (directValues) {
    return directValues.map(asRecord).filter((value): value is Record<string, unknown> => Boolean(value));
  }

  const entries = Array.isArray(event.entries) ? event.entries : [];
  for (const entry of entries) {
    const rec = asRecord(entry);
    if (!rec || rec.type !== "exception") {
      continue;
    }
    const data = asRecord(rec.data);
    if (!data || !Array.isArray(data.values)) {
      continue;
    }
    return data.values
      .map(asRecord)
      .filter((value): value is Record<string, unknown> => Boolean(value));
  }
  return [];
}

function readFrames(exceptionValue: Record<string, unknown> | null): IssueFrame[] {
  if (!exceptionValue) {
    return [];
  }
  const stack = asRecord(exceptionValue.stacktrace);
  const rawFrames = stack && Array.isArray(stack.frames) ? stack.frames : [];
  return rawFrames
    .map(readFrame)
    .filter((frame): frame is IssueFrame => Boolean(frame));
}

function readFrame(payload: unknown): IssueFrame | null {
  const rec = asRecord(payload);
  if (!rec) {
    return null;
  }
  const filename = readString(rec, "filename", "absPath", "abs_path");
  const functionName = cleanFunction(readString(rec, "function", "functionName"));
  const lineno = readNumber(rec, "lineno", "lineNo");
  const inApp = rec.inApp === true || rec.in_app === true;
  const codeLine = readContextLine(rec, lineno);
  if (!filename && !functionName && !codeLine) {
    return null;
  }
  return { functionName, filename, lineno, inApp, codeLine };
}

function readContextLine(
  rec: Record<string, unknown>,
  lineno: number | null,
): string | null {
  const direct = readString(rec, "contextLine", "context_line");
  if (direct) {
    return direct.trim();
  }
  if (!Array.isArray(rec.context)) {
    return null;
  }
  let fallback: string | null = null;
  for (const row of rec.context) {
    if (!Array.isArray(row) || row.length < 2 || typeof row[1] !== "string") {
      continue;
    }
    const text = row[1].trim();
    if (!text) {
      continue;
    }
    fallback = text;
    if (lineno !== null && row[0] === lineno) {
      return text;
    }
  }
  return fallback;
}

function readRequestUrl(event: Record<string, unknown>): string | null {
  const entries = Array.isArray(event.entries) ? event.entries : [];
  for (const entry of entries) {
    const rec = asRecord(entry);
    if (!rec || rec.type !== "request") {
      continue;
    }
    const data = asRecord(rec.data);
    const url = data ? readString(data, "url") : null;
    if (url) {
      return url;
    }
  }
  const request = asRecord(event.request);
  return request ? readString(request, "url") : null;
}

function readTag(event: Record<string, unknown>, key: string): string | null {
  const tags = event.tags;
  if (Array.isArray(tags)) {
    for (const tag of tags) {
      const rec = asRecord(tag);
      if (rec?.key === key) {
        return readString(rec, "value");
      }
    }
  }
  const map = asRecord(tags);
  return map ? readString(map, key) : null;
}

function walkAutofix(node: unknown, depth: number, acc: SeerAutofix): void {
  if (depth > 6 || !node || typeof node !== "object") {
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      walkAutofix(item, depth + 1, acc);
    }
    return;
  }

  const rec = node as Record<string, unknown>;
  if (!acc.rootCause) {
    acc.rootCause = readString(rec, "one_line_description", "oneLineDescription");
  }
  if (!acc.solutionSummary) {
    acc.solutionSummary = readString(rec, "one_line_summary", "oneLineSummary");
  }
  if (acc.steps.length === 0) {
    const fromSteps = readSteps(rec.steps);
    const fromSolution = readSteps(rec.solution);
    acc.steps = fromSteps.length > 0 ? fromSteps : fromSolution;
  }

  for (const value of Object.values(rec)) {
    if (value && typeof value === "object") {
      walkAutofix(value, depth + 1, acc);
    }
  }
}

function readSteps(value: unknown): IssueAnalysisView["steps"] {
  if (!Array.isArray(value)) {
    return [];
  }
  const steps: IssueAnalysisView["steps"] = [];
  for (const item of value) {
    const rec = asRecord(item);
    if (!rec) {
      continue;
    }
    const title = readString(rec, "title");
    const detail = readString(rec, "description", "detail");
    if (!title && !detail) {
      continue;
    }
    steps.push({
      title: title ?? "Passo",
      detail: detail ?? "",
    });
  }
  return steps;
}

function portugueseMessage(value: string, title: string): string | null {
  const raw = (value || title).trim();
  const stripped = raw
    .replace(/^(?:uncaught\s+)?(?:[a-z]*error|error):\s*/i, "")
    .trim();
  if (!stripped || !looksPortuguese(stripped)) {
    return null;
  }
  return stripped;
}

function looksPortuguese(text: string): boolean {
  if (/[áàâãéêíóôõúç]/i.test(text)) {
    return true;
  }
  return /\b(não|nao|erro|página|pagina|falha|produto|carrinho|vazio|simulado|função|funcao|campo|antes|quando|valor)\b/i.test(
    text,
  );
}

function readBrokenProperty(value: string): string | null {
  const reading = value.match(/reading ['"]([^'"]+)['"]/i);
  if (reading?.[1]) {
    return reading[1];
  }
  const property = value.match(/property ['"]([^'"]+)['"]/i);
  return property?.[1] ?? null;
}

function asPage(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  if (
    !raw.startsWith("http://") &&
    !raw.startsWith("https://") &&
    !raw.startsWith("/")
  ) {
    return null;
  }
  const scrubbed = raw.startsWith("/") ? raw : scrubUrlQuery(raw);
  try {
    const url = new URL(scrubbed, "https://loja.local");
    const path = url.pathname || "/";
    return path.length > 72 ? `${path.slice(0, 69)}…` : path;
  } catch {
    const path = scrubbed.split("?")[0] ?? scrubbed;
    return path.length > 72 ? `${path.slice(0, 69)}…` : path;
  }
}

function shortFile(filename: string): string {
  const noQuery = filename.split("?")[0] ?? filename;
  const base = noQuery.split("/").filter(Boolean).at(-1) ?? noQuery;
  return base.length > 48 ? `${base.slice(0, 45)}…` : base;
}

function cleanFunction(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed === "?" ||
    trimmed === "<anonymous>" ||
    trimmed === "anonymous"
  ) {
    return null;
  }
  return trimmed;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(
  rec: Record<string, unknown> | null,
  ...keys: string[]
): string | null {
  if (!rec) {
    return null;
  }
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readNumber(
  rec: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function clip(value: string | null, max: number): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}
