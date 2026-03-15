"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { listenNotifications } from "../../lib/firestore";
import { logout } from "../../hooks/useAuth";
import AssignSmartLogo from "./AssignSmartLogo";
import type { UserRole } from "../../types";

interface Props {
  uid: string;
  displayName: string;
  role: UserRole;
}

export default function Navbar({ uid, displayName, role }: Props) {
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

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
          { href: "/teacher/calendar",  label: "Calendar" },
          { href: "/teacher/worksheets", label: "Worksheets" },
          { href: "/teacher/students",   label: "Students" },
          { href: "/teacher/progress",   label: "Progress" },
        ]
      : [
          { href: "/student/portal", label: "Assignments" },
          { href: "/student/badges", label: "Badges" },
        ];

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 shadow-glass backdrop-blur-xl bg-slate-950/80">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* Logo */}
        <Link href={homeLink} className="flex items-center gap-2 group">
          <AssignSmartLogo size={32} className="rounded-lg group-hover:opacity-90 transition-opacity" />
          <span className="hidden sm:block font-heading text-[1.15rem] font-bold text-ink tracking-tight">AssignSmart</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navLinks.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "text-green-400 bg-green-500/10"
                    : "text-mist hover:text-ink hover:bg-white/5"
                }`}
              >
                {l.label}
                {active && (
                  <span className="absolute bottom-[3px] left-3.5 right-3.5 h-[2px] bg-green-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1.5">

          {/* Bell */}
          <Link href={homeLink} className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
            <svg className="w-5 h-5 text-mist" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Notifications">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unread > 0 && (
              <span className="absolute top-1 right-1 bg-brick text-white text-[9px] min-w-[14px] h-[14px] rounded-full flex items-center justify-center font-bold leading-none px-0.5">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>

          {/* Avatar + name */}
          <div className="hidden sm:flex items-center gap-2 pl-1">
            <div className="w-8 h-8 rounded-full bg-green-500/15 border-2 border-green-500/25 flex items-center justify-center text-green-400 font-bold text-xs">
              {initials}
            </div>
            <span className="text-sm font-semibold text-ink">{displayName.split(" ")[0]}</span>
          </div>

          <button
            onClick={logout}
            className="hidden sm:block text-xs text-mist hover:text-ink font-semibold px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors ml-1"
          >
            Sign out
          </button>

          {/* Hamburger (mobile) */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            <span className={`block h-0.5 w-5 bg-ink rounded-full transition-transform duration-200 origin-center ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block h-0.5 w-5 bg-ink rounded-full transition-all duration-200 ${menuOpen ? "opacity-0 scale-x-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-ink rounded-full transition-transform duration-200 origin-center ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-slate-900/95 backdrop-blur-xl px-4 py-3 space-y-1 shadow-glass animate-fade-in">
          <div className="flex items-center gap-3 pb-3 mb-2 border-b border-white/10">
            <div className="w-9 h-9 rounded-full bg-green-500/15 border-2 border-green-500/25 flex items-center justify-center text-green-400 font-bold text-sm">
              {initials}
            </div>
            <div>
              <p className="text-sm font-bold text-ink">{displayName}</p>
              <p className="text-xs text-mist capitalize">{role}</p>
            </div>
          </div>
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-ink hover:bg-white/5 transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => { setMenuOpen(false); logout(); }}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
