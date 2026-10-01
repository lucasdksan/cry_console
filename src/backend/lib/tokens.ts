import { createHash, randomBytes } from "crypto";

export function createResetToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);

  return { token, tokenHash };
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
