"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout, TOKEN_KEY } from "../lib/api-client";

const navigation = [
  ["/dashboard", "Tổng quan", "01"],
  ["/people", "Con người", "02"],
  ["/access-grants", "Quyền truy cập", "03"],
  ["/access-points", "Điểm kiểm soát", "04"],
  ["/devices", "Thiết bị", "05"],
  ["/access-events", "Nhật ký", "06"],
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!sessionStorage.getItem(TOKEN_KEY)) {
      window.location.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setReady(true);
    const expire = () => window.location.replace("/login?expired=1");
    window.addEventListener("admin-session-expired", expire);
    return () => window.removeEventListener("admin-session-expired", expire);
  }, [pathname]);
  if (!ready)
    return <div className="boot-state">Đang xác thực phiên quản trị…</div>;
  return (
    <div className="admin-frame">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">AC</span>
          <span>
            <strong>ACCESS</strong>
            <small>CONTROL / OPS</small>
          </span>
        </Link>
        <nav aria-label="Điều hướng quản trị">
          {navigation.map(([href, label, index]) => (
            <Link
              className={
                pathname.startsWith(href) ? "nav-link active" : "nav-link"
              }
              href={href}
              key={href}
            >
              <span>{index}</span>
              {label}
            </Link>
          ))}
        </nav>
        <button className="logout" onClick={logout} type="button">
          Đăng xuất ↗
        </button>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="live-dot" /> HỆ THỐNG VẬN HÀNH{" "}
          <time>
            {new Intl.DateTimeFormat("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              dateStyle: "medium",
            }).format(new Date())}
          </time>
        </header>
        {children}
      </div>
    </div>
  );
}
