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

  useEffect(() => {
    const unsub = listenNotifications(uid, (notifs) => {
      setUnread(notifs.filter((n) => !n.read).length);
    });
    return unsub;
  }, [uid]);

  const homeLink = role === "teacher" ? "/teacher/dashboard" : "/student/portal";

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href={homeLink} className="flex items-center gap-2 font-bold text-brand-500">
          <span className="text-xl">🧮</span>
          <span className="hidden sm:inline">MathClass</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 text-sm">
          {role === "teacher" ? (
            <>
              <NavLink href="/teacher/dashboard">Dashboard</NavLink>
              <NavLink href="/teacher/worksheets">Worksheets</NavLink>
              <NavLink href="/teacher/students">Students</NavLink>
            </>
          ) : (
            <>
              <NavLink href="/student/portal">Assignments</NavLink>
              <NavLink href="/student/badges">My Badges</NavLink>
            </>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <Link href={role === "teacher" ? "/teacher/dashboard" : "/student/portal"} className="relative">
            <span className="text-xl">🔔</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>

          {/* Avatar + name */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-sm text-gray-700">
              {displayName.split(" ")[0]}
            </span>
          </div>

          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
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
