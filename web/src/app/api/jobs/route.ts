import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    await requirePermission(user.id, "jobs.view");
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") || "").trim().slice(0, 120);
    const status = url.searchParams.get("status");
    const includeTrash = url.searchParams.get("trash") === "1";
    if (includeTrash) await requirePermission(user.id, "trash.view");
    const conditions = [includeTrash ? "j.deleted_at IS NOT NULL" : "j.deleted_at IS NULL"];
    const values: (string | number | null)[] = [];
    if (query) { conditions.push("(j.job_number LIKE ? OR j.job_name LIKE ?)"); values.push(`%${query}%`, `%${query}%`); }
    if (status && ["waiting", "progress", "done"].includes(status)) { conditions.push("j.status=?"); values.push(status); }
    const [rows] = await getDatabase().execute(
      `SELECT j.id,j.job_number AS jobNumber,j.job_name AS jobName,
        s.display_name AS supervisor,a.display_name AS assistant,
        j.job_created_date AS createdDate,j.delivery_date AS deliveryDate,j.status,j.deleted_at AS deletedAt
       FROM install_jobs j JOIN users s ON s.id=j.supervisor_user_id
       LEFT JOIN users a ON a.id=j.assistant_user_id
       WHERE ${conditions.join(" AND ")} ORDER BY j.delivery_date ASC,j.created_at DESC LIMIT 200`, values,
    );
    return NextResponse.json({ jobs: rows });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการ" }, { status: 403 });
    return NextResponse.json({ error: "ยังไม่ได้เชื่อมต่อฐานข้อมูล TiDB หรือไม่สามารถอ่านงานได้" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    await requirePermission(user.id, "jobs.create");
    const body = await request.json() as Record<string, unknown>;
    const jobNumber = typeof body.jobNumber === "string" ? body.jobNumber.trim() : "";
    const jobName = typeof body.jobName === "string" ? body.jobName.trim() : "";
    const supervisorId = typeof body.supervisorId === "string" ? body.supervisorId : "";
    const assistantId = typeof body.assistantId === "string" && body.assistantId ? body.assistantId : null;
    const createdDate = typeof body.createdDate === "string" ? body.createdDate : "";
    const deliveryDate = typeof body.deliveryDate === "string" ? body.deliveryDate : "";
    if (!jobNumber || jobNumber.length > 100 || !jobName || jobName.length > 255 || !supervisorId || !/^\d{4}-\d{2}-\d{2}$/.test(createdDate) || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate) || deliveryDate < createdDate) {
      return NextResponse.json({ error: "กรุณาตรวจสอบข้อมูลและวันจัดส่ง" }, { status: 400 });
    }
    const db = getDatabase();
    const [supervisors] = await db.execute(
      "SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? AND u.is_active=1 AND r.code='head_technician'",
      [supervisorId],
    );
    if (!Array.isArray(supervisors) || supervisors.length !== 1) return NextResponse.json({ error: "เลือกหัวหน้าช่างที่ใช้งานได้เท่านั้น" }, { status: 400 });
    if (assistantId) {
      const [assistants] = await db.execute("SELECT id FROM users WHERE id=? AND is_active=1", [assistantId]);
      if (!Array.isArray(assistants) || assistants.length !== 1) return NextResponse.json({ error: "ไม่พบผู้ช่วยติดตั้งที่ใช้งานได้" }, { status: 400 });
    }
    const id = randomUUID();
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO install_jobs (id,job_number,job_name,supervisor_user_id,assistant_user_id,job_created_date,delivery_date,status,created_by_user_id,updated_by_user_id)
         VALUES (?,?,?,?,?,?,?,'waiting',?,?)`,
        [id, jobNumber, jobName, supervisorId, assistantId, createdDate, deliveryDate, user.id, user.id],
      );
      await connection.execute(
        "INSERT INTO job_status_logs (id,job_id,old_status,new_status,changed_by_user_id) VALUES (?,?,NULL,'waiting',?)",
        [randomUUID(), id, user.id],
      );
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการ" }, { status: 403 });
    return NextResponse.json({ error: "ไม่สามารถบันทึกงานได้ กรุณาตรวจสอบการเชื่อมต่อและ Job Number" }, { status: 503 });
  }
}
