"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { createBooking, useBookings, cancelBooking } from "./hooks";

interface Booking {
  id: string;
  instructorId: string;
  studentId: string;
  scheduledStart: string;
  scheduledEnd: string;
  meetingLink?: string;
  status: "CONFIRMED" | "PENDING" | "CANCELLED";
}

const DEMO_BOOKINGS: Booking[] = [
  {
    id: "demo-1",
    instructorId: "instructor-001",
    studentId: "student-001",
    scheduledStart: new Date(Date.now() + 86400000).toISOString(),
    scheduledEnd: new Date(Date.now() + 90000000).toISOString(),
    meetingLink: "https://meet.google.com/abc-defg-hij",
    status: "CONFIRMED",
  },
  {
    id: "demo-2",
    instructorId: "instructor-001",
    studentId: "student-002",
    scheduledStart: new Date(Date.now() + 172800000).toISOString(),
    scheduledEnd: new Date(Date.now() + 176400000).toISOString(),
    status: "PENDING",
  },
  {
    id: "demo-3",
    instructorId: "instructor-001",
    studentId: "student-003",
    scheduledStart: new Date(Date.now() - 86400000).toISOString(),
    scheduledEnd: new Date(Date.now() - 82800000).toISOString(),
    meetingLink: "https://meet.google.com/xyz-uvwx-yz",
    status: "CANCELLED",
  },
];

