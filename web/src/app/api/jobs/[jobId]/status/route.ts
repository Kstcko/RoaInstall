import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, verifyPassword } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export async function PATCH(request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    await requirePermission(user.id, "jobs.change_status");
    const { jobId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const next = body.status;
    if (next !== "waiting" && next !== "progress" && next !== "done") return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
    let reauthenticated = false;
    if (next === "done") {
      if (typeof body.username !== "string" || typeof body.password !== "string") return NextResponse.json({ error: "ต้องยืนยัน Username และ Password" }, { status: 400 });
      const [accounts] = await getDatabase().execute("SELECT username,password_hash FROM users WHERE id=? AND is_active=1", [user.id]);
      const account = (accounts as { username: string; password_hash: string }[])[0];
      if (!account || account.username !== body.username || !(await verifyPassword(body.password, account.password_hash))) return NextResponse.json({ error: "ข้อมูลยืนยันตัวตนไม่ถูกต้อง" }, { status: 401 });
      reauthenticated = true;
    }
    const connection = await getDatabase().getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute("SELECT status FROM install_jobs WHERE id=? AND deleted_at IS NULL FOR UPDATE", [jobId]);
      const current = (rows as { status: string }[])[0];
      if (!current) { await connection.rollback(); return NextResponse.json({ error: "ไม่พบงาน" }, { status: 404 }); }
      if (current.status !== "progress" && next === "done") { await connection.rollback(); return NextResponse.json({ error: "เปลี่ยนเป็นเสร็จสิ้นได้จากสถานะกำลังดำเนินการเท่านั้น" }, { status: 409 }); }
      if (current.status !== next) {
        await connection.execute("UPDATE install_jobs SET status=?,updated_by_user_id=? WHERE id=?", [next, user.id, jobId]);
        await connection.execute("INSERT INTO job_status_logs (id,job_id,old_status,new_status,changed_by_user_id,reauthenticated) VALUES (?,?,?,?,?,?)", [randomUUID(), jobId, current.status, next, user.id, reauthenticated]);
      }
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการ" }, { status: 403 });
    return NextResponse.json({ error: "ไม่สามารถเปลี่ยนสถานะได้ หรือยังไม่ได้เชื่อมต่อ TiDB" }, { status: 503 });
  }
}
