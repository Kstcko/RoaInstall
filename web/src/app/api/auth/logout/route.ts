import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST() {
  try {
    await destroySession();
  } catch {
    // Always clear the browser cookie even if the database is unavailable.
  }
  return NextResponse.json({ ok: true });
}
