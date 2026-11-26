import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    const { username, password } = body as Record<string, unknown>;
    if (typeof username !== "string" || typeof password !== "string" || username.length > 80 || password.length > 256) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }
    const [rows] = await getDatabase().execute(
      `SELECT u.id,u.password_hash FROM users u JOIN roles r ON r.id=u.role_id
       WHERE (u.username=? OR u.email=?) AND u.is_active=1 AND r.is_active=1 LIMIT 1`,
      [username.trim(), username.trim()],
    );
    const user = (rows as { id: string; password_hash: string }[])[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }
    await createSession(user.id);
    await getDatabase().execute("UPDATE users SET last_login_at=UTC_TIMESTAMP(3) WHERE id=?", [user.id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED") {
      return NextResponse.json({ error: "ยังไม่ได้เชื่อมต่อฐานข้อมูล TiDB" }, { status: 503 });
    }
    return NextResponse.json({ error: "ระบบยืนยันตัวตนยังไม่พร้อมใช้งาน" }, { status: 503 });
  }
}
