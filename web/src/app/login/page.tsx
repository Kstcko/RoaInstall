"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: data.get("username"), password: data.get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "เข้าสู่ระบบไม่สำเร็จ");
      window.location.assign("/install");
    } catch (error) { setMessage(error instanceof Error ? error.message : "ระบบยังไม่พร้อมใช้งาน"); }
    finally { setBusy(false); }
  }
  return <main className="a-page"><section className="a-box"><Link href="/" className="a-back">← <span>ย้อนกลับ</span></Link><div className="a-brand">Install<span>.</span></div><h1>เข้าสู่ระบบ</h1><p className="a-sub">กรุณาเข้าสู่ระบบเพื่อจัดการงานของคุณ</p><form className="a-form" onSubmit={submit}><div className="a-field"><label htmlFor="username">ชื่อผู้ใช้หรืออีเมล</label><input className="form-control" id="username" name="username" autoComplete="username" required maxLength={254}/></div><div className="a-field"><label htmlFor="password">รหัสผ่าน</label><input className="form-control" id="password" name="password" type="password" autoComplete="current-password" required maxLength={256}/></div><button className="btn btn-primary a-submit" disabled={busy}>{busy ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}</button>{message && <p role="alert" className="a-error">{message}</p>}</form></section></main>;
}
