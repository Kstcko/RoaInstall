import Link from "next/link";
export default function ResetPasswordPage(){return <main className="a-page"><section className="a-box"><Link className="a-back" href="/login">← <span>กลับเข้าสู่ระบบ</span></Link><h1>ตั้งรหัสผ่านใหม่</h1><p className="a-sub">ลิงก์ตั้งรหัสผ่านจะใช้งานได้หลังเชื่อมต่อระบบบัญชี</p><p className="a-error" role="status">ยังไม่ได้ตั้งค่าฐานข้อมูล TiDB</p></section></main>}
