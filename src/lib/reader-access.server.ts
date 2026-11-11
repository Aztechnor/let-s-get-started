import type { SessionPayload } from "./session.server";
import { getAdminDb } from "./storyhouse-db.server";

/** Share whitelist checks between protected server functions and file routes. */
export async function isAuthorizedReaderSession(session: SessionPayload): Promise<boolean> {
  if (session.role === "admin") return true;
  if (session.role !== "reader") return false;

  const db = await getAdminDb();
  const { data, error } = await db
    .from("allowed_readers")
    .select("active")
    .eq("email", session.email)
    .maybeSingle();

  return !error && data?.active === true;
}
