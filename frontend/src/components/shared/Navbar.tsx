"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listenNotifications } from "../../lib/firestore";
import { logout } from "../../hooks/useAuth";
import type { UserRole } from "../../types";

interface Props {
  uid: string;
  displayName: string;
  role: UserRole;
}

export default function Navbar({ uid, displayName, role }: Props) {
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = listenNotifications(uid, (notifs) => {
      setUnread(notifs.filter((n) => !n.read).length);
    });
    return unsub;
  }, [uid]);

  const homeLink = role === "teacher" ? "/teacher/dashboard" : "/student/portal";

  const navLinks =
    role === "teacher"
      ? [
          { href: "/teacher/dashboard", label: "Dashboard" },
          { href: "/teacher/worksheets", label: "Worksheets" },
          { href: "/teacher/students", label: "Students" },
        ]
      : [
          { href: "/student/portal", label: "Assignments" },
          { href: "/student/badges", label: "My Badges" },
        ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href={homeLink} className="flex items-center gap-2 font-bold text-brand-500">
          <span className="text-xl">🧮</span>
          <span className="hidden sm:inline">MathClass</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {navLinks.map((l) => (
            <NavLink key={l.href} href={l.href}>{l.label}</NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <Link href={homeLink} className="relative">
            <span className="text-xl">🔔</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>

          {/* Avatar + name (desktop only) */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-gray-700">{displayName.split(" ")[0]}</span>
          </div>

          <button
            onClick={logout}
            className="hidden sm:block text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>

          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden flex flex-col gap-1 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Menu"
          >
            <span className={`block h-0.5 w-5 bg-gray-600 transition-transform ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
            <span className={`block h-0.5 w-5 bg-gray-600 transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-gray-600 transition-transform ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 shadow-md">
          {/* User info */}
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-800">{displayName}</span>
          </div>
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => { setMenuOpen(false); logout(); }}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors mt-1"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
    >
      {children}
    </Link>
  );
}
