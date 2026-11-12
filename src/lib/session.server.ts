import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

const COOKIE_NAME = "storyhouse_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours, mirrors the original session lifetime

export interface SessionPayload {
  email: string;
  role: "reader" | "admin";
  exp: number;
}

function getSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 cryptographically random bytes.");
  }
  return secret;
}

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSessionPayload(payload: SessionPayload): Promise<string> {
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  // Configuration failures deliberately remain visible; malformed or forged tokens fail closed.
  const key = await hmacKey();
  try {
    const [body, encodedSignature] = parts;
    if (!body || !encodedSignature) return null;
    const signature = base64UrlToBytes(encodedSignature);
    const signatureBuffer = new Uint8Array(signature.byteLength);
    signatureBuffer.set(signature);
    const bodyBytes = encoder.encode(body);
    const bodyBuffer = new Uint8Array(bodyBytes.byteLength);
    bodyBuffer.set(bodyBytes);
    const valid = await crypto.subtle.verify("HMAC", key, signatureBuffer.buffer, bodyBuffer.buffer);
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as Partial<SessionPayload>;
    if (
      typeof payload.email !== "string" ||
      payload.email.length < 3 ||
      payload.email.length > 254 ||
      (payload.role !== "reader" && payload.role !== "admin") ||
      typeof payload.exp !== "number" ||
      !Number.isSafeInteger(payload.exp)
    ) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: Omit<SessionPayload, "exp">): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const token = await signSessionPayload({ ...payload, exp });
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  deleteCookie(COOKIE_NAME, { path: "/" });
}

export async function getSession(): Promise<SessionPayload | null> {
  return verifySessionToken(getCookie(COOKIE_NAME));
}

/** Constant-time-ish string comparison via digest equality. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
