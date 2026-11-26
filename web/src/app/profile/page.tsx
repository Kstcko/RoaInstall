import Link from "next/link";

export default function ProfilePage() {
  return <main className="simple-page"><Link href="/" className="simple-back">← กลับหน้าแรก</Link><h1>โปรไฟล์</h1><section className="simple-state"><strong>ยังไม่พบข้อมูลบัญชี</strong><span>เข้าสู่ระบบหลังจากเชื่อมต่อ TiDB Cloud และเตรียมบัญชีผู้ใช้</span><Link href="/login">ไปหน้าเข้าสู่ระบบ</Link></section></main>;
}