const TR_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const TR_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => {
  const h = i + 8;
  return `${String(h).padStart(2, "0")}:00`;
});

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    (async () => {
      try {
        const me = await api<{ id?: string; userId?: string; role?: string }>("/auth/profile");
        setUserId(me?.id ?? me?.userId ?? null);
        setRole(me?.role ?? null);
      } catch {
        setUserId(null);
      }
    })();
  }, []);

  const isInstructor = useMemo(
    () => role === "INSTRUCTOR" || role === "HEAD_INSTRUCTOR" || role === "ADMIN",
    [role]
  );

  const { bookings: rawBookings, isLoading, refresh } = useBookings(
    isInstructor ? "instructor" : "student",
    userId ?? ""
  );

  const bookings: Booking[] = useMemo(() => {
    const list = rawBookings as Booking[];
    return list.length > 0 ? list : DEMO_BOOKINGS;
  }, [rawBookings]);

  const today = new Date();

  // Week strip
  const weekDays = useMemo(() => {
    const monday = getMonday(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, []);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // offset: Monday=0
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;
    const days: (Date | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentMonth]);

  function bookingsForDay(d: Date): Booking[] {
    return bookings.filter((b) => isSameDay(new Date(b.scheduledStart), d));
  }

  // Stats
  const stats = useMemo(() => {
    const active = bookings.filter((b) => b.status !== "CANCELLED").length;
    const thisWeek = bookings.filter((b) => {
      const d = new Date(b.scheduledStart);
      return weekDays.some((w) => isSameDay(d, w));
    }).length;
    const completed = bookings.filter((b) => {
      const d = new Date(b.scheduledStart);
      return d < today && b.status === "CONFIRMED";
    }).length;
    const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
    return { active, thisWeek, completed, cancelled };
  }, [bookings, weekDays]);

  function statusBadge(status: Booking["status"]) {
    if (status === "CONFIRMED") return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
        Onaylı
      </span>
    );
    if (status === "PENDING") return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
        Bekliyor
      </span>
    );
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400">
        İptal
      </span>
    );
  }

  async function handleCreateBooking() {
    if (!userId || !studentId || !selectedSlot) return;
    const [h] = selectedSlot.split(":").map(Number);
    const start = new Date(selectedDate);
    start.setHours(h, 0, 0, 0);
    const end = new Date(start);
    end.setHours(h + 1, 0, 0, 0);
    await createBooking({
      instructorId: userId,
      studentId,
      start: start.toISOString(),
      end: end.toISOString(),
      meetingLink: meetingLink || undefined,
    });
    setStudentId("");
    setMeetingLink("");
    setSelectedSlot(null);
    await refresh();
  }

  return (
    <main className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <header className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hero">
        <div className="hero-content space-y-2">
          <div className="pill w-fit">
            <span className="status-dot online" />
            Randevu Sistemi
          </div>
          <h1 className="text-3xl font-bold">Ders <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">Takvimi</span></h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Slot oluştur, öğrenci davet et veya derse katıl.
          </p>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Aktif randevu", value: stats.active, bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200", val: "text-emerald-700", icon: "✅" },
          { label: "Bu hafta", value: stats.thisWeek, bg: "bg-gradient-to-br from-sky-50 to-sky-100/50 border-sky-200", val: "text-sky-700", icon: "📅" },
          { label: "Tamamlanan", value: stats.completed, bg: "bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200", val: "text-violet-700", icon: "🎓" },
          { label: "İptal", value: stats.cancelled, bg: "bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200", val: "text-rose-700", icon: "❌" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border ${s.bg} p-3 text-center`}>
            <div className="text-lg mb-0.5">{s.icon}</div>
            <div className={`text-2xl font-bold ${s.val}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Week Strip */}
      <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">Bu Hafta</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weekDays.map((d, i) => {
            const isActive = isSameDay(d, selectedDate);
            const isToday = isSameDay(d, today);
            return (
              <button
                key={i}
                onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                className={[
                  "flex-shrink-0 flex flex-col items-center justify-center w-12 h-14 rounded-xl text-xs font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-b from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30"
                    : isToday
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700"
                    : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50",
                ].join(" ")}
              >
                <span className="text-[10px] opacity-75">{TR_DAYS[i]}</span>
                <span className="text-base font-bold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar + Time Slot */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Month Calendar */}
        <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 transition-colors"
            >
              ‹
            </button>
            <span className="text-sm font-semibold">
              {TR_MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 transition-colors"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {TR_DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500 py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d, i) => {
              if (!d) return <div key={i} />;
              const dayBookings = bookingsForDay(d);
              const hasConfirmed = dayBookings.some((b) => b.status !== "CANCELLED");
              const hasCancelled = dayBookings.some((b) => b.status === "CANCELLED");
              const isSelected = isSameDay(d, selectedDate);
              const isToday = isSameDay(d, today);
              return (
                <button
                  key={i}
                  onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                  className={[
                    "relative flex flex-col items-center justify-center h-9 rounded-lg text-xs font-medium transition-all",
                    isSelected
                      ? "bg-gradient-to-b from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30"
                      : isToday
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-300 dark:ring-indigo-700"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300",
                  ].join(" ")}
                >
                  {d.getDate()}
                  {(hasConfirmed || hasCancelled) && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {hasConfirmed && <span className="w-1 h-1 rounded-full bg-emerald-500" />}
                      {hasCancelled && <span className="w-1 h-1 rounded-full bg-rose-500" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots */}
        <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="text-sm font-semibold mb-3">
            {selectedDate.getDate()} {TR_MONTHS[selectedDate.getMonth()]} — Saat Seç
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(isSelected ? null : slot)}
                  className={[
                    "py-2 rounded-xl text-sm font-medium transition-all border",
                    isSelected
                      ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-md shadow-indigo-500/30"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400",
                  ].join(" ")}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Booking Form (instructor only) */}
      {isInstructor && selectedSlot && (
        <section className="glass rounded-2xl border border-indigo-200 dark:border-indigo-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="font-semibold text-sm">
              Slot Oluştur — {selectedDate.getDate()} {TR_MONTHS[selectedDate.getMonth()]}, {selectedSlot}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Öğrenci ID / Adı</label>
              <input
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                placeholder="Öğrenci ara..."
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Meeting Link (opsiyonel)</label>
              <input
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                placeholder="https://meet.google.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
          </div>
          <button
            className="btn-link w-full sm:w-auto px-6"
            onClick={handleCreateBooking}
            disabled={!studentId}
          >
            Slot Oluştur
          </button>
        </section>
      )}

      {/* Booking Cards */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-base font-bold">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-violet-400 inline-block" />
          Randevularım
        </div>
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : bookings.length === 0 ? (
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Henüz randevu bulunmuyor.
          </div>
        ) : (
          bookings.map((b) => (
            <div
              key={b.id}
              className={[
                "glass rounded-2xl border p-4 transition-all hover:shadow-md",
                b.status === "CANCELLED"
                  ? "border-rose-200 dark:border-rose-900/50 opacity-60 bg-rose-50/30"
                  : b.status === "CONFIRMED"
                  ? "border-emerald-200 bg-emerald-50/20"
                  : "border-amber-200 bg-amber-50/20 dark:border-slate-700",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(b.status)}
                    <span
                      className={[
                        "font-semibold text-sm",
                        b.status === "CANCELLED" ? "line-through text-slate-400" : "",
                      ].join(" ")}
                    >
                      {fmtDate(b.scheduledStart)} · {fmtTime(b.scheduledStart)}–{fmtTime(b.scheduledEnd)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Eğitmen: <span className="font-medium">{b.instructorId}</span>
                    {" · "}
                    Öğrenci: <span className="font-medium">{b.studentId}</span>
                  </div>
                  {b.meetingLink && (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                      {b.meetingLink}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {b.meetingLink && b.status !== "CANCELLED" && (
                    <button
                      className="btn-link text-xs px-3 py-1.5"
                      onClick={() => window.open(b.meetingLink, "_blank")}
                    >
                      Katıl
                    </button>
                  )}
                  {isInstructor && b.status !== "CANCELLED" && (
                    <button
                      className="btn-link text-xs px-3 py-1.5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      onClick={async () => { await cancelBooking(b.id); await refresh(); }}
                    >
                      İptal
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
