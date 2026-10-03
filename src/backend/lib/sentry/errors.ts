export class SentryConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SentryConfigError";
  }
}

export class SentryApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = "SentryApiError";
    this.status = status;
    this.path = path;
  }
}
