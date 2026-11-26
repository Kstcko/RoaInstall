import "server-only";
import { getDatabase } from "./db";

export type RoleCode = "admin" | "store" | "user" | "head_technician";
export type PermissionCode =
  | "dashboard.view"
  | "jobs.view"
  | "jobs.create"
  | "jobs.update"
  | "jobs.delete"
  | "jobs.change_status"
  | "jobs.assign_supervisor"
  | "trash.view"
  | "trash.restore"
  | "trash.permanent_delete"
  | "users.manage";

export async function hasPermission(userId: string, permission: PermissionCode): Promise<boolean> {
  try {
    const [rows] = await getDatabase().execute(
      `SELECT rp.allowed
       FROM users u
       JOIN role_permissions rp ON rp.role_id = u.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE u.id = ? AND u.is_active = 1 AND p.code = ?
       LIMIT 1`,
      [userId, permission],
    );
    return Array.isArray(rows) && rows.length === 1 && (rows[0] as { allowed: number }).allowed === 1;
  } catch {
    return false;
  }
}

export async function requirePermission(userId: string, permission: PermissionCode): Promise<void> {
  if (!(await hasPermission(userId, permission))) throw new Error("FORBIDDEN");
}
