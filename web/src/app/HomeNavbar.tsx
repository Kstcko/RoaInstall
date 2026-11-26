"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HomeNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className={`navbar navbar-expand-lg i-top fixed-top${scrolled ? " scrolled" : ""}`}>
      <div className="container">
        <Link
          className="navbar-brand brand i-brand"
          href="/"
          aria-label="Rayong OA and Service หน้าหลัก"
          onClick={closeMenu}
        >
          <img
            src="https://www.rayong-oa.com/logo/Logo-ROA_old.png"
            alt="Rayong OA and Service"
          />
        </Link>

        <button
          className={`navbar-toggler i-menu${menuOpen ? " active" : ""}`}
          type="button"
          aria-label="เปิดหรือปิดเมนูนำทาง"
          aria-controls="mainNav"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>

        <div
          id="mainNav"
          className={`collapse navbar-collapse${menuOpen ? " show" : ""}`}
        >
          <ul className="navbar-nav i-nav">
            <li className="nav-item">
              <Link className="nav-link active" href="/" onClick={closeMenu}>
                หน้าแรก
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" href="/install" onClick={closeMenu}>
                Install
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" href="/profile" onClick={closeMenu}>
                โปรไฟล์
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" href="/login" onClick={closeMenu}>
                ลงชื่อเข้าใช้
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
