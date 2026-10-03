export class VtexApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = "VtexApiError";
    this.status = status;
    this.path = path;
  }
}

export class VtexConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VtexConfigError";
  }
}
