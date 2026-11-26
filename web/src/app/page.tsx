import type { Metadata } from "next";
import Link from "next/link";
import HomeNavbar from "./HomeNavbar";

export const metadata: Metadata = {
  title: "หน้าแรก | Rayong OA and Service",
  description: "Rayong OA and Service ระบบจัดการงานและบริการสำหรับองค์กร",
};

export default function Home() {
  return (
    <>
      <HomeNavbar />

      <header className="hero">
        <div className="container">
          <div className="i-layout">
            <div className="i-copy">
              <span className="i-eyebrow">Rayong OA and Service</span>

              <h1 className="i-title">
                บริการสำนักงานและระบบจัดการงาน{" "}
                <span>ที่พร้อมดูแลคุณ</span>
              </h1>

              <p className="i-intro">
                ดูแลงานแจ้งซ่อม ติดตามสถานะ และสรุปผลการทำงานขององค์กรไว้ในที่เดียว
                เพื่อให้ทุกบริการเดินหน้าได้อย่างเป็นระบบ
              </p>

              <div className="i-actions">
                <Link href="/install/new" className="btn btn-primary i-big">
                  แจ้งซ่อม / เพิ่มงาน <i className="bi bi-arrow-right" />
                </Link>

                <Link href="/install" className="btn light-button i-big">
                  ดูงานทั้งหมด
                </Link>
              </div>

              <div className="i-points">
                <span>
                  <i className="bi bi-check-circle-fill" />
                  บริการด้วยความใส่ใจ
                </span>
                <span>
                  <i className="bi bi-check-circle-fill" />
                  ติดตามงานได้ชัดเจน
                </span>
                <span>
                  <i className="bi bi-check-circle-fill" />
                  ข้อมูลพร้อมสำหรับองค์กร
                </span>
              </div>
            </div>

            <div className="i-preview">
              <div className="i-img i-image">
                <div className="i-card">
                  <div className="i-card-head">
                    <strong>ศูนย์จัดการงาน</strong>
                    <span className="i-status">ระบบพร้อมใช้งาน</span>
                  </div>

                  <div className="i-bar i-bar-wide" />
                  <div className="i-bar i-bar-short" />

                  <div className="i-stats">
                    <div className="i-stat">
                      <i className="bi bi-clipboard-check" />
                      <strong>24/7</strong>
                      <small>รับแจ้งงาน</small>
                    </div>

                    <div className="i-stat i-user">
                      <i className="bi bi-bar-chart-line" />
                      <strong>100%</strong>
                      <small>ตรวจสอบได้</small>
                    </div>
                  </div>

                  <div className="i-bar i-bar-wide" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
