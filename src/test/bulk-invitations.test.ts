import { describe, expect, it } from "vitest";
import { MAX_BULK_INVITES, parseBulkInviteEmails } from "@/lib/bulk-invitations";

describe("parseBulkInviteEmails", () => {
  it("normalizes and deduplicates addresses separated by whitespace, commas, or semicolons", () => {
    expect(parseBulkInviteEmails("  Reader@Example.com,reader@example.com; other@example.com\nthird@example.com ")).toEqual([
      "reader@example.com",
      "other@example.com",
      "third@example.com",
    ]);
  });

  it("rejects more than the supported batch size", () => {
    const emails = Array.from({ length: MAX_BULK_INVITES + 1 }, (_, index) => `reader${index}@example.com`).join("\n");
    expect(() => parseBulkInviteEmails(emails)).toThrow(`Invite up to ${MAX_BULK_INVITES} readers at a time.`);
  });
});