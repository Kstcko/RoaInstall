import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "ยังไม่ได้เชื่อมต่อฐานข้อมูล TiDB" }, { status: 503 });
  }
}
