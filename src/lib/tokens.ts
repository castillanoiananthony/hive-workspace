import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Secret link tokens: the raw token goes in an email, only its SHA-256 hash is stored. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function newToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}
