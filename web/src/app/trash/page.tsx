import Link from "next/link";

export default function TrashPage() {
  return <main className="simple-page"><Link href="/" className="simple-back">← กลับหน้าแรก</Link><h1>ถังขยะงานติดตั้ง</h1><section className="simple-state"><strong>ยังโหลดถังขยะไม่ได้</strong><span>เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ และเชื่อมต่อฐานข้อมูลเพื่อดูหรือกู้คืนงาน</span></section></main>;
}
