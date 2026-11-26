"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Job = { id: string; jobNumber: string; jobName: string; supervisor: string; assistant: string | null; deliveryDate: string; status: "waiting" | "progress" | "done" };
const statusLabel = { waiting: "รอดำเนินการ", progress: "กำลังดำเนินการ", done: "เสร็จสิ้น" };

export default function InstallPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState("กำลังโหลดรายการงาน...");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  async function load() {
    setMessage("กำลังโหลดรายการงาน...");
    try {
      const params = new URLSearchParams(); if (query) params.set("q", query); if (filter) params.set("status", filter);
      const response = await fetch(`/api/jobs?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "โหลดรายการงานไม่สำเร็จ");
      setJobs(data.jobs); setMessage(data.jobs.length ? "" : "ยังไม่มีรายการงาน");
    } catch (error) { setMessage(error instanceof Error ? error.message : "ไม่สามารถโหลดรายการงานได้"); }
  }
  useEffect(() => { void load(); }, []);
  return <div className="s-layout">
    <aside className="s-side"><Link href="/" className="s-brand"><span className="s-brand-icon"><i className="bi bi-wrench-adjustable" /></span><span>Install<small>ระบบจัดการงาน</small></span></Link>
      <nav className="s-menu"><Link href="/"><i className="bi bi-grid-1x2"/>หน้าแรก</Link><Link className="active" href="/install"><i className="bi bi-list-check"/>งานทั้งหมด</Link><Link href="/trash"><i className="bi bi-trash3"/>ถังขยะ</Link><Link href="/report"><i className="bi bi-bar-chart-line"/>รายงาน</Link><Link href="/profile"><i className="bi bi-person"/>โปรไฟล์</Link></nav>
      <Link className="s-user" href="/login"><strong>ผู้ใช้งาน</strong><small>เข้าสู่ระบบ</small></Link></aside>
    <main className="s-main"><div className="s-top"><form className="s-search" onSubmit={e=>{e.preventDefault();void load();}}><i className="bi bi-search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาเลขที่งานหรือชื่องาน" aria-label="ค้นหารายการงาน"/><button className="s-search-submit">ค้นหา</button></form><span className="s-system-alert">สถานะระบบ · Install</span></div>
      <section className="s-stats"><div className="s-stat"><div className="s-stat-head">งานทั้งหมด</div><strong>{jobs.length}</strong></div>{(["waiting","progress","done"] as const).map(status=><div className="s-stat" key={status}><div className="s-stat-head">{statusLabel[status]}</div><strong>{jobs.filter(job=>job.status===status).length}</strong></div>)}</section>
      <div className="s-toolbar"><div className="s-filter-list"><label className="s-filter-label" htmlFor="status-filter">สถานะ</label><select id="status-filter" className="s-select" value={filter} onChange={e=>{setFilter(e.target.value);setTimeout(()=>void load(),0);}}><option value="">ทั้งหมด</option><option value="waiting">รอดำเนินการ</option><option value="progress">กำลังดำเนินการ</option><option value="done">เสร็จสิ้น</option></select></div><div className="s-tools"><Link className="s-add" href="/install/new"><i className="bi bi-plus-circle"/>เพิ่มงานใหม่</Link></div></div>
      <section className="s-table-box"><table className="s-table"><thead><tr><th>เลขที่งาน</th><th>ชื่องาน</th><th>หัวหน้าช่าง</th><th>ผู้ช่วยติดตั้ง</th><th>วันจัดส่ง</th><th>สถานะ</th></tr></thead><tbody>{jobs.map(job=><tr key={job.id}><td>{job.jobNumber}</td><td>{job.jobName}</td><td>{job.supervisor}</td><td>{job.assistant || "—"}</td><td>{String(job.deliveryDate).slice(0,10)}</td><td><span className={`status-${job.status}`}>{statusLabel[job.status]}</span></td></tr>)}{!jobs.length&&<tr><td colSpan={6} className="text-center py-5">{message}</td></tr>}</tbody></table><div className="s-table-foot"><span>แสดง {jobs.length} รายการ</span></div></section>
    </main>
  </div>;
}
