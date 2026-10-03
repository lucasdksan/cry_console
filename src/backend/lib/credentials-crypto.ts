import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from "node:crypto";

export const SECRET_FIELDS = [
  "vtexAppKey",
  "vtexAppToken",
  "clarityToken",
  "gaServiceAccount",
] as const;

export type SecretField = (typeof SECRET_FIELDS)[number];

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export class CredentialsCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialsCryptoError";
  }
}

function parseEncryptionKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new CredentialsCryptoError(
      "CREDENTIALS_ENCRYPTION_KEY não está configurada.",
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new CredentialsCryptoError(
      "CREDENTIALS_ENCRYPTION_KEY deve ter 32 bytes em base64.",
    );
  }

  return key;
}

export function isCredentialsEncryptionConfigured(): boolean {
  try {
    parseEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

function aadFor(workspaceId: string, field: SecretField): Buffer {
  return Buffer.from(`${workspaceId}:${field}`, "utf8");
}

export function encryptSecret(
  plaintext: string,
  workspaceId: string,
  field: SecretField,
): string {
  const key = parseEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv) as CipherGCM;
  cipher.setAAD(aadFor(workspaceId, field));

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptSecret(
  payload: string,
  workspaceId: string,
  field: SecretField,
): string {
  const key = parseEncryptionKey();
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new CredentialsCryptoError("Formato de segredo inválido.");
  }

  const [, ivPart, tagPart, dataPart] = parts;
  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  const ciphertext = Buffer.from(dataPart, "base64url");

  const decipher = createDecipheriv(ALGORITHM, key, iv) as DecipherGCM;
  decipher.setAAD(aadFor(workspaceId, field));
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
