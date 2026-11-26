
import styles from "./page.module.css";

const summary = [
  { label: "งานทั้งหมด", value: "24", icon: "▤", color: "blue" },
  { label: "ยังไม่มีการดำเนินการ", value: "08", icon: "◷", color: "orange" },
  { label: "กำลังดำเนินการ", value: "10", icon: "↻", color: "purple" },
  { label: "เสร็จสิ้น", value: "06", icon: "✓", color: "green" },
];

const tasks = [
  {
    id: "INS-001",
    name: "ติดตั้งระบบเครือข่ายสำนักงาน",
    supervisor: "สมชาย ใจดี",
    assistant: "นักศึกษาฝึกงาน",
    delivery: "28 พ.ย. 2569",
    status: "กำลังดำเนินการ",
  },
  {
    id: "INS-002",
    name: "ติดตั้งเครื่องคอมพิวเตอร์",
    supervisor: "วิชัย รุ่งเรือง",
    assistant: "นักศึกษาฝึกงาน",
    delivery: "29 พ.ย. 2569",
    status: "ยังไม่มีการดำเนินการ",
  },
  {
    id: "INS-003",
    name: "ติดตั้งเครื่องพิมพ์สำนักงาน",
    supervisor: "สมศักดิ์ มีสุข",
    assistant: "นักศึกษาฝึกงาน",
    delivery: "25 พ.ย. 2569",
    status: "เสร็จสิ้น",
  },
  {
    id: "INS-004",
    name: "ติดตั้งระบบกล้องวงจรปิด",
    supervisor: "อนุชา มั่นคง",
    assistant: "นักศึกษาฝึกงาน",
    delivery: "30 พ.ย. 2569",
    status: "กำลังดำเนินการ",
  },
];

function getStatusClass(status: string) {
  if (status === "เสร็จสิ้น") return styles.completed;
  if (status === "กำลังดำเนินการ") return styles.progress;
  return styles.pending;
}

export default function Home() {
  return (
    <main className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>RI</div>
          <div>
            <h1>RoaInstall</h1>
            <span>Management System</span>
          </div>
        </div>

        <div className={styles.menuLabel}>เมนูหลัก</div>

        <nav className={styles.navigation}>
          <a href="#overview" className={styles.active}>
            <span>▦</span> ภาพรวมระบบ
          </a>
          <a href="#tasks">
            <span>▤</span> งานติดตั้ง
          </a>
          <a href="#reports">
            <span>▥</span> รายงาน
          </a>
          <a href="#users">
            <span>♙</span> จัดการผู้ใช้งาน
          </a>
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.profileAvatar}>AD</div>
          <div className={styles.profileInfo}>
            <strong>ผู้ดูแลระบบ</strong>
            <span>Administrator</span>
          </div>
          <span className={styles.profileMenu}>•••</span>
        </div>
      </aside>

      <section className={styles.mainContent}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.breadcrumb}>หน้าหลัก / ภาพรวมระบบ</span>
            <h2>ภาพรวมระบบ</h2>
          </div>
          <div className={styles.topbarRight}>
            <span className={styles.systemStatus}>
              <span className={styles.statusDot}></span>
              ระบบพร้อมใช้งาน
            </span>
            <div className={styles.topAvatar}>AD</div>
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.welcome}>
            <div>
              <span className={styles.eyebrow}>INSTALL MANAGEMENT</span>
              <h3>ยินดีต้อนรับสู่ระบบจัดการงานติดตั้ง</h3>
              <p>จัดการ ติดตาม และตรวจสอบสถานะงานติดตั้งได้จากที่เดียว</p>
            </div>
            <div className={styles.welcomeDecoration}>RI</div>
          </section>

          <section id="overview" className={styles.summarySection}>
            <div className={styles.sectionHeading}>
              <div>
                <h3>สรุปภาพรวมงาน</h3>
                <p>ข้อมูลสถานะงานติดตั้งทั้งหมด</p>
              </div>
              <span className={styles.demoLabel}>ข้อมูลตัวอย่าง</span>
            </div>

            <div className={styles.summaryGrid}>
              {summary.map((item) => (
                <article className={styles.summaryCard} key={item.label}>
                  <div className={`${styles.summaryIcon} ${styles[item.color]}`}>
                    {item.icon}
                  </div>
                  <div>
                    <p>{item.label}</p>
                    <strong>{item.value}</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="tasks" className={styles.taskSection}>
            <div className={styles.sectionHeading}>
              <div>
                <h3>งานติดตั้งล่าสุด</h3>
                <p>รายการงานติดตั้งและสถานะการดำเนินงาน</p>
              </div>
              <button className={styles.viewAll}>ดูงานทั้งหมด →</button>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.taskTable}>
                <thead>
                  <tr>
                    <th>เลขที่งาน</th>
                    <th>ชื่องาน</th>
                    <th>หัวหน้าช่าง</th>
                    <th>ผู้ช่วยติดตั้ง</th>
                    <th>กำหนดส่ง</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td className={styles.taskId}>{task.id}</td>
                      <td className={styles.taskName}>{task.name}</td>
                      <td>{task.supervisor}</td>
                      <td>{task.assistant}</td>
                      <td>{task.delivery}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${getStatusClass(task.status)}`}
                        >
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className={styles.footer}>
            <span>RoaInstall Management System</span>
            <span>Development Preview · 2026</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
