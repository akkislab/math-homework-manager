"use client";
import { useEffect, useState, useMemo } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { Class, ClassSession } from "../../types";

const DAYS_OF_WEEK = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_ABBR     = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS       = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CLASS_DAYS   = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ── Week-view time grid constants ──────────────────────────────────────────────
const WEEK_START_HOUR = 7;   // 7 AM
const WEEK_END_HOUR   = 22;  // 10 PM
const HOUR_HEIGHT     = 60;  // px per hour
const WEEK_HOURS      = Array.from({ length: WEEK_END_HOUR - WEEK_START_HOUR + 1 }, (_, i) => WEEK_START_HOUR + i);
const WEEK_GRID_H     = (WEEK_END_HOUR - WEEK_START_HOUR) * HOUR_HEIGHT; // 900px

function fmtHour(h: number) {
  if (h === 0)  return "12 AM";
  if (h < 12)  return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

const COLORS = [
  { dot:"bg-green-400",  pill:"bg-green-500",  light:"bg-green-500/10",  border:"border-green-500/20",  text:"text-green-400"  },
  { dot:"bg-purple-400", pill:"bg-purple-500", light:"bg-purple-500/10", border:"border-purple-500/20", text:"text-purple-400" },
  { dot:"bg-amber-400",  pill:"bg-amber-500",  light:"bg-amber-500/10",  border:"border-amber-500/20",  text:"text-amber-400"  },
  { dot:"bg-sky-400",    pill:"bg-sky-500",    light:"bg-sky-500/10",    border:"border-sky-500/20",    text:"text-sky-400"    },
  { dot:"bg-rose-400",   pill:"bg-rose-500",   light:"bg-rose-500/10",   border:"border-rose-500/20",   text:"text-rose-400"   },
  { dot:"bg-teal-400",   pill:"bg-teal-500",   light:"bg-teal-500/10",   border:"border-teal-500/20",   text:"text-teal-400"   },
];

interface CalEvent {
  id: string;
  classId: string;
  className: string;
  classType: "solo" | "group";
  time: string;
  colorIdx: number;
  isOneOff: boolean;
  sessionId?: string;
  note?: string;
}

interface Props {
  teacherUid: string;
  classes: Class[];
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2,"0")} ${ampm}`;
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const pad = first.getDay();
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - pad + i));
}

function getWeekDays(cursor: Date): Date[] {
  const d = new Date(cursor);
  d.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return x;
  });
}

export default function CalendarView({ teacherUid, classes }: Props) {
  const [view, setView]         = useState<"month"|"week">("month");
  const [cursor, setCursor]     = useState(() => new Date());
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [selDay, setSelDay]     = useState<Date|null>(null);
  const [selEvent, setSelEvent] = useState<CalEvent|null>(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [addDate, setAddDate]   = useState(() => toDateKey(new Date()));
  const [addClassId, setAddClassId] = useState("");
  const [addTime, setAddTime]   = useState("09:00");
  const [addNote, setAddNote]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Real-time listener for sessions ────────────────────────────────────────
  useEffect(() => {
    if (!teacherUid) return;
    const q = query(collection(db, "classSessions"), where("teacherId", "==", teacherUid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassSession)));
      },
      (err) => {
        console.error("classSessions listener error:", err);
      }
    );
    return unsub;
  }, [teacherUid]);

  const colorMap = useMemo(() => {
    const m: Record<string, number> = {};
    classes.forEach((c, i) => { m[c.id] = i % COLORS.length; });
    return m;
  }, [classes]);

  const getEvents = (date: Date): CalEvent[] => {
    const dayName = DAYS_OF_WEEK[date.getDay()];
    const dateKey = toDateKey(date);
    const events: CalEvent[] = [];

    for (const cls of classes) {
      if (cls.classDay === dayName && cls.classTime) {
        events.push({
          id: `${cls.id}::${dateKey}`,
          classId: cls.id,
          className: cls.name,
          classType: cls.classType ?? "group",
          time: cls.classTime,
          colorIdx: colorMap[cls.id] ?? 0,
          isOneOff: false,
        });
      }
    }
    for (const s of sessions) {
      if (s.date === dateKey) {
        events.push({
          id: s.id,
          classId: s.classId,
          className: s.className,
          classType: s.classType,
          time: s.time,
          colorIdx: colorMap[s.classId] ?? 0,
          isOneOff: true,
          sessionId: s.id,
          note: s.note,
        });
      }
    }
    return events.sort((a, b) => a.time.localeCompare(b.time));
  };

  function prev() {
    setCursor((d) => {
      const n = new Date(d);
      if (view === "month") n.setMonth(n.getMonth() - 1);
      else n.setDate(n.getDate() - 7);
      return n;
    });
  }
  function next() {
    setCursor((d) => {
      const n = new Date(d);
      if (view === "month") n.setMonth(n.getMonth() + 1);
      else n.setDate(n.getDate() + 7);
      return n;
    });
  }
  function goToday() { setCursor(new Date()); }

  function openAddForDay(date: Date) {
    setAddDate(toDateKey(date));
    setAddClassId(classes[0]?.id ?? "");
    setSaveError(null);
    setShowAdd(true);
  }

  // ── Save session: write to Firestore + optimistic local update + navigate ──
  async function handleAddSession(e: React.FormEvent) {
    e.preventDefault();
    if (!addClassId) return;
    setSaving(true);
    setSaveError(null);
    const cls = classes.find((c) => c.id === addClassId);
    if (!cls) { setSaving(false); return; }
    try {
      const docRef = await addDoc(collection(db, "classSessions"), {
        classId: addClassId,
        className: cls.name,
        teacherId: teacherUid,
        date: addDate,
        time: addTime,
        classType: cls.classType ?? "group",
        note: addNote || null,
        createdAt: serverTimestamp(),
      });

      // Optimistic update — ensures session appears even if listener is slow
      const optimistic: ClassSession = {
        id: docRef.id,
        classId: addClassId,
        className: cls.name,
        teacherId: teacherUid,
        date: addDate,
        time: addTime,
        classType: cls.classType ?? "group",
        note: addNote || undefined,
        createdAt: null as never,
      };
      setSessions((prev) => {
        const exists = prev.some((s) => s.id === docRef.id);
        return exists ? prev : [...prev, optimistic];
      });

      // Navigate calendar to the date we just saved
      setCursor(parseDateKey(addDate));
      setShowAdd(false);
      setAddNote("");
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save session. Check Firestore permissions.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    await deleteDoc(doc(db, "classSessions", sessionId));
    setSelEvent(null);
  }

  const today     = new Date();
  const monthDays = getMonthDays(cursor.getFullYear(), cursor.getMonth());
  const weekDays  = getWeekDays(cursor);

  const headerTitle =
    view === "month"
      ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
      : (() => {
          const [start, end] = [weekDays[0], weekDays[6]];
          if (start.getMonth() === end.getMonth())
            return `${MONTHS[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
          return `${MONTHS[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTHS[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
        })();

  return (
    <div className="flex flex-col h-full bg-slate-900">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 shrink-0 flex-wrap gap-y-2">
        <button onClick={goToday} className="btn-secondary text-xs px-3 py-1.5 shrink-0">Today</button>
        <div className="flex items-center gap-0.5">
          <button onClick={prev} className="p-1.5 rounded-lg hover:bg-white/5 text-mist hover:text-ink transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button onClick={next} className="p-1.5 rounded-lg hover:bg-white/5 text-mist hover:text-ink transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
        <h2 className="font-heading text-lg font-semibold text-ink flex-1 min-w-0 truncate">{headerTitle}</h2>
        <div className="tab-bar shrink-0">
          <button onClick={() => setView("month")} className={`tab-pill ${view==="month" ? "tab-pill-active" : "tab-pill-inactive"}`}>Month</button>
          <button onClick={() => setView("week")}  className={`tab-pill ${view==="week"  ? "tab-pill-active" : "tab-pill-inactive"}`}>Week</button>
        </div>
        <button
          onClick={() => { setAddDate(toDateKey(new Date())); setAddClassId(classes[0]?.id ?? ""); setSaveError(null); setShowAdd(true); }}
          className="btn-primary flex items-center gap-1.5 text-sm shrink-0"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          <span className="hidden sm:inline">Add Session</span>
        </button>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      {classes.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 overflow-x-auto scrollbar-hide shrink-0">
          {classes.map((cls, i) => (
            <div key={cls.id} className="flex items-center gap-1.5 shrink-0">
              <span className={`w-2.5 h-2.5 rounded-full ${COLORS[i % COLORS.length].dot}`} />
              <span className="text-xs font-semibold text-mist">{cls.name}</span>
              {cls.classDay && (
                <span className="text-[10px] text-mist/70">{cls.classDay}{cls.classTime ? ` ${formatTime(cls.classTime)}` : ""}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── No batches empty state ─────────────────────────────────────────── */}
      {classes.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <div className="w-14 h-14 bg-white/[0.04] border-2 border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <p className="font-heading text-lg font-semibold text-ink mb-1">No batches yet</p>
            <p className="text-sm text-mist">Create a batch from the Dashboard to see it here.</p>
          </div>
        </div>
      )}

      {/* ── Month View ─────────────────────────────────────────────────────── */}
      {view === "month" && classes.length > 0 && (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-7 border-b border-white/10 sticky top-0 bg-slate-900 z-10">
            {DAY_ABBR.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-bold text-mist uppercase tracking-widest">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7" style={{ gridAutoRows: "minmax(80px, 1fr)" }}>
            {monthDays.map((date, i) => {
              const inMonth  = date.getMonth() === cursor.getMonth();
              const isToday  = date.toDateString() === today.toDateString();
              const isSelDay = selDay?.toDateString() === date.toDateString();
              const events   = getEvents(date);
              return (
                <div
                  key={i}
                  onClick={() => setSelDay(isSelDay ? null : date)}
                  className={`border-r border-b border-white/10 p-1 cursor-pointer transition-colors ${
                    inMonth ? "bg-white/[0.02] hover:bg-white/[0.05]" : "bg-black/20"
                  } ${isSelDay ? "ring-1 ring-inset ring-green-500/40 bg-green-500/5" : ""}`}
                >
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-0.5 ${
                    isToday ? "bg-green-500 text-white" : inMonth ? "text-ink" : "text-mist/50"
                  }`}>{date.getDate()}</div>
                  <div className="space-y-0.5">
                    {events.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); setSelDay(date); setSelEvent(ev); }}
                        className={`${COLORS[ev.colorIdx].pill} text-white text-[10px] font-bold px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity`}
                      >
                        {formatTime(ev.time)} {ev.className}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <div className="text-[10px] text-mist font-semibold pl-1">+{events.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Week View — time-based grid ─────────────────────────────────────── */}
      {view === "week" && classes.length > 0 && (
        <div className="flex-1 overflow-auto">
          {/* Sticky day-header row (8 cols: 1 time + 7 days) */}
          <div
            className="grid border-b border-white/10 sticky top-0 bg-slate-900 z-10"
            style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}
          >
            <div className="py-2 border-r border-white/10" /> {/* time column spacer */}
            {weekDays.map((date, i) => {
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div key={i} className="py-2 text-center border-r border-white/10 last:border-r-0">
                  <div className="text-[11px] font-bold text-mist uppercase tracking-widest">{DAY_ABBR[i]}</div>
                  <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-bold mt-0.5 ${
                    isToday ? "bg-green-500 text-white" : "text-ink"
                  }`}>{date.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* Time grid body */}
          <div className="flex" style={{ minWidth: "560px", height: `${WEEK_GRID_H}px` }}>

            {/* Time labels column */}
            <div className="w-14 shrink-0 border-r border-white/10 relative select-none">
              {WEEK_HOURS.map((h, idx) => (
                <div
                  key={h}
                  className="absolute right-0 pr-2 flex items-center justify-end"
                  style={{ top: idx * HOUR_HEIGHT - 7, height: 14 }}
                >
                  <span className="text-[9px] font-semibold text-mist/50 whitespace-nowrap">{fmtHour(h)}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((date, i) => {
              const events  = getEvents(date);
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div
                  key={i}
                  onClick={() => setSelDay(date)}
                  className={`flex-1 border-r border-white/10 last:border-r-0 relative cursor-pointer overflow-hidden ${
                    isToday ? "bg-green-500/[0.015]" : "hover:bg-white/[0.01] transition-colors"
                  }`}
                >
                  {/* Hour lines */}
                  {WEEK_HOURS.map((_, hi) => (
                    <div
                      key={hi}
                      className="absolute left-0 right-0 border-t border-white/[0.06] pointer-events-none"
                      style={{ top: hi * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Events — absolute positioned by time */}
                  {events.map((ev) => {
                    const [h, m] = ev.time.split(":").map(Number);
                    const topPx  = Math.max(0, (h + m / 60 - WEEK_START_HOUR) * HOUR_HEIGHT);
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); setSelDay(date); setSelEvent(ev); }}
                        className={`${COLORS[ev.colorIdx].light} ${COLORS[ev.colorIdx].border} ${COLORS[ev.colorIdx].text} border rounded-lg cursor-pointer hover:shadow-glass-sm transition-shadow z-10`}
                        style={{ position: "absolute", top: topPx, left: 4, right: 4, minHeight: 50 }}
                      >
                        <div className="flex items-center gap-1 px-2 pt-1.5 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${COLORS[ev.colorIdx].dot} shrink-0`} />
                          <span className="text-[9px] font-bold uppercase tracking-wide truncate">
                            {ev.classType === "solo" ? "Solo" : "Group"}
                          </span>
                          {ev.isOneOff && (
                            <span className="text-[8px] font-bold bg-amber-500/20 text-amber-400 px-1 rounded shrink-0">1-off</span>
                          )}
                        </div>
                        <p className="text-[11px] font-bold leading-tight truncate px-2">{ev.className}</p>
                        <p className="text-[10px] font-medium px-2 pb-1.5 opacity-80">{formatTime(ev.time)}</p>
                      </div>
                    );
                  })}

                  {/* Empty day — click to add */}
                  {events.length === 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openAddForDay(date); }}
                      className="absolute inset-0 w-full flex items-center justify-center text-mist/20 hover:text-green-400 hover:bg-green-500/5 transition-colors text-2xl font-light"
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Selected Day Panel ─────────────────────────────────────────────── */}
      {selDay && (
        <div className="shrink-0 border-t border-white/10 p-4 max-h-48 overflow-y-auto" style={{ background: 'rgba(15,23,42,0.6)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-sm font-semibold text-ink">
              {selDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <button onClick={() => setSelDay(null)} className="text-mist hover:text-ink p-1 rounded-lg hover:bg-sand transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          {getEvents(selDay).length === 0 ? (
            <p className="text-sm text-mist">
              No classes scheduled.{" "}
              <button onClick={() => openAddForDay(selDay)} className="text-green-400 font-semibold hover:underline">Add one</button>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {getEvents(selDay).map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => setSelEvent(ev)}
                  className={`${COLORS[ev.colorIdx].light} ${COLORS[ev.colorIdx].border} ${COLORS[ev.colorIdx].text} border rounded-xl px-3 py-2 text-left hover:shadow-glass-sm transition-shadow`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-bold">{ev.className}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      ev.classType === "solo" ? "bg-purple-500/15 text-purple-400" : "bg-sky-500/15 text-sky-400"
                    }`}>{ev.classType === "solo" ? "Solo" : "Group"}</span>
                  </div>
                  <p className="text-[11px] font-medium">{formatTime(ev.time)}</p>
                </button>
              ))}
              <button
                onClick={() => openAddForDay(selDay)}
                className="border-2 border-dashed border-white/20 text-mist hover:text-ink hover:border-green-500/40 rounded-xl px-3 py-2 text-xs font-bold transition-colors"
              >+ Add</button>
            </div>
          )}
        </div>
      )}

      {/* ── Event Details Modal — improved clarity ─────────────────────────── */}
      {selEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelEvent(null); }}
        >
          <div
            className="w-full max-w-sm animate-fade-in rounded-2xl overflow-hidden shadow-glass-lg border border-white/10"
            style={{ background: 'rgba(13,18,30,0.98)' }}
          >
            {/* Color accent bar */}
            <div className={`h-1 ${COLORS[selEvent.colorIdx].pill}`} />

            <div className="p-5">
              {/* Header: badges + class name + close */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      selEvent.classType === "solo"
                        ? "bg-purple-500/10 text-purple-300 border-purple-500/25"
                        : "bg-sky-500/10 text-sky-300 border-sky-500/25"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${COLORS[selEvent.colorIdx].dot}`} />
                      {selEvent.classType === "solo" ? "Solo Session" : "Group Class"}
                    </span>
                    {selEvent.isOneOff && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                        One-off
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading text-xl font-bold text-white leading-tight truncate">{selEvent.className}</h3>
                </div>
                <button
                  onClick={() => setSelEvent(null)}
                  className="ml-3 shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Detail rows */}
              <div className="space-y-2 mb-5">
                {/* Time */}
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${COLORS[selEvent.colorIdx].light} ${COLORS[selEvent.colorIdx].border} border`}>
                    <svg className={`w-4 h-4 ${COLORS[selEvent.colorIdx].text}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Time</p>
                    <p className="text-base font-bold text-white leading-tight">{formatTime(selEvent.time)}</p>
                  </div>
                </div>

                {/* Date */}
                {selDay && (
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Date</p>
                      <p className="text-sm font-semibold text-white leading-tight">
                        {selDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Recurring */}
                {!selEvent.isOneOff && (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/15">
                    <svg className="w-3.5 h-3.5 text-green-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                    <span className="text-xs font-semibold text-green-400">
                      Recurring every {classes.find((c) => c.id === selEvent.classId)?.classDay ?? "week"}
                    </span>
                  </div>
                )}

                {/* Note */}
                {selEvent.note && (
                  <div
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <svg className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <p className="text-sm text-slate-300 leading-relaxed">{selEvent.note}</p>
                  </div>
                )}
              </div>

              {/* Delete */}
              {selEvent.isOneOff && selEvent.sessionId && (
                <button
                  onClick={() => handleDeleteSession(selEvent.sessionId!)}
                  className="w-full text-sm font-semibold text-red-400 hover:bg-red-500/10 py-2.5 rounded-xl transition-colors border border-red-500/20"
                >
                  Delete Session
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Session Modal ──────────────────────────────────────────────── */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex sm:items-center items-end justify-center bg-ink/50 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAdd(false); setSaveError(null); } }}
        >
          <div
            className="w-full max-w-sm sm:rounded-2xl rounded-t-2xl p-6 shadow-glass-lg border border-white/10 animate-fade-in backdrop-blur-xl"
            style={{ background: 'rgba(13,18,30,0.98)' }}
          >
            <div className="w-10 h-1 bg-sand rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="font-heading text-lg font-semibold text-ink mb-4">Add Class Session</h2>

            {classes.length === 0 ? (
              <p className="text-sm text-mist">No batches yet. Create a batch from the Dashboard first.</p>
            ) : (
              <form onSubmit={handleAddSession} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">Batch</label>
                  <select
                    value={addClassId}
                    onChange={(e) => setAddClassId(e.target.value)}
                    required className="input-field"
                  >
                    <option value="">Select batch…</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Date</label>
                    <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} required className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Time</label>
                    <input type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} required className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">Note <span className="text-mist font-normal">(optional)</span></label>
                  <input
                    type="text" value={addNote} onChange={(e) => setAddNote(e.target.value)}
                    placeholder="e.g. Guest speaker, review session…"
                    className="input-field"
                  />
                </div>

                {saveError && (
                  <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-xs font-semibold text-red-400">{saveError}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={saving} className="btn-primary flex-1">
                    {saving ? "Saving…" : "Add Session"}
                  </button>
                  <button type="button" onClick={() => { setShowAdd(false); setSaveError(null); }} className="btn-secondary">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { CLASS_DAYS };
