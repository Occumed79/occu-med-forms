import { describe, expect, it } from "vitest";
import {
  ADMIN_ROLES,
  hasPermission,
  hashPassword,
  normalizeEmail,
  passwordValidationError,
  rolePermissions,
  verifyPassword,
} from "../../backend/auth.mjs";

describe("admin account security", () => {
  it("hashes passwords with a unique scrypt salt and verifies without exposing the password", async () => {
    const password = "CorrectHorse7Battery";
    const first = await hashPassword(password);
    const second = await hashPassword(password);

    expect(first).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(first).not.toContain(password);
    expect(second).not.toBe(first);
    await expect(verifyPassword(password, first)).resolves.toBe(true);
    await expect(verifyPassword("WrongPassword7", first)).resolves.toBe(false);
    await expect(verifyPassword(password, "invalid")).resolves.toBe(false);
  });

  it("enforces the password policy", () => {
    expect(passwordValidationError("Short7A")).toBe("Password must be at least 12 characters.");
    expect(passwordValidationError("alllowercase7password")).toContain("uppercase");
    expect(passwordValidationError("ValidPassword7")).toBe("");
  });

  it("normalizes account emails", () => {
    expect(normalizeEmail("  Owner@Occu-Med.COM ")).toBe("owner@occu-med.com");
  });

  it("keeps account and retention administration restricted to owners", () => {
    expect(ADMIN_ROLES).toEqual(["owner", "manager", "sender", "auditor"]);
    expect(hasPermission("owner", "manage_users")).toBe(true);
    expect(hasPermission("owner", "manage_retention")).toBe(true);
    expect(hasPermission("manager", "approve_terms")).toBe(true);
    expect(hasPermission("manager", "manage_users")).toBe(false);
    expect(hasPermission("sender", "create_documents")).toBe(true);
    expect(hasPermission("sender", "approve_terms")).toBe(false);
    expect(hasPermission("auditor", "view_documents")).toBe(true);
    expect(hasPermission("auditor", "create_documents")).toBe(false);
    expect(rolePermissions("unknown")).toEqual([]);
  });
});
