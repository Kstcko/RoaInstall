import styles from "./page.module.css";

export default function Home() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);

  return (
    <main className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>RI</div>
          <div><h1>RoaInstall</h1><span>Install Management</span></div>
        </div>
        <p className={styles.menuLabel}>เมนูหลัก</p>
        <nav className={styles.navigation} aria-label="เมนูหลัก">
          <a className={styles.active} href="#overview">ภาพรวม</a>
          <a href="#install-jobs">งานติดตั้ง</a>
          <a href="/trash">ถังขยะ</a>
          <a href="/login">เข้าสู่ระบบ</a>
        </nav>
        <div className={styles.sidebarBottom}>ระบบจัดการงานติดตั้ง</div>
      </aside>

      <section className={styles.mainContent}>
        <header className={styles.topbar}>
          <div><span className={styles.breadcrumb}>RoaInstall / ภาพรวม</span><h2>ภาพรวมงานติดตั้ง</h2></div>
          <span className={databaseConfigured ? styles.systemStatus : styles.systemError}>
            <span className={styles.statusDot} />
            {databaseConfigured ? "ตั้งค่า Database แล้ว · รอตรวจการเชื่อมต่อ" : "ยังไม่ได้เชื่อมต่อฐานข้อมูล"}
          </span>
        </header>

        <div className={styles.content} id="overview">
          <section className={styles.welcome}>
            <div><span className={styles.eyebrow}>INSTALL MANAGEMENT</span><h3>จัดการงานติดตั้งในที่เดียว</h3><p>รายการและสรุปงานจะแสดงเมื่อเชื่อมต่อฐานข้อมูล TiDB Cloud</p></div>
            <div className={styles.welcomeDecoration}>RI</div>
          </section>

          <section className={styles.summarySection} aria-labelledby="summary-heading">
            <div className={styles.sectionHeading}><div><h3 id="summary-heading">สรุปสถานะงาน</h3><p>ข้อมูลจากฐานข้อมูลจริงเท่านั้น</p></div></div>
            <div className={styles.emptyState} role="status">
              <strong>ยังไม่มีข้อมูลให้แสดง</strong>
              <span>{databaseConfigured ? "ยังไม่สามารถยืนยันการเชื่อมต่อฐานข้อมูลได้" : "กรุณาตั้งค่า DATABASE_URL ของ TiDB Cloud ใน Environment Variables"}</span>
            </div>
          </section>

          <section className={styles.taskSection} id="install-jobs">
            <div className={styles.sectionHeading}><div><h3>งานติดตั้งล่าสุด</h3><p>ไม่มีการใช้ข้อมูลตัวอย่าง</p></div></div>
            <div className={styles.emptyState}><strong>รายการงานยังไม่พร้อมใช้งาน</strong><span>ระบบจะแสดงงานหลังจากตั้งค่าฐานข้อมูลและเข้าสู่ระบบ</span></div>
          </section>
          <footer className={styles.footer}><span>RoaInstall Management System</span><span>TiDB Cloud · MySQL-compatible</span></footer>
        </div>
      </section>
    </main>
  );
}
