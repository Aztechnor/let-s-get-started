import type { SessionPayload } from "./session.server";
import { getAdminDb } from "./storyhouse-db.server";

/**
 * Checks that a verified session belongs to an admin or a currently active
 * whitelisted reader. Fails closed on unknown roles or lookup failures.
 */
export async function isAuthorizedReaderSession(session: SessionPayload | null): Promise<boolean> {
  if (!session) return false;
  if (session.role === "admin") return true;
  if (session.role !== "reader") return false;

  const db = await getAdminDb();
  const { data, error } = await db
    .from("allowed_readers")
    .select("active")
    .eq("email", session.email)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.active);
}
