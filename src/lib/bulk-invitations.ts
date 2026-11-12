export const MAX_BULK_INVITES = 100;

export type BulkInviteStatus =
  "invited" | "reactivated" | "already_active" | "invalid" | "admin_account" | "failed";

export interface BulkInviteResult {
  email: string;
  status: BulkInviteStatus;
}

export function parseBulkInviteEmails(value: string): string[] {
  const emails = [
    ...new Set(
      value
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (emails.length > MAX_BULK_INVITES) {
    throw new Error(`Invite up to ${MAX_BULK_INVITES} readers at a time.`);
  }
  return emails;
}
