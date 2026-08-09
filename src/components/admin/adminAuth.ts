import { createContext, useContext } from "react";
import type { AdminPermission, AdminUser } from "@/types/memo";

export const AdminAuthContext = createContext<AdminUser | null>(null);

export function useAdminUser() {
  const user = useContext(AdminAuthContext);
  if (!user) throw new Error("Admin account context is unavailable.");
  return user;
}

export function useAdminPermission(permission: AdminPermission) {
  return useAdminUser().permissions.includes(permission);
}
