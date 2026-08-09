import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);

export const ADMIN_ROLES = ["owner", "manager", "sender", "auditor"];

export const ROLE_PERMISSIONS = Object.freeze({
  owner: [
    "view_documents", "create_documents", "manage_invitations", "approve_terms",
    "download_documents", "manage_users", "manage_retention", "export_backups",
    "view_security_audit",
  ],
  manager: [
    "view_documents", "create_documents", "manage_invitations", "approve_terms",
    "download_documents", "view_security_audit",
  ],
  sender: ["view_documents", "create_documents", "manage_invitations", "download_documents"],
  auditor: ["view_documents", "download_documents", "view_security_audit"],
});

export function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 320) : "";
}

export function passwordValidationError(value) {
  if (typeof value !== "string" || value.length < 12) return "Password must be at least 12 characters.";
  if (value.length > 200) return "Password is too long.";
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
    return "Password must include uppercase, lowercase, and numeric characters.";
  }
  return "";
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
}

export async function verifyPassword(password, encoded) {
  try {
    const [algorithm, n, r, p, saltValue, hashValue] = String(encoded || "").split("$");
    if (algorithm !== "scrypt" || !saltValue || !hashValue) return false;
    const expected = Buffer.from(hashValue, "base64url");
    const actual = await scryptAsync(password, Buffer.from(saltValue, "base64url"), expected.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
    });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function rolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role, permission) {
  return rolePermissions(role).includes(permission);
}

export function publicAdminUser(row) {
  return {
    id: String(row.id),
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    permissions: rolePermissions(row.role),
    active: Boolean(row.is_active),
    lastLoginAt: row.last_login_at || undefined,
    createdAt: row.created_at,
  };
}
