import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUniqueScopes, hasAuthParams } from "../utils";

describe("utils", () => {
  describe("hasAuthParams", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return true when both code and state params are present", () => {
      const searchParams = "?code=abc123&state=xyz789";
      expect(hasAuthParams(searchParams)).toBe(true);
    });

    it("should return true when code and state are present with other params", () => {
      const searchParams = "?foo=bar&code=abc123&state=xyz789&baz=qux";
      expect(hasAuthParams(searchParams)).toBe(true);
    });

    it("should return true when params are in different order", () => {
      const searchParams = "?state=xyz789&code=abc123";
      expect(hasAuthParams(searchParams)).toBe(true);
    });

    it("should return false when only code param is present", () => {
      const searchParams = "?code=abc123";
      expect(hasAuthParams(searchParams)).toBe(false);
    });

    it("should return false when only state param is present", () => {
      const searchParams = "?state=xyz789";
      expect(hasAuthParams(searchParams)).toBe(false);
    });

    it("should return false when neither code nor state params are present", () => {
      const searchParams = "?foo=bar&baz=qux";
      expect(hasAuthParams(searchParams)).toBe(false);
    });

    it("should return false when search params is an empty string", () => {
      const searchParams = "";
      expect(hasAuthParams(searchParams)).toBe(false);
    });

    it("should handle URL fragment-style params with &", () => {
      const searchParams = "&code=abc123&state=xyz789";
      expect(hasAuthParams(searchParams)).toBe(true);
    });

    it("should use window.location.search when no parameter is provided", () => {
      // Mock window.location.search
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, "window", {
        value: {
          location: {
            search: "?code=test123&state=state456",
          },
        },
        writable: true,
        configurable: true,
      });

      expect(hasAuthParams()).toBe(true);

      // Restore original window
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    });

    it("should handle params with special characters", () => {
      const searchParams = "?code=abc-123_456&state=xyz.789";
      expect(hasAuthParams(searchParams)).toBe(true);
    });

    it("should not match partial param names", () => {
      const searchParams = "?mycode=abc123&mystate=xyz789";
      expect(hasAuthParams(searchParams)).toBe(false);
    });

    it("should handle params with equal signs in values", () => {
      const searchParams = "?code=abc=123&state=xyz=789";
      expect(hasAuthParams(searchParams)).toBe(true);
    });
  });

  describe("getUniqueScopes", () => {
    it("should return a single scope when one scope is provided", () => {
      expect(getUniqueScopes("openid")).toBe("openid");
    });

    it("should return unique scopes when multiple different scopes are provided", () => {
      expect(getUniqueScopes("openid", "profile", "email")).toBe("openid profile email");
    });

    it("should remove duplicate scopes", () => {
      expect(getUniqueScopes("openid", "profile", "openid", "email")).toBe("openid profile email");
    });

    it("should handle space-separated scopes in a single string", () => {
      expect(getUniqueScopes("openid profile email")).toBe("openid profile email");
    });

    it("should deduplicate scopes from multiple strings", () => {
      expect(getUniqueScopes("openid profile", "email openid")).toBe("openid profile email");
    });

    it("should handle empty strings", () => {
      expect(getUniqueScopes("", "openid", "")).toBe("openid");
    });

    it("should return an empty string when no scopes are provided", () => {
      expect(getUniqueScopes()).toBe("");
    });

    it("should return an empty string when only empty strings are provided", () => {
      expect(getUniqueScopes("", "", "")).toBe("");
    });

    it("should trim extra whitespace between scopes", () => {
      expect(getUniqueScopes("openid  profile   email")).toBe("openid profile email");
    });

    it("should handle leading and trailing whitespace", () => {
      expect(getUniqueScopes("  openid profile  ", "  email  ")).toBe("openid profile email");
    });

    it("should preserve order of first occurrence", () => {
      expect(getUniqueScopes("email", "profile", "openid", "email")).toBe("email profile openid");
    });

    it("should handle mixed single and multi-scope strings", () => {
      expect(getUniqueScopes("openid profile", "email", "profile email", "admin")).toBe("openid profile email admin");
    });

    it("should handle tabs and newlines as whitespace", () => {
      expect(getUniqueScopes("openid\tprofile\nemail")).toBe("openid profile email");
    });

    it("should handle many duplicate scopes efficiently", () => {
      const result = getUniqueScopes("openid openid openid", "profile profile", "openid", "email email email");
      expect(result).toBe("openid profile email");
    });
  });
});
