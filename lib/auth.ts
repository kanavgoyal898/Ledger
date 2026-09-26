import type { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SANITY_API_TOKEN;
  if (!secret) throw new Error("SESSION_SECRET or SANITY_API_TOKEN is required");
  return secret;
}

export function createSessionToken(username: string, maxAge?: number): string {
  const expiresAt = maxAge === undefined ? 0 : Math.floor(Date.now() / 1000) + maxAge;
  const signature = createHmac("sha256", sessionSecret())
    .update(`${username}:${expiresAt}`)
    .digest("base64url");
  return `${expiresAt}.${signature}`;
}

export function getAuthenticatedUsername(request: { cookies: Pick<NextRequest["cookies"], "get"> }): string | null {
  const username = request.cookies.get("ledger_username")?.value?.trim();
  const token = request.cookies.get("ledger_auth")?.value;
  if (!username || !token) return null;
  const separator = token.indexOf(".");
  if (separator < 1) return null;
  const expiresAt = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < 0) return null;
  if (expiresAt !== 0 && expiresAt <= Math.floor(Date.now() / 1000)) return null;
  const expected = createHmac("sha256", sessionSecret())
    .update(`${username}:${expiresAt}`)
    .digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return username;
}
