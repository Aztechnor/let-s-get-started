import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Service-role client for the whitelisted-reader tables. Only reachable from
 * server code (this module is only imported by handler bodies), so callers
 * must verify the session BEFORE calling this.
 */
export async function getAdminDb() {
  if (cached) return cached;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  cached = supabaseAdmin;
  return supabaseAdmin;
}

export async function logAction(
  actorEmail: string,
  action: string,
  targetEmail = "",
  detail = "",
): Promise<void> {
  try {
    const db = await getAdminDb();
    await db.from("audit_log").insert({
      actor_email: actorEmail,
      action,
      target_email: targetEmail,
      detail: detail.slice(0, 500),
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("audit log write failed", error);
  }
}

export function emailNormalize(value: string): string {
  return (value ?? "").trim().toLowerCase();
}

export function validEmail(value: string): boolean {
  if (value.length > 254 || value.split("@").length !== 2) return false;
  const [local, domain] = value.split("@");
  return Boolean(
    local &&
    domain &&
    domain.includes(".") &&
    !value.includes(" ") &&
    !domain.startsWith(".") &&
    !domain.endsWith("."),
  );
}
