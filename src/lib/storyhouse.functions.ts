import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isAuthorizedReaderSession } from "./reader-access.server";
import { parseBulkInviteEmails, type BulkInviteResult } from "./bulk-invitations";
import {
  clearSession,
  createSession,
  getSession,
  safeEqual,
  getSessionSecret,
  type SessionPayload,
} from "./session.server";
import {
  emailNormalize,
  getAdminDb,
  logAction,
  validEmail,
} from "./storyhouse-db.server";
import {
  findBook,
  getChapter,
  getCollectionStats,
  getLibrary as getLibraryData,
  searchChapters,
  type BookSummary,
  type SearchHit,
} from "@/server/storyhouse-data";

const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 45;
const MAX_ATTEMPTS = 5;

async function codeHash(email: string, code: string): Promise<string> {
  const secret = getSessionSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${email}:${code}`),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateLoginCode(): string {
  // Rejection sampling avoids modulo bias while producing exactly six digits.
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / 1_000_000) * 1_000_000;
  const sample = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(sample);
    value = sample[0] ?? 0;
  } while (value >= limit);
  return String(value % 1_000_000).padStart(6, "0");
}

async function consumeAuthRateLimit(
  db: Awaited<ReturnType<typeof getAdminDb>>,
  key: string,
  limit: number,
  windowSeconds: number,
  message: string,
): Promise<void> {
  const keyHash = await codeHash("rate-limit", key);
  const { data, error } = await db.rpc("consume_auth_rate_limit", {
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("Authentication rate-limit check failed", error);
    throw new Error("Sign-in is temporarily unavailable. Please try again.");
  }
  if (!data) throw new Error(message);
}

/** Verifies the session cookie and that the reader is still whitelisted+active. */
async function requireReader(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("A whitelisted reader sign-in is required.");
  if (!(await isAuthorizedReaderSession(session))) {
    await clearSession();
    throw new Error("A whitelisted reader sign-in is required.");
  }
  return session;
}

async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("Admin sign-in required.");
  return session;
}

export interface MeResult {
  authenticated: boolean;
  email: string;
  role: string;
}

export const getMe = createServerFn({ method: "GET" }).handler(async (): Promise<MeResult> => {
  const session = await getSession();
  if (!session) return { authenticated: false, email: "", role: "" };
  if (session.role === "reader") {
    const db = await getAdminDb();
    const { data } = await db
      .from("allowed_readers")
      .select("active")
      .eq("email", session.email)
      .maybeSingle();
    if (!data?.active) {
      await clearSession();
      return { authenticated: false, email: "", role: "" };
    }
  }
  return { authenticated: true, email: session.email, role: session.role };
});

export const getLibrary = createServerFn({ method: "GET" }).handler(async (): Promise<{ books: BookSummary[] }> => {
  return { books: getLibraryData() };
});

export const getStoryChapter = createServerFn({ method: "GET" })
  .inputValidator((input: { bookId: string; chapterIndex: number }) => input)
  .handler(async ({ data }) => {
    await requireReader();
    const result = getChapter(data.bookId, data.chapterIndex);
    if (!result) throw new Error("Story not found.");
    return result;
  });

export const searchTheLibrary = createServerFn({ method: "GET" })
  .inputValidator((input: { q: string }) => input)
  .handler(async ({ data }): Promise<{ results: SearchHit[] }> => {
    await requireReader();
    const q = (data.q ?? "").trim();
    if (q.length < 2) return { results: [] };
    return { results: searchChapters(q) };
  });

export const requestCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ email: z.string().trim().email().max(254) }).parse(input))
  .handler(async ({ data }) => {
    const email = emailNormalize(data.email);
    if (!validEmail(email)) throw new Error("Enter a valid email address.");

    const db = await getAdminDb();
    await consumeAuthRateLimit(db, `otp-request:${email}`, 5, 60 * 60, "Too many sign-in codes requested. Please try again later.");
    const { data: allowed } = await db
      .from("allowed_readers")
      .select("active")
      .eq("email", email)
      .maybeSingle();
    // Keep the response generic so an unapproved email cannot be enumerated.
    const genericMessage = "If this email has reader access, a sign-in code will be issued.";
    if (!allowed?.active) return { message: genericMessage };

    const { data: existing } = await db
      .from("login_codes")
      .select("sent_at")
      .eq("email", email)
      .maybeSingle();
    if (existing?.sent_at) {
      const lastSent = new Date(existing.sent_at).getTime();
      if (Number.isFinite(lastSent) && Date.now() - lastSent < RESEND_COOLDOWN_SECONDS * 1000) {
        throw new Error("A code was recently requested. Check your inbox or wait a moment before retrying.");
      }
    }

    const code = generateLoginCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60_000).toISOString();
    const { error: upsertError } = await db.from("login_codes").upsert(
      {
        email,
        code_hash: await codeHash(email, code),
        expires_at: expiresAt,
        sent_at: now.toISOString(),
        attempts: 0,
      },
      { onConflict: "email" },
    );
    if (upsertError) throw new Error("Could not start the sign-in. Please try again.");
    await logAction(email, "reader_code_requested", email);

    try {
      const result = await (await import("./email.server")).sendLoginCode(email, code);
      // In development mode, the email function returns the code to display in UI
      if (result.devCode) {
        return { message: `Email delivery is not set up yet. Development code: ${result.devCode}`, dev_code: result.devCode };
      }
    } catch (error) {
      if ((error as { code?: string }).code === "EMAIL_NOT_CONFIGURED") {
        if (!import.meta.env.PROD) {
          return { message: `Email delivery is not set up yet. Development code: ${code}`, dev_code: code };
        }
        throw new Error("Sign-in codes are sent by email, but email delivery for this reading room is not set up yet.");
      }
      console.error("Could not send sign-in code", error);
      throw new Error("The sign-in email could not be sent. Please try again in a moment.");
    }
    return { message: genericMessage };
  });

export const verifyCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().trim().email().max(254), code: z.string().regex(/^[0-9]{6}$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const email = emailNormalize(data.email);
    const code = data.code.trim();
    if (!validEmail(email) || !(code.length === 6 && /^\d{6}$/.test(code))) {
      throw new Error("Enter the email address and six-digit code.");
    }
    const db = await getAdminDb();
    await consumeAuthRateLimit(db, `otp-verify:${email}`, 10, 15 * 60, "Too many sign-in attempts. Please try again in 15 minutes.");
    const { data: allowed } = await db
      .from("allowed_readers")
      .select("active")
      .eq("email", email)
      .maybeSingle();
    const { data: saved } = await db.from("login_codes").select("*").eq("email", email).maybeSingle();
    if (!allowed?.active || !saved) {
      throw new Error("That sign-in code is invalid or has expired.");
    }
    if (saved.attempts >= MAX_ATTEMPTS) {
      await db.from("login_codes").delete().eq("email", email);
      throw new Error("Too many attempts. Request a new sign-in code.");
    }
    const expired = new Date(saved.expires_at).getTime() <= Date.now();
    const matches = safeEqual(await codeHash(email, code), saved.code_hash);
    if (expired || !matches) {
      // Match the update to the exact challenge so stale requests cannot mutate a newer code.
      await db
        .from("login_codes")
        .update({ attempts: saved.attempts + 1 })
        .eq("email", email)
        .eq("code_hash", saved.code_hash)
        .lt("attempts", MAX_ATTEMPTS);
      throw new Error("That sign-in code is invalid or has expired.");
    }

    // Conditional deletion makes the one-time challenge single-use, even under concurrency.
    const { data: consumed, error: consumeError } = await db
      .from("login_codes")
      .delete()
      .eq("email", email)
      .eq("code_hash", saved.code_hash)
      .gt("expires_at", new Date().toISOString())
      .lt("attempts", MAX_ATTEMPTS)
      .select("email");
    if (consumeError || !consumed?.length) {
      throw new Error("That sign-in code is invalid or has expired.");
    }
    await db.from("allowed_readers").update({ last_login_at: new Date().toISOString() }).eq("email", email);
    await logAction(email, "reader_signed_in", email);
    await createSession({ email, role: "reader" });
    return { authenticated: true, email, role: "reader" };
  });

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(1024) }).parse(input),
  )
  .handler(async ({ data }) => {
    const adminEmail = emailNormalize(process.env["ADMIN_EMAIL"] ?? "");
    const adminPassword = process.env["ADMIN_PASSWORD"] ?? "";
    if (!adminEmail || !adminPassword) {
      throw new Error("Admin access is not configured yet. The administrator credentials still need to be saved.");
    }
    const db = await getAdminDb();
    await consumeAuthRateLimit(db, `admin-login:${adminEmail}`, 5, 15 * 60, "Too many administrator sign-in attempts. Try again in 15 minutes.");
    const emailOk = safeEqual(emailNormalize(data.email), adminEmail);
    const passwordOk = safeEqual(data.password ?? "", adminPassword);
    if (!emailOk || !passwordOk) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      throw new Error("The email or password is incorrect.");
    }
    await logAction(adminEmail, "admin_signed_in");
    await createSession({ email: adminEmail, role: "admin" });
    return { authenticated: true, email: adminEmail, role: "admin" };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  await clearSession();
  return { ok: true };
});

export interface AuditEntry {
  id: number;
  actor_email: string;
  action: string;
  target_email: string;
  detail: string;
  created_at: string;
}

export interface AdminSummary {
  total_readers: number;
  active_readers: number;
  book_count: number;
  story_count: number;
  readers_reading: number;
  recent_activity: AuditEntry[];
}

export const adminSummary = createServerFn({ method: "GET" }).handler(async (): Promise<AdminSummary> => {
  await requireAdmin();
  const db = await getAdminDb();
  const [total, active, recent, stats, progressEmails] = await Promise.all([
    db.from("allowed_readers").select("email", { count: "exact" }).then((r) => r.count ?? 0),
    db.from("allowed_readers").select("email", { count: "exact" }).eq("active", true).then((r) => r.count ?? 0),
    db.from("audit_log").select("*").order("id", { ascending: false }).limit(12),
    Promise.resolve(getCollectionStats()),
    db.from("reading_progress").select("email"),
  ]);
  return {
    total_readers: total,
    active_readers: active,
    book_count: stats.bookCount,
    story_count: stats.storyCount,
    readers_reading: new Set((progressEmails.data ?? []).map((r) => r.email)).size,
    recent_activity: (recent.data ?? []) as AuditEntry[],
  };
});

export interface ReaderRow {
  email: string;
  display_name: string;
  note: string;
  active: boolean;
  added_by: string;
  added_at: string;
  last_login_at: string | null;
}

export interface ReaderProgressInfo {
  book_id: string;
  book_title: string;
  chapter_index: number;
  chapter_count: number;
  furthest_index: number;
  percent: number;
  updated_at: string;
}

export const adminReaders = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ readers: ReaderRow[]; progress: Record<string, ReaderProgressInfo> }> => {
    await requireAdmin();
    const db = await getAdminDb();
    const { data, error } = await db.from("allowed_readers").select("*").order("added_at", { ascending: false });
    if (error) throw new Error("Could not load the reader list.");
    const readers = (data ?? []) as ReaderRow[];

    // Latest reading position per reader, one row per email.
    const emails = readers.map((r) => r.email);
    const progress: Record<string, ReaderProgressInfo> = {};
    if (emails.length) {
      const { data: rows } = await db
        .from("reading_progress")
        .select("email, book_id, chapter_index, chapter_count, furthest_index, updated_at")
        .in("email", emails)
        .order("updated_at", { ascending: false });
      for (const row of (rows ?? []) as (ProgressRow & { email: string })[]) {
        if (progress[row.email]) continue; // rows come newest-first, keep the latest only
        const book = findBook(row.book_id);
        const total = row.chapter_count || book?.chapters.length || 0;
        const index = Math.min(row.chapter_index, Math.max(0, total - 1));
        progress[row.email] = {
          book_id: row.book_id,
          book_title: book?.title ?? row.book_id,
          chapter_index: index,
          chapter_count: total,
          furthest_index: row.furthest_index,
          percent: total ? Math.round(((row.furthest_index + 1) / total) * 100) : 0,
          updated_at: row.updated_at,
        };
      }
    }
    return { readers, progress };
  },
);

export const adminAddReader = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; display_name?: string; note?: string }) => input)
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    const email = emailNormalize(data.email);
    if (!validEmail(email)) throw new Error("Enter a valid email address.");
    const displayName = (data.display_name ?? "").trim().slice(0, 100);
    const note = (data.note ?? "").trim().slice(0, 250);
    if (email === emailNormalize(process.env["ADMIN_EMAIL"] ?? "")) {
      throw new Error("The administrator account does not need reader whitelisting.");
    }
    const db = await getAdminDb();
    const { error } = await db.from("allowed_readers").insert({
      email,
      display_name: displayName,
      note,
      active: true,
      added_by: admin.email,
      added_at: new Date().toISOString(),
    });
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new Error("That email is already on the reader list. You can reactivate it instead.");
      }
      throw new Error("Could not add that reader. Please try again.");
    }
    await logAction(admin.email, "reader_whitelisted", email, note);
    return { ok: true, email };
  });

export const adminBulkAddReaders = createServerFn({ method: "POST" })
  .inputValidator((input: { emails: string }) => input)
  .handler(async ({ data }): Promise<{ results: BulkInviteResult[] }> => {
    const admin = await requireAdmin();
    const emails = parseBulkInviteEmails(data.emails ?? "");
    if (!emails.length) throw new Error("Enter at least one email address.");

    const adminEmail = emailNormalize(process.env["ADMIN_EMAIL"] ?? "");
    const statusByEmail = new Map<string, BulkInviteResult["status"]>();
    const eligible: string[] = [];
    for (const email of emails) {
      if (!validEmail(email)) statusByEmail.set(email, "invalid");
      else if (email === adminEmail) statusByEmail.set(email, "admin_account");
      else eligible.push(email);
    }

    if (eligible.length) {
      const db = await getAdminDb();
      const { data: existing, error: lookupError } = await db
        .from("allowed_readers")
        .select("email, active")
        .in("email", eligible);
      if (lookupError) throw new Error("Could not check the reader list. No invitations were made.");

      const existingByEmail = new Map((existing ?? []).map((reader) => [reader.email, reader.active]));
      const toReactivate: string[] = [];
      const toInvite: string[] = [];
      for (const email of eligible) {
        if (existingByEmail.get(email) === true) statusByEmail.set(email, "already_active");
        else if (existingByEmail.has(email)) toReactivate.push(email);
        else toInvite.push(email);
      }

      if (toReactivate.length) {
        const { error } = await db.from("allowed_readers").update({ active: true }).in("email", toReactivate);
        for (const email of toReactivate) statusByEmail.set(email, error ? "failed" : "reactivated");
        if (!error) {
          await Promise.all(toReactivate.map((email) => logAction(admin.email, "reader_activated", email)));
        }
      }

      if (toInvite.length) {
        const addedAt = new Date().toISOString();
        const { error } = await db.from("allowed_readers").insert(
          toInvite.map((email) => ({
            email,
            display_name: "",
            note: "",
            active: true,
            added_by: admin.email,
            added_at: addedAt,
          })),
        );
        for (const email of toInvite) statusByEmail.set(email, error ? "failed" : "invited");
        if (!error) {
          await Promise.all(toInvite.map((email) => logAction(admin.email, "reader_whitelisted", email, "Bulk invitation")));
        }
      }
    }

    return {
      results: emails.map((email) => ({ email, status: statusByEmail.get(email) ?? "failed" })),
    };
  });

export const adminUpdateReader = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; active?: boolean; display_name?: string; note?: string }) => input)
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    const email = emailNormalize(data.email);
    const db = await getAdminDb();
    const { data: row } = await db.from("allowed_readers").select("*").eq("email", email).maybeSingle();
    if (!row) throw new Error("Reader not found.");
    const active = data.active ?? row.active;
    const displayName = (data.display_name ?? row.display_name).trim().slice(0, 100);
    const note = (data.note ?? row.note).trim().slice(0, 250);
    const { error } = await db
      .from("allowed_readers")
      .update({ active, display_name: displayName, note })
      .eq("email", email);
    if (error) throw new Error("Could not update that reader.");
    await db.from("login_codes").delete().eq("email", email);
    await logAction(admin.email, active ? "reader_activated" : "reader_revoked", email);
    return { ok: true, email, active };
  });

export const adminDeleteReader = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    const email = emailNormalize(data.email);
    const db = await getAdminDb();
    const { error } = await db.from("allowed_readers").delete().eq("email", email);
    if (error) throw new Error("Could not remove that reader.");
    await db.from("login_codes").delete().eq("email", email);
    await logAction(admin.email, "reader_removed", email);
    return { ok: true };
  });

export interface ProgressRow {
  book_id: string;
  chapter_index: number;
  chapter_count: number;
  furthest_index: number;
  updated_at: string;
}

/** Reading progress for the signed-in reader, one row per book. */
export const getMyProgress = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ progress: ProgressRow[] }> => {
    const session = await requireReader();
    const db = await getAdminDb();
    const { data } = await db
      .from("reading_progress")
      .select("book_id, chapter_index, chapter_count, furthest_index, updated_at")
      .eq("email", session.email)
      .order("updated_at", { ascending: false });
    return { progress: (data ?? []) as ProgressRow[] };
  },
);

export const saveMyProgress = createServerFn({ method: "POST" })
  .inputValidator((input: { bookId: string; chapterIndex: number }) => input)
  .handler(async ({ data }) => {
    const session = await requireReader();
    const book = findBook(data.bookId);
    if (!book) throw new Error("Book not found.");
    const count = book.chapters.length;
    const index = Math.max(0, Math.min(Math.floor(Number(data.chapterIndex) || 0), count - 1));
    const db = await getAdminDb();
    const { data: existing } = await db
      .from("reading_progress")
      .select("furthest_index")
      .eq("email", session.email)
      .eq("book_id", book.id)
      .maybeSingle();
    await db.from("reading_progress").upsert(
      {
        email: session.email,
        book_id: book.id,
        chapter_index: index,
        chapter_count: count,
        furthest_index: Math.max(existing?.furthest_index ?? 0, index),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email,book_id" },
    );
    return { ok: true };
  });
