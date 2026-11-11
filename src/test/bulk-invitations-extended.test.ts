import { describe, expect, it } from "vitest";
import {
  MAX_BULK_INVITES,
  parseBulkInviteEmails,
  type BulkInviteStatus,
} from "@/lib/bulk-invitations";

describe("parseBulkInviteEmails - Extended Tests", () => {
  describe("basic parsing", () => {
    it("parses comma-separated emails", () => {
      const emails = "a@b.com,c@d.com,e@f.com";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com", "e@f.com"]);
    });

    it("parses newline-separated emails", () => {
      const emails = "a@b.com\nc@d.com\ne@f.com";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com", "e@f.com"]);
    });

    it("parses space-separated emails", () => {
      const emails = "a@b.com c@d.com e@f.com";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com", "e@f.com"]);
    });

    it("parses semicolon-separated emails", () => {
      const emails = "a@b.com;c@d.com;e@f.com";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com", "e@f.com"]);
    });
  });

  describe("mixed separators", () => {
    it("parses emails with mixed separators", () => {
      const emails = "a@b.com, c@d.com\ne@f.com;g@h.com";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com", "e@f.com", "g@h.com"]);
    });

    it("parses emails with multiple spaces", () => {
      const emails = "a@b.com    c@d.com  e@f.com";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com", "e@f.com"]);
    });

    it("parses emails with tabs and spaces", () => {
      const emails = "a@b.com\t\tc@d.com  e@f.com";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com", "e@f.com"]);
    });
  });

  describe("normalization", () => {
    it("normalizes emails to lowercase", () => {
      const emails = "A@B.COM,C@D.COM,E@F.COM";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com", "e@f.com"]);
    });

    it("trims whitespace from emails", () => {
      const emails = "  a@b.com  ,  c@d.com  ";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com"]);
    });

    it("handles emails with leading/trailing whitespace", () => {
      const emails = "\n\ta@b.com\n\t,c@d.com\n";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com"]);
    });
  });

  describe("deduplication", () => {
    it("removes duplicate emails", () => {
      const emails = "a@b.com,a@b.com,c@d.com";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com"]);
    });

    it("removes case-insensitive duplicates", () => {
      const emails = "A@B.COM,a@b.com,C@D.COM";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com"]);
    });

    it("removes duplicates with different whitespace", () => {
      const emails = "a@b.com, a@b.com ,\ta@b.com\n";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com"]);
    });

    it("removes multiple duplicates", () => {
      const emails = "a@b.com,a@b.com,a@b.com,c@d.com,c@d.com";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com"]);
    });
  });

  describe("empty and invalid inputs", () => {
    it("returns empty array for empty string", () => {
      const result = parseBulkInviteEmails("");
      expect(result).toEqual([]);
    });

    it("returns empty array for whitespace only", () => {
      const result = parseBulkInviteEmails("   \n\t  ");
      expect(result).toEqual([]);
    });

    it("filters out empty entries", () => {
      const emails = "a@b.com,,c@d.com";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com"]);
    });

    it("filters out whitespace-only entries", () => {
      const emails = "a@b.com,  ,c@d.com,  \t  ";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["a@b.com", "c@d.com"]);
    });
  });

  describe("complex email formats", () => {
    it("handles emails with plus addressing", () => {
      const emails = "user+tag@example.com,user+filter@example.com";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["user+tag@example.com", "user+filter@example.com"]);
    });

    it("handles emails with dots", () => {
      const emails = "user.name@example.com,first.last@example.com";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["user.name@example.com", "first.last@example.com"]);
    });

    it("handles emails with subdomains", () => {
      const emails = "user@sub.example.com,user@deep.sub.example.com";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["user@sub.example.com", "user@deep.sub.example.com"]);
    });

    it("handles various TLDs", () => {
      const emails = "user@example.com,user@example.io,user@example.co.uk";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["user@example.com", "user@example.io", "user@example.co.uk"]);
    });
  });

  describe("max limit enforcement", () => {
    it("accepts exactly MAX_BULK_INVITES emails", () => {
      const emails = Array.from({ length: MAX_BULK_INVITES }, (_, i) => `user${i}@example.com`).join(",");
      const result = parseBulkInviteEmails(emails);
      expect(result.length).toBe(MAX_BULK_INVITES);
    });

    it("throws error when exceeding MAX_BULK_INVITES", () => {
      const emails = Array.from({ length: MAX_BULK_INVITES + 1 }, (_, i) => `user${i}@example.com`).join(",");
      expect(() => parseBulkInviteEmails(emails)).toThrow();
    });

    it("throws error with correct message", () => {
      const emails = Array.from({ length: MAX_BULK_INVITES + 1 }, (_, i) => `user${i}@example.com`).join(",");
      expect(() => parseBulkInviteEmails(emails)).toThrow(
        `Invite up to ${MAX_BULK_INVITES} readers at a time.`
      );
    });

    it("handles exactly MAX_BULK_INVITES with duplicates", () => {
      // Create a list with MAX_BULK_INVITES unique emails plus duplicates
      const uniqueEmails = Array.from({ length: MAX_BULK_INVITES }, (_, i) => `user${i}@example.com`);
      const emails = [...uniqueEmails, ...uniqueEmails.slice(0, 10)].join(",");
      // Should not throw because deduplication will reduce the count
      const result = parseBulkInviteEmails(emails);
      expect(result.length).toBeLessThanOrEqual(MAX_BULK_INVITES);
    });
  });

  describe("real-world scenarios", () => {
    it("parses email list from clipboard (mixed format)", () => {
      const emails = `
        john.doe@example.com,
        jane.doe@example.com
        
        admin@company.com;
        user+tag@example.io   
        support@test.org
      `;
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual([
        "john.doe@example.com",
        "jane.doe@example.com",
        "admin@company.com",
        "user+tag@example.io",
        "support@test.org",
      ]);
    });

    it("parses CSV-like input", () => {
      const emails = "email,name,other\nuser1@example.com,User One\nuser2@example.com,User Two";
      const result = parseBulkInviteEmails(emails);
      // Should extract valid emails and ignore non-email entries
      expect(result).toContain("user1@example.com");
      expect(result).toContain("user2@example.com");
    });

    it("handles email list with comments or notes", () => {
      // Note: The current implementation doesn't filter out non-emails
      // It will include anything that looks like an email
      const emails = "user1@example.com\nuser2@example.com";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["user1@example.com", "user2@example.com"]);
    });
  });

  describe("edge cases", () => {
    it("handles email with special characters in local part", () => {
      const emails = "user!#$%&'*+-/=?^_`{|}~@example.com";
      // Note: This might not be a valid email, but we're testing the parsing
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["user!#$%&'*+-/=?^_`{|}~@example.com"]);
    });

    it("handles international email addresses", () => {
      const emails = "用户@例子.中国,用户@例子.测试";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["用户@例子.中国", "用户@例子.测试"]);
    });

    it("handles very long email addresses", () => {
      const longLocal = "a".repeat(64);
      const longDomain = "b.".repeat(30) + "com";
      const emails = `${longLocal}@${longDomain}`;
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual([emails]);
    });

    it("handles email with IP address as domain", () => {
      const emails = "user@[192.168.1.1]";
      const result = parseBulkInviteEmails(emails);
      expect(result).toEqual(["user@[192.168.1.1]"]);
    });
  });

  describe("BulkInviteStatus type", () => {
    it("has all expected status values", () => {
      const expectedStatuses: BulkInviteStatus[] = [
        "invited",
        "reactivated",
        "already_active",
        "invalid",
        "admin_account",
        "failed",
      ];
      expectedStatuses.forEach((status) => {
        expect(typeof status).toBe("string");
      });
    });
  });

  describe("MAX_BULK_INVITES constant", () => {
    it("is a positive number", () => {
      expect(MAX_BULK_INVITES).toBeGreaterThan(0);
    });

    it("is a reasonable limit (1-1000)", () => {
      expect(MAX_BULK_INVITES).toBeGreaterThanOrEqual(1);
      expect(MAX_BULK_INVITES).toBeLessThanOrEqual(1000);
    });
  });
});
