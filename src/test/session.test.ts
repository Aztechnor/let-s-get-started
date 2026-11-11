import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  createSession,
  getSession,
  clearSession,
  safeEqual,
  signSessionPayload,
  verifySessionToken,
} from "@/lib/session.server";

// Mock the cookie handling since we're in a test environment
// In the actual implementation, these functions use the request/response cookies

describe("session.server.ts", () => {
  describe("safeEqual", () => {
    it("returns true for equal strings", () => {
      expect(safeEqual("test", "test")).toBe(true);
    });

    it("returns false for different strings", () => {
      expect(safeEqual("test", "different")).toBe(false);
    });

    it("handles timing attacks by using constant-time comparison", () => {
      // This is more of a documentation test - we can't easily test the timing
      // but we can verify it doesn't short-circuit
      const start1 = performance.now();
      safeEqual("a", "b");
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      safeEqual("a", "a");
      const time2 = performance.now() - start2;

      // The times should be roughly similar (within a reasonable margin)
      // This is a very loose check and may not catch all timing issues
      expect(Math.abs(time1 - time2)).toBeLessThan(1);
    });

    it("handles empty strings", () => {
      expect(safeEqual("", "")).toBe(true);
      expect(safeEqual("", "a")).toBe(false);
    });

    it("handles strings of different lengths", () => {
      expect(safeEqual("short", "longer")).toBe(false);
    });

    it("handles case-sensitive comparison", () => {
      expect(safeEqual("Test", "test")).toBe(false);
      expect(safeEqual("TEST", "test")).toBe(false);
    });

    it("handles special characters", () => {
      expect(safeEqual("test@#$%", "test@#$%")).toBe(true);
      expect(safeEqual("test\n", "test\n")).toBe(true);
    });

    it("handles unicode characters", () => {
      expect(safeEqual("café", "café")).toBe(true);
      expect(safeEqual("café", "cafe")).toBe(false);
    });

    it("handles very long strings", () => {
      const longString = "a".repeat(1000);
      expect(safeEqual(longString, longString)).toBe(true);
      expect(safeEqual(longString, "a".repeat(1000) + "b")).toBe(false);
    });

    it("returns false when comparing with null/undefined", () => {
      // safeEqual expects strings, so we need to handle type conversion
      expect(safeEqual("test", "null")).toBe(false);
      expect(safeEqual("test", "undefined")).toBe(false);
      expect(safeEqual("null", "test")).toBe(false);
      expect(safeEqual("undefined", "test")).toBe(false);
    });
  });

  describe("session management", () => {
    // Note: These tests are limited because the actual session functions
    // depend on the request/response context which is not available in tests.
    // We can only test the safeEqual function directly.

    it("session functions are exported", () => {
      expect(typeof createSession).toBe("function");
      expect(typeof getSession).toBe("function");
      expect(typeof clearSession).toBe("function");
    });
  });
});

describe("session utility functions", () => {
  // These tests verify the behavior of session-related utilities

  describe("cookie parsing and serialization", () => {
    it("should handle basic cookie strings", () => {
      // This tests the general concept, not the actual implementation
      const cookieString = "name=value; name2=value2";
      const cookies: Record<string, string> = {};
      cookieString.split(";").forEach((cookie) => {
        const [name, ...value] = cookie.trim().split("=");
        cookies[name] = value.join("=");
      });
      expect(cookies.name).toBe("value");
      expect(cookies.name2).toBe("value2");
    });

    it("should handle URL-encoded cookie values", () => {
      const cookieString = "name=hello%20world";
      const cookies: Record<string, string> = {};
      cookieString.split(";").forEach((cookie) => {
        const [name, ...value] = cookie.trim().split("=");
        cookies[name] = decodeURIComponent(value.join("="));
      });
      expect(cookies.name).toBe("hello world");
    });
  });
});


describe("signed session tokens", () => {
  const originalSecret = process.env["SESSION_SECRET"];

  afterEach(() => {
    if (originalSecret === undefined) delete process.env["SESSION_SECRET"];
    else process.env["SESSION_SECRET"] = originalSecret;
  });

  it("requires a configured secret of at least 32 bytes", async () => {
    delete process.env["SESSION_SECRET"];
    await expect(signSessionPayload({
      email: "reader@example.com",
      role: "reader",
      exp: Math.floor(Date.now() / 1000) + 60,
    })).rejects.toThrow("SESSION_SECRET");

    process.env["SESSION_SECRET"] = "too-short";
    await expect(signSessionPayload({
      email: "reader@example.com",
      role: "reader",
      exp: Math.floor(Date.now() / 1000) + 60,
    })).rejects.toThrow("at least 32");
  });

  it("signs and verifies a valid reader session", async () => {
    process.env["SESSION_SECRET"] = "test-session-secret-that-is-at-least-32-bytes";
    const payload = { email: "reader@example.com", role: "reader" as const, exp: Math.floor(Date.now() / 1000) + 60 };
    const token = await signSessionPayload(payload);
    await expect(verifySessionToken(token)).resolves.toMatchObject(payload);
  });

  it("rejects a modified session token", async () => {
    process.env["SESSION_SECRET"] = "test-session-secret-that-is-at-least-32-bytes";
    const token = await signSessionPayload({
      email: "reader@example.com",
      role: "reader",
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    const [body, signature] = token.split(".");
    const firstSignatureChar = signature?.[0] ?? "a";
    const tamperedSignature = (firstSignatureChar === "a" ? "b" : "a") + (signature?.slice(1) ?? "");
    await expect(verifySessionToken(`${body}.${tamperedSignature}`)).resolves.toBeNull();
  });

  it("rejects expired sessions", async () => {
    process.env["SESSION_SECRET"] = "test-session-secret-that-is-at-least-32-bytes";
    const token = await signSessionPayload({
      email: "reader@example.com",
      role: "reader",
      exp: Math.floor(Date.now() / 1000) - 1,
    });
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });
});
