import { createServerFn } from "@tanstack/react-start";
import {
  clearSession,
  createSession,
  getSession,
  safeEqual,
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
  const secret = process.env["SESSION_SECRET"] ?? "development-only-secret";
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

/** Verifies the session cookie and that the reader is still whitelisted+active. */
async function requireReader(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("A whitelisted reader sign-in is required.");
  if (session.role === "admin") return session;
  if (session.role !== "reader") {
    await clearSession();
    throw new Error("A whitelisted reader sign-in is required.");
  }
  const db = await getAdminDb();
  const { data } = await db
    .from("allowed_readers")
    .select("active")
    .eq("email", session.email)
    .maybeSingle();
  if (!data?.active) {
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
  .inputValidator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    const email = emailNormalize(data.email);
    if (!validEmail(email)) throw new Error("Enter a valid email address.");

    const db = await getAdminDb();
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

    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
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
      await (await import("./email.server")).sendLoginCode(email, code);
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
  .inputValidator((input: { email: string; code: string }) => input)
  .handler(async ({ data }) => {
    const email = emailNormalize(data.email);
    const code = (data.code ?? "").trim();
    if (!validEmail(email) || !(code.length === 6 && /^\d{6}$/.test(code))) {
      throw new Error("Enter the email address and six-digit code.");
    }
    const db = await getAdminDb();
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
    const expired = new Date(saved.expires_at).getTime() < Date.now();
    const matches = safeEqual(await codeHash(email, code), saved.code_hash);
    if (expired || !matches) {
      await db.from("login_codes").update({ attempts: saved.attempts + 1 }).eq("email", email);
      throw new Error("That sign-in code is invalid or has expired.");
    }
    await db.from("login_codes").delete().eq("email", email);
    await db.from("allowed_readers").update({ last_login_at: new Date().toISOString() }).eq("email", email);
    await logAction(email, "reader_signed_in", email);
    await createSession({ email, role: "reader" });
    return { authenticated: true, email, role: "reader" };
  });

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string }) => input)
  .handler(async ({ data }) => {
    const adminEmail = emailNormalize(process.env["ADMIN_EMAIL"] ?? "");
    const adminPassword = process.env["ADMIN_PASSWORD"] ?? "";
    if (!adminEmail || !adminPassword) {
      throw new Error("Admin access is not configured yet. The administrator credentials still need to be saved.");
    }
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
  recent_activity: AuditEntry[];
}

export const adminSummary = createServerFn({ method: "GET" }).handler(async (): Promise<AdminSummary> => {
  await requireAdmin();
  const db = await getAdminDb();
  const [total, active, recent, stats] = await Promise.all([
    db.from("allowed_readers").select("email", { count: "exact" }).then((r) => r.count ?? 0),
    db.from("allowed_readers").select("email", { count: "exact" }).eq("active", true).then((r) => r.count ?? 0),
    db.from("audit_log").select("*").order("id", { ascending: false }).limit(12),
    Promise.resolve(getCollectionStats()),
  ]);
  return {
    total_readers: total,
    active_readers: active,
    book_count: stats.bookCount,
    story_count: stats.storyCount,
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

export const adminReaders = createServerFn({ method: "GET" }).handler(async (): Promise<{ readers: ReaderRow[] }> => {
  await requireAdmin();
  const db = await getAdminDb();
  const { data, error } = await db.from("allowed_readers").select("*").order("added_at", { ascending: false });
  if (error) throw new Error("Could not load the reader list.");
  return { readers: (data ?? []) as ReaderRow[] };
});

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
