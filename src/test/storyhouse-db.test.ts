import { describe, expect, it } from "vitest";
import { emailNormalize, validEmail } from "@/lib/storyhouse-db.server";

describe("storyhouse-db.server.ts", () => {
  describe("emailNormalize", () => {
    it("trims whitespace", () => {
      expect(emailNormalize("  test@example.com  ")).toBe("test@example.com");
    });

    it("converts to lowercase", () => {
      expect(emailNormalize("Test@Example.COM")).toBe("test@example.com");
    });

    it("handles empty string", () => {
      expect(emailNormalize("")).toBe("");
    });

    it("handles null/undefined", () => {
      expect(emailNormalize(null as unknown as string)).toBe("");
      expect(emailNormalize(undefined as unknown as string)).toBe("");
    });

    it("handles string with only whitespace", () => {
      expect(emailNormalize("   ")).toBe("");
    });

    it("preserves valid email format", () => {
      expect(emailNormalize("user+tag@example.com")).toBe("user+tag@example.com");
      expect(emailNormalize("user.name@example.co.uk")).toBe("user.name@example.co.uk");
    });
  });

  describe("validEmail", () => {
    it("accepts standard email format", () => {
      expect(validEmail("test@example.com")).toBe(true);
      expect(validEmail("user@example.com")).toBe(true);
    });

    it("accepts email with subdomains", () => {
      expect(validEmail("user@sub.example.com")).toBe(true);
      expect(validEmail("user@sub.sub.example.com")).toBe(true);
    });

    it("accepts email with plus addressing", () => {
      expect(validEmail("user+tag@example.com")).toBe(true);
    });

    it("accepts email with dots in local part", () => {
      expect(validEmail("user.name@example.com")).toBe(true);
      expect(validEmail("user.name.last@example.com")).toBe(true);
    });

    it("accepts various TLDs", () => {
      expect(validEmail("user@example.co.uk")).toBe(true);
      expect(validEmail("user@example.io")).toBe(true);
      expect(validEmail("user@example.tech")).toBe(true);
    });

    it("rejects email without @", () => {
      expect(validEmail("userexample.com")).toBe(false);
    });

    it("rejects email without domain", () => {
      expect(validEmail("user@")).toBe(false);
    });

    it("rejects email with domain starting with dot", () => {
      expect(validEmail("user@.example.com")).toBe(false);
    });

    it("rejects email with domain ending with dot", () => {
      expect(validEmail("user@example.com.")).toBe(false);
    });

    it("rejects email with spaces", () => {
      expect(validEmail("user @example.com")).toBe(false);
      expect(validEmail("user@ example.com")).toBe(false);
      expect(validEmail("user example@com")).toBe(false);
    });

    it("rejects email without domain dot", () => {
      expect(validEmail("user@example")).toBe(false);
    });

    it("rejects email with multiple @ symbols", () => {
      expect(validEmail("user@sub@example.com")).toBe(false);
    });

    it("rejects very long email", () => {
      // More than 254 characters
      const longLocal = "a".repeat(255);
      expect(validEmail(`${longLocal}@example.com`)).toBe(false);
    });

    it("rejects empty string", () => {
      expect(validEmail("")).toBe(false);
    });

    it("rejects string with only @", () => {
      expect(validEmail("@")).toBe(false);
    });

    it("rejects email with no local part", () => {
      expect(validEmail("@example.com")).toBe(false);
    });

    it("accepts email with hyphens", () => {
      expect(validEmail("user-name@example.com")).toBe(true);
      expect(validEmail("user@sub-domain.com")).toBe(true);
    });

    it("accepts email with numbers in local part", () => {
      expect(validEmail("user123@example.com")).toBe(true);
    });

    it("accepts email with numbers in domain", () => {
      // The current validEmail implementation only checks basic structure
      // It doesn't validate domain character restrictions
      expect(validEmail("user@example123.com")).toBe(true);
    });

    it("accepts email with underscores in domain (implementation is permissive)", () => {
      // The current implementation doesn't check for special characters in domain
      // It only checks for @, ., and basic structure
      expect(validEmail("user@exa_mple.com")).toBe(true);
    });

    it("accepts email with exclamation in domain (implementation is permissive)", () => {
      // The current implementation doesn't check for special characters in domain
      expect(validEmail("user@exa!mple.com")).toBe(true);
    });
  });

  describe("emailNormalize + validEmail integration", () => {
    it("normalizes and validates email correctly", () => {
      const email = "  Test@Example.COM  ";
      const normalized = emailNormalize(email);
      expect(normalized).toBe("test@example.com");
      expect(validEmail(normalized)).toBe(true);
    });

    it("handles mixed case and whitespace", () => {
      const email = "  USER+TAG@SUB.EXAMPLE.CO.UK  ";
      const normalized = emailNormalize(email);
      expect(normalized).toBe("user+tag@sub.example.co.uk");
      expect(validEmail(normalized)).toBe(true);
    });
  });
});
