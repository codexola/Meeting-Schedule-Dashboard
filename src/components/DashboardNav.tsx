"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/schedule", label: "Schedule", icon: "bi-calendar3" },
  { href: "/status", label: "Status", icon: "bi-list-check" },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
      <div className="container-fluid px-3 px-lg-4" style={{ maxWidth: 1600 }}>
        <div className="navbar-brand mb-0">
          <div className="fw-bold">
            <i className="bi bi-briefcase me-2" />
            Meeting Schedule Dashboard
          </div>
          <small className="text-white-50 d-none d-md-block">
            Manage interviews and job application progress
          </small>
        </div>
        <div className="d-flex gap-2 ms-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`btn btn-sm ${isActive ? "btn-light text-primary fw-semibold" : "btn-outline-light"}`}
              >
                <i className={`bi ${item.icon} me-1`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
