"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";
const ACCESS_TOKEN_KEY = "accessToken";

// ─── Types ────────────────────────────────────────────────────────────────────

type Instructor = { id: string; name?: string | null; email: string };

type Department = {
  id: string;
  name: string;
  tenantId: string;
  headInstructorId: string;
  HeadInstructor?: Instructor | null;
  DepartmentInstructor?: { Instructor: Instructor }[];
  createdAt: string;
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_DEPARTMENTS: Department[] = [
  {
    id: "d1", name: "Matematik Bölümü", tenantId: "t1", headInstructorId: "u1",
    HeadInstructor: { id: "u1", name: "Prof. Ahmet Yıldız", email: "ahmet@atlasio.io" },
    DepartmentInstructor: [
      { Instructor: { id: "u2", name: "Dr. Fatma Kaya", email: "fatma@atlasio.io" } },
      { Instructor: { id: "u3", name: "Ali Demir", email: "ali@atlasio.io" } },
    ],
    createdAt: "2026-01-10T10:00:00Z",
  },
  {
    id: "d2", name: "Fen Bilimleri", tenantId: "t1", headInstructorId: "u4",
    HeadInstructor: { id: "u4", name: "Prof. Zeynep Arslan", email: "zeynep@atlasio.io" },
    DepartmentInstructor: [
      { Instructor: { id: "u5", name: "Dr. Murat Şahin", email: "murat@atlasio.io" } },
    ],
    createdAt: "2026-02-05T10:00:00Z",
  },
  {
    id: "d3", name: "Dil & İletişim", tenantId: "t1", headInstructorId: "u6",
    HeadInstructor: { id: "u6", name: "Elif Öztürk", email: "elif@atlasio.io" },
    DepartmentInstructor: [],
    createdAt: "2026-03-01T10:00:00Z",
  },
];

const DEMO_INSTRUCTORS: Instructor[] = [
  { id: "u1", name: "Prof. Ahmet Yıldız", email: "ahmet@atlasio.io" },
  { id: "u2", name: "Dr. Fatma Kaya",    email: "fatma@atlasio.io" },
  { id: "u3", name: "Ali Demir",          email: "ali@atlasio.io" },
  { id: "u4", name: "Prof. Zeynep Arslan",email: "zeynep@atlasio.io" },
  { id: "u5", name: "Dr. Murat Şahin",   email: "murat@atlasio.io" },
  { id: "u6", name: "Elif Öztürk",        email: "elif@atlasio.io" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

function displayName(inst?: Instructor | null) {
  if (!inst) return "—";
  return inst.name ?? inst.email;
}

const AVATAR_GRADS = [
  "linear-gradient(135deg,#5B6EFF,#9B59FF)",
  "linear-gradient(135deg,#00D4B4,#5B6EFF)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
  "linear-gradient(135deg,#ef4444,#dc2626)",
  "linear-gradient(135deg,#06b6d4,#0891b2)",
];

function Avatar({ name, size = 32 }: { name?: string | null; size?: number }) {
  const bg = AVATAR_GRADS[(name ?? "?").charCodeAt(0) % AVATAR_GRADS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: bg, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 800, color: "#fff",
    }}>
      {(name ?? "?")[0]?.toUpperCase()}
    </div>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const s = size;
  const icons: Record<string, JSX.Element> = {
    department: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
    users: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    crown: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" /><path d="M5 20h14" />
      </svg>
    ),
    plus: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    userPlus: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" />
      </svg>
    ),
    check: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    close: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    refresh: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
      </svg>
    ),
    chevronDown: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    ),
    warn: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    calendar: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  };
  return icons[name] ?? <svg width={s} height={s} viewBox="0 0 24 24" />;
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `${size > 14 ? 2 : 1.5}px solid rgba(255,255,255,0.25)`,
      borderTopColor: "#fff", animation: "admDeptSpin 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDepartmentsPage() {
  const [token, setToken] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [busy, setBusy] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHeadId, setNewHeadId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [addInstructorDeptId, setAddInstructorDeptId] = useState<string | null>(null);
  const [addInstructorId, setAddInstructorId] = useState("");
  const [addingInstructor, setAddingInstructor] = useState(false);
  const [addInstructorError, setAddInstructorError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setToken(localStorage.getItem(ACCESS_TOKEN_KEY) ?? "");
  }, []);

  const headers = useMemo<Record<string, string>>(
    () => (token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" }),
    [token]
  );

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadDepartments = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/departments/me`, { headers });
      if (!res.ok) throw new Error();
      const data: Department[] = await res.json();
      setDepartments(data.length ? data : DEMO_DEPARTMENTS);
      setIsDemo(!data.length);
    } catch {
      setDepartments(DEMO_DEPARTMENTS);
      setIsDemo(true);
    } finally {
      setBusy(false);
    }
  };

  const loadInstructors = async () => {
    try {
      const res = await fetch(`${API_BASE}/users?role=instructor`, { headers });
      if (!res.ok) throw new Error();
      const data: Instructor[] = await res.json();
      setInstructors(data.length ? data : DEMO_INSTRUCTORS);
    } catch {
      setInstructors(DEMO_INSTRUCTORS);
    }
  };

  useEffect(() => {
    if (token !== undefined) { loadDepartments(); loadInstructors(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newHeadId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(`${API_BASE}/departments`, {
        method: "POST", headers,
        body: JSON.stringify({ name: newName.trim(), headInstructorId: newHeadId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const dept: Department = await res.json();
      setDepartments((prev) => [dept, ...prev]);
      setShowCreateForm(false);
      setNewName(""); setNewHeadId("");
      showToast("Departman başarıyla oluşturuldu!");
    } catch {
      // Demo
      const head = instructors.find((i) => i.id === newHeadId);
      setDepartments((prev) => [{
        id: `demo-${Date.now()}`, name: newName.trim(), tenantId: "t1",
        headInstructorId: newHeadId, HeadInstructor: head,
        DepartmentInstructor: [], createdAt: new Date().toISOString(),
      }, ...prev]);
      setShowCreateForm(false);
      setNewName(""); setNewHeadId("");
      showToast("Departman oluşturuldu (demo).");
    } finally {
      setCreating(false);
    }
  };

  const handleAddInstructor = async (deptId: string) => {
    if (!addInstructorId) return;
    setAddingInstructor(true);
    setAddInstructorError(null);
    try {
      const res = await fetch(`${API_BASE}/departments/${deptId}/instructors`, {
        method: "POST", headers,
        body: JSON.stringify({ instructorId: addInstructorId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const instructor = instructors.find((i) => i.id === addInstructorId);
      if (instructor) {
        setDepartments((prev) => prev.map((d) =>
          d.id === deptId
            ? { ...d, DepartmentInstructor: [...(d.DepartmentInstructor ?? []), { Instructor: instructor }] }
            : d
        ));
      }
      setAddInstructorDeptId(null);
      setAddInstructorId("");
      showToast("Eğitmen bölüme eklendi!");
    } catch {
      setAddInstructorError("Eğitmen eklenemedi. Demo modunda çalışıyor.");
      const instructor = instructors.find((i) => i.id === addInstructorId);
      if (instructor) {
        setDepartments((prev) => prev.map((d) =>
          d.id === deptId
            ? { ...d, DepartmentInstructor: [...(d.DepartmentInstructor ?? []), { Instructor: instructor }] }
            : d
        ));
        setAddInstructorDeptId(null);
        setAddInstructorId("");
        showToast("Eğitmen eklendi (demo).");
      }
    } finally {
      setAddingInstructor(false);
    }
  };

  const totalInstructors = departments.reduce((a, d) => a + (d.DepartmentInstructor?.length ?? 0), 0);

  return (
    <>
      <style>{`
        @keyframes admDeptSpin { to { transform: rotate(360deg); } }
        @keyframes admDeptIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes admDeptScale {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes admDeptToast {
          0% { opacity: 0; transform: translateY(12px); }
          12% { opacity: 1; transform: translateY(0); }
          88% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(12px); }
        }
        .adm-dept-card:hover { border-color: color-mix(in srgb,var(--accent) 30%,var(--line)) !important; }
      `}</style>

      <div className="bg-canvas" /><div className="bg-grid" />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 18px", borderRadius: "var(--r-lg)",
          background: toast.type === "success"
            ? "linear-gradient(135deg,#065f46,#059669)"
            : "linear-gradient(135deg,#7f1d1d,#dc2626)",
          color: "#fff", fontSize: 13, fontWeight: 600,
          boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          animation: "admDeptToast 3.5s ease both",
        }}>
          <Icon name={toast.type === "success" ? "check" : "warn"} size={15} />
          {toast.msg}
        </div>
      )}

      <div className="page-shell" style={{ paddingBottom: 48 }}>

        {/* ── Hero ── */}
        <div
          className="glass"
          style={{
            borderRadius: "var(--r-xl)", marginBottom: 24, padding: "28px 28px 24px",
            background: "linear-gradient(135deg, color-mix(in srgb,var(--accent-2) 8%,var(--panel)) 0%, color-mix(in srgb,var(--accent) 5%,var(--panel)) 100%)",
            border: "1.5px solid color-mix(in srgb,var(--accent) 18%,var(--line))",
            boxShadow: "var(--glow-blue)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{
                width: 54, height: 54, borderRadius: "var(--r-lg)", flexShrink: 0,
                background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "var(--glow-blue)",
              }}>
                <Icon name="department" size={26} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: "clamp(18px,4vw,26px)", fontWeight: 800, color: "var(--ink)", margin: 0, letterSpacing: "-0.03em" }}>
                    Departman Yönetimi
                  </h1>
                  {isDemo && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                      padding: "2px 8px", borderRadius: "var(--r-full)",
                      background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b",
                    }}>DEMO</span>
                  )}
                </div>
                <p style={{ fontSize: 14, color: "var(--ink-2)", margin: 0 }}>
                  Eğitim birimlerini, baş eğitmenleri ve kadroyu yönetin
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={loadDepartments}
                disabled={busy}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "9px 16px", borderRadius: "var(--r-md)",
                  border: "1.5px solid var(--line)", background: "var(--panel)",
                  color: "var(--ink-2)", fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.6 : 1, transition: "all var(--t-fast)",
                }}
              >
                {busy ? <Spinner size={14} /> : <Icon name="refresh" size={14} />}
                Yenile
              </button>
              <button
                onClick={() => { setShowCreateForm((v) => !v); setCreateError(null); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "9px 18px", borderRadius: "var(--r-md)",
                  border: "none", background: showCreateForm
                    ? "var(--line)" : "linear-gradient(135deg,var(--accent-2),var(--accent))",
                  color: showCreateForm ? "var(--ink-2)" : "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  boxShadow: showCreateForm ? "none" : "var(--glow-blue)",
                  transition: "all var(--t-fast)",
                }}
              >
                {showCreateForm ? <><Icon name="close" size={14} /> Kapat</> : <><Icon name="plus" size={14} /> Yeni Departman</>}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { label: "Departman", value: departments.length, icon: "department", color: "var(--accent)" },
              { label: "Eğitmen", value: totalInstructors, icon: "users", color: "var(--accent-3)" },
              { label: "Baş Eğitmen Atandı", value: departments.filter((d) => d.headInstructorId).length, icon: "crown", color: "var(--accent-2)" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "var(--r-sm)",
                  background: "color-mix(in srgb,var(--line) 50%,var(--panel))",
                  display: "flex", alignItems: "center", justifyContent: "center", color: s.color,
                }}>
                  <Icon name={s.icon} size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Create Form ── */}
        {showCreateForm && (
          <div
            style={{
              marginBottom: 20, padding: 22, borderRadius: "var(--r-xl)",
              background: "color-mix(in srgb,var(--accent) 5%,var(--panel))",
              border: "1.5px solid color-mix(in srgb,var(--accent-2) 30%,var(--line))",
              boxShadow: "var(--glow-blue)",
              animation: "admDeptScale 0.2s cubic-bezier(.2,.6,.3,1) both",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "var(--r-sm)",
                background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="department" size={15} />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)", margin: 0 }}>Yeni Departman Oluştur</h2>
            </div>

            {createError && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
                padding: "10px 14px", borderRadius: "var(--r-md)",
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                color: "#ef4444", fontSize: 13,
              }}>
                <Icon name="warn" size={14} /> {createError}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 7 }}>
                  Departman Adı *
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ör. Bilgisayar Bilimleri"
                  autoFocus
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: "var(--r-md)",
                    border: "1.5px solid var(--line)",
                    background: "color-mix(in srgb,var(--line) 20%,var(--panel))",
                    color: "var(--ink)", fontSize: 14, boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 7 }}>
                  Baş Eğitmen *
                </label>
                <select
                  value={newHeadId}
                  onChange={(e) => setNewHeadId(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: "var(--r-md)",
                    border: "1.5px solid var(--line)",
                    background: "color-mix(in srgb,var(--line) 20%,var(--panel))",
                    color: "var(--ink)", fontSize: 14, boxSizing: "border-box",
                  }}
                >
                  <option value="">— Eğitmen seçin —</option>
                  {instructors.map((inst) => (
                    <option key={inst.id} value={inst.id}>{displayName(inst)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setShowCreateForm(false); setNewName(""); setNewHeadId(""); setCreateError(null); }}
                style={{
                  padding: "10px 20px", borderRadius: "var(--r-md)",
                  border: "1.5px solid var(--line)", background: "var(--panel)",
                  color: "var(--ink-2)", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim() || !newHeadId}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 24px", borderRadius: "var(--r-md)",
                  border: "none",
                  background: creating || !newName.trim() || !newHeadId
                    ? "color-mix(in srgb,var(--accent) 40%,var(--line))"
                    : "linear-gradient(135deg,var(--accent-2),var(--accent))",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: creating || !newName.trim() || !newHeadId ? "not-allowed" : "pointer",
                  boxShadow: newName.trim() && newHeadId ? "var(--glow-blue)" : "none",
                }}
              >
                {creating ? <><Spinner size={16} /> Oluşturuluyor…</> : <><Icon name="check" size={15} /> Oluştur</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Department Cards ── */}
        {busy && departments.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{
                height: 82, borderRadius: "var(--r-lg)",
                background: "color-mix(in srgb,var(--line) 40%,var(--panel))",
                animation: `admDeptIn 0.3s ${n * 80}ms both`,
                opacity: 0.5,
              }} />
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="glass" style={{
            borderRadius: "var(--r-xl)", padding: "56px 32px",
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 16, textAlign: "center",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: "var(--r-xl)",
              background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--glow-blue)",
            }}>
              <Icon name="department" size={34} />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", margin: "0 0 8px" }}>Henüz departman yok</h2>
              <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 320 }}>
                İlk departmanı oluşturarak kadroyu organize etmeye başlayın.
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 22px", borderRadius: "var(--r-md)",
                border: "none", background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                boxShadow: "var(--glow-blue)",
              }}
            >
              <Icon name="plus" size={15} /> İlk Departmanı Oluştur
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {departments.map((dept, idx) => {
              const instrCount = dept.DepartmentInstructor?.length ?? 0;
              const isExpanded = expanded.has(dept.id);
              const isAddingHere = addInstructorDeptId === dept.id;

              return (
                <div
                  key={dept.id}
                  className="adm-dept-card glass"
                  style={{
                    borderRadius: "var(--r-lg)", overflow: "hidden",
                    border: "1.5px solid var(--line)",
                    transition: "border-color var(--t-fast)",
                    animation: `admDeptIn 0.3s ${idx * 60}ms both`,
                  }}
                >
                  {/* Card header */}
                  <div
                    onClick={() => instrCount > 0 && toggleExpand(dept.id)}
                    style={{
                      padding: "16px 18px",
                      cursor: instrCount > 0 ? "pointer" : "default",
                      display: "flex", alignItems: "center", gap: 14,
                      background: isExpanded ? "color-mix(in srgb,var(--accent) 4%,var(--panel))" : "var(--panel)",
                      transition: "background var(--t-fast)",
                    }}
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: "var(--r-md)", flexShrink: 0,
                      background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(91,110,255,0.25)",
                    }}>
                      <Icon name="department" size={19} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
                        {dept.name}
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {dept.HeadInstructor && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--accent-2)", fontWeight: 600 }}>
                            <Icon name="crown" size={10} /> {displayName(dept.HeadInstructor)}
                          </span>
                        )}
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)" }}>
                          <Icon name="users" size={10} /> {instrCount} eğitmen
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)" }}>
                          <Icon name="calendar" size={10} /> {fmtDate(dept.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 7, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          if (isAddingHere) { setAddInstructorDeptId(null); setAddInstructorId(""); setAddInstructorError(null); }
                          else { setAddInstructorDeptId(dept.id); setAddInstructorId(""); setAddInstructorError(null); }
                        }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "6px 12px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600,
                          border: isAddingHere
                            ? "1px solid var(--line)"
                            : "1px solid color-mix(in srgb,var(--accent-3) 30%,var(--line))",
                          background: isAddingHere
                            ? "var(--panel)"
                            : "color-mix(in srgb,var(--accent-3) 10%,var(--panel))",
                          color: isAddingHere ? "var(--muted)" : "var(--accent-3)",
                          cursor: "pointer",
                        }}
                      >
                        {isAddingHere ? <><Icon name="close" size={12} /> İptal</> : <><Icon name="userPlus" size={12} /> Eğitmen Ekle</>}
                      </button>

                      {instrCount > 0 && (
                        <div style={{
                          width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                          color: "var(--muted)", transition: "transform var(--t-fast)",
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        }}>
                          <Icon name="chevronDown" size={15} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add instructor inline */}
                  {isAddingHere && (
                    <div style={{
                      borderTop: "1px solid var(--line)", padding: "14px 18px",
                      background: "color-mix(in srgb,var(--accent-3) 4%,var(--panel))",
                      animation: "admDeptIn 0.2s both",
                    }}>
                      {addInstructorError && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 7, marginBottom: 10,
                          padding: "8px 12px", borderRadius: "var(--r-sm)",
                          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                          color: "#ef4444", fontSize: 12,
                        }}>
                          <Icon name="warn" size={12} /> {addInstructorError}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <select
                          value={addInstructorId}
                          onChange={(e) => setAddInstructorId(e.target.value)}
                          style={{
                            flex: 1, minWidth: 200, padding: "9px 12px",
                            borderRadius: "var(--r-md)", border: "1.5px solid var(--line)",
                            background: "color-mix(in srgb,var(--line) 20%,var(--panel))",
                            color: "var(--ink)", fontSize: 13,
                          }}
                        >
                          <option value="">— Eğitmen seçin —</option>
                          {instructors
                            .filter((inst) =>
                              !dept.DepartmentInstructor?.some((di) => di.Instructor.id === inst.id) &&
                              inst.id !== dept.headInstructorId
                            )
                            .map((inst) => (
                              <option key={inst.id} value={inst.id}>{displayName(inst)}</option>
                            ))}
                        </select>
                        <button
                          onClick={() => handleAddInstructor(dept.id)}
                          disabled={addingInstructor || !addInstructorId}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 7,
                            padding: "9px 18px", borderRadius: "var(--r-md)",
                            border: "none",
                            background: addingInstructor || !addInstructorId
                              ? "color-mix(in srgb,var(--accent-3) 40%,var(--line))"
                              : "linear-gradient(135deg,var(--accent-3),#059669)",
                            color: "#fff", fontSize: 13, fontWeight: 700,
                            cursor: addingInstructor || !addInstructorId ? "not-allowed" : "pointer",
                          }}
                        >
                          {addingInstructor ? <><Spinner size={14} /> Ekleniyor…</> : <><Icon name="check" size={14} /> Ekle</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expanded instructor list */}
                  {isExpanded && instrCount > 0 && (
                    <div style={{
                      borderTop: "1px solid var(--line)", padding: "14px 18px",
                      animation: "admDeptIn 0.25s both",
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", marginBottom: 10 }}>
                        EĞİTMENLER ({instrCount})
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {dept.DepartmentInstructor?.map(({ Instructor: inst }) => (
                          <div
                            key={inst.id}
                            style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "8px 12px", borderRadius: "var(--r-md)",
                              background: "color-mix(in srgb,var(--line) 25%,var(--panel))",
                              border: "1px solid var(--line)",
                            }}
                          >
                            <Avatar name={inst.name} size={30} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{displayName(inst)}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>{inst.email}</div>
                            </div>
                            {inst.id === dept.headInstructorId && (
                              <span style={{
                                display: "flex", alignItems: "center", gap: 4,
                                fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                                padding: "2px 8px", borderRadius: "var(--r-full)",
                                background: "color-mix(in srgb,var(--accent) 10%,var(--panel))",
                                color: "var(--accent)", border: "1px solid color-mix(in srgb,var(--accent) 25%,var(--line))",
                              }}>
                                <Icon name="crown" size={9} /> BAŞ EĞİTMEN
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </>
  );
}
