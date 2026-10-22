import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

const COOKIE_NAME = "storyhouse_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours, mirrors the original session lifetime

export interface SessionPayload {
  email: string;
  role: "reader" | "admin";
  exp: number;
}

function getSecret(): string {
  return process.env["SESSION_SECRET"] ?? "development-only-secret";
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
    ["sign"],
  );
}

export async function signSessionPayload(payload: SessionPayload): Promise<string> {
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(body));
  const expectedHex = bytesToBase64Url(new Uint8Array(expected));
  if (expectedHex !== signature) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as SessionPayload;
    if (!payload?.email || !payload?.role || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
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
