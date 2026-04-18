"use client";

import { useState, useCallback } from "react";
import { useI18n } from "../_i18n/use-i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}

async function apiFetch<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API hatası: ${res.status}`);
  return res.json();
}

// ─── Demo fallback: safe eval for simple numeric expressions ──────────────────
function demoSolve(expr: string): string {
  try {
    const safe = expr
      .replace(/\^/g, "**")
      .replace(/√(\d+)/g, "Math.sqrt($1)")
      .replace(/sqrt\(([^)]+)\)/g, "Math.sqrt($1)")
      .replace(/sin\(([^)]+)\)/g, "Math.sin($1)")
      .replace(/cos\(([^)]+)\)/g, "Math.cos($1)")
      .replace(/tan\(([^)]+)\)/g, "Math.tan($1)")
      .replace(/log\(([^)]+)\)/g, "Math.log10($1)")
      .replace(/ln\(([^)]+)\)/g, "Math.log($1)")
      .replace(/π/g, "Math.PI")
      .replace(/pi/gi, "Math.PI");

    // Only allow safe characters
    if (/[a-zA-Z](?!ath\.|sqrt|sin|cos|tan|log|PI)/.test(safe.replace(/Math\.(sqrt|sin|cos|tan|log10?|PI)/g, ""))) {
      return "Demo modda bu ifade hesaplanamıyor";
    }
    // eslint-disable-next-line no-new-func
    const val = new Function("Math", `"use strict"; return (${safe})`)(Math);
    if (typeof val !== "number" || !isFinite(val)) return "Hesaplanamadı";
    return String(Math.round(val * 1e10) / 1e10);
  } catch {
    return "Demo modda bu ifade hesaplanamıyor";
  }
}

function demoMatrixAdd(a: number[][], b: number[][]): number[][] {
  return a.map((row, i) => row.map((val, j) => val + (b[i]?.[j] ?? 0)));
}

function demoMatrixMultiply(a: number[][], b: number[][]): number[][] {
  const n = a.length;
  const result: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        result[i][j] += (a[i][k] ?? 0) * (b[k]?.[j] ?? 0);
      }
    }
  }
  return result;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "equation" | "matrix";
type MatrixOp = "ADD" | "MULTIPLY";

const QUICK_EXAMPLES = [
  "x² + 2x + 1 = 0",
  "2x + 5 = 13",
  "x³ - 6x + 4",
  "sin(π/3)",
  "√144",
  "log(1000)",
];

const DEFAULT_MATRIX_A: number[][] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

const DEFAULT_MATRIX_B: number[][] = [
  [9, 8, 7],
  [6, 5, 4],
  [3, 2, 1],
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ dark = false }: { dark?: boolean }) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        border: `2.5px solid ${dark ? "var(--line)" : "rgba(255,255,255,0.25)"}`,
        borderTopColor: dark ? "var(--accent)" : "#fff",
        animation: "spin 0.7s linear infinite",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

function MatrixGrid({
  label,
  values,
  onChange,
}: {
  label: string;
  values: number[][];
  onChange: (r: number, c: number, v: number) => void;
}) {
  return (
    <div style={{ flex: 1 }}>
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 10,
        }}
      >
        {label}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 6,
          background: "var(--line-2)",
          borderRadius: "var(--r-md)",
          padding: 6,
          border: "1px solid var(--line)",
        }}
      >
        {values.map((row, r) =>
          row.map((cell, c) => (
            <input
              key={`${r}-${c}`}
              type="number"
              value={cell}
              onChange={(e) => onChange(r, c, parseFloat(e.target.value) || 0)}
              style={{
                textAlign: "center",
                padding: "8px 4px",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--line)",
                background: "var(--panel)",
                color: "var(--ink)",
                fontSize: 14,
                fontWeight: 600,
                width: "100%",
                minWidth: 0,
                fontFamily: "monospace",
                transition: "border-color var(--t-fast), box-shadow var(--t-fast)",
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MatrixDisplay({ data }: { data: number[][] }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        fontFamily: "monospace",
      }}
    >
      {/* Left bracket */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          fontSize: 28,
          lineHeight: 1,
          color: "rgba(255,255,255,0.6)",
          userSelect: "none",
          marginRight: 4,
        }}
      >
        ⎡<br />⎢<br />⎣
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${data[0]?.length ?? 3}, 1fr)`, gap: "6px 20px" }}>
        {data.map((row, r) =>
          row.map((v, c) => (
            <span
              key={`${r}-${c}`}
              style={{
                display: "block",
                textAlign: "right",
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                minWidth: 36,
                padding: "2px 0",
              }}
            >
              {Math.round(v * 1e6) / 1e6}
            </span>
          ))
        )}
      </div>

      {/* Right bracket */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          fontSize: 28,
          lineHeight: 1,
          color: "rgba(255,255,255,0.6)",
          userSelect: "none",
          marginLeft: 4,
        }}
      >
        ⎤<br />⎥<br />⎦
      </div>
    </div>
  );
}

// ─── Equation Solver Tab ──────────────────────────────────────────────────────

function EquationSolverTab() {
  const t = useI18n();
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solve = useCallback(async () => {
    if (!expression.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setIsDemo(false);

    try {
      const data = await apiFetch<{ result: string }>("/math-engine/solve", {
        expression: expression.trim(),
      });
      setResult(data.result);
      setIsDemo(false);
    } catch {
      const fallback = demoSolve(expression.trim());
      setResult(fallback);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [expression]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      solve();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Input area */}
      <div
        className="glass"
        style={{ padding: 20, borderRadius: "var(--r-lg)" }}
      >
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          İfade veya Denklem
        </label>
        <textarea
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="x^2 + 2x + 1 = 0  veya  integral(x^2, x)  veya  sin(π/3)"
          rows={3}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: "var(--r-md)",
            border: "1.5px solid var(--line)",
            background: "var(--panel)",
            color: "var(--ink)",
            fontSize: 16,
            fontFamily: "monospace",
            letterSpacing: "0.02em",
            resize: "none",
            lineHeight: 1.6,
          }}
        />
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
          Ctrl+Enter ile çözebilirsiniz
        </p>

        {/* Quick examples */}
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
            Hızlı örnekler:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {QUICK_EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setExpression(ex);
                  setResult(null);
                  setError(null);
                }}
                style={{
                  padding: "5px 14px",
                  borderRadius: "var(--r-full)",
                  border: "1px dashed color-mix(in srgb, var(--accent-2) 50%, var(--line))",
                  background: "var(--accent-2-soft)",
                  color: "var(--ink-2)",
                  fontSize: 12,
                  fontFamily: "monospace",
                  cursor: "pointer",
                  transition: "all var(--t-fast)",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "color-mix(in srgb, var(--accent-2) 20%, var(--panel))";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent-2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-2-soft)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "color-mix(in srgb, var(--accent-2) 50%, var(--line))";
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Solve button */}
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={solve}
            disabled={loading || !expression.trim()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 28px",
              borderRadius: "var(--r-md)",
              border: loading ? "1.5px solid var(--line)" : "none",
              background: loading
                ? "var(--panel)"
                : "linear-gradient(135deg, var(--accent-2), var(--accent))",
              color: loading ? "var(--ink-2)" : "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading || !expression.trim() ? "not-allowed" : "pointer",
              opacity: !expression.trim() ? 0.55 : 1,
              boxShadow: loading ? "none" : "var(--glow-blue)",
              transition: "all var(--t-mid)",
            }}
          >
            {loading ? (
              <>
                <Spinner dark />
                <span>{t.tr("Hesaplanıyor…")}</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: 18 }}>∑</span>
                <span>{t.tr("Çöz")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "var(--r-md)",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Result card */}
      {result !== null && (
        <div
          className="animate-scale-in"
          style={{
            padding: 28,
            borderRadius: "var(--r-lg)",
            background: "linear-gradient(135deg, #5b21b6, #2563eb)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 20px 60px rgba(91,33,182,0.35)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative glow */}
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "rgba(139,92,246,0.4)",
              filter: "blur(50px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>✓</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.7)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Sonuç
                </span>
              </div>
              {isDemo && (
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: "var(--r-full)",
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.8)",
                    fontWeight: 500,
                  }}
                >
                  Demo modu
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "#fff",
                fontFamily: "monospace",
                letterSpacing: "-0.01em",
                lineHeight: 1.3,
                wordBreak: "break-word",
              }}
            >
              {result}
            </div>

            <p
              style={{
                marginTop: 14,
                fontSize: 13,
                color: "rgba(255,255,255,0.55)",
                fontFamily: "monospace",
              }}
            >
              {"›"} {expression}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Matrix Operations Tab ────────────────────────────────────────────────────

function MatrixOperationsTab() {
  const t = useI18n();
  const [matrixA, setMatrixA] = useState<number[][]>(DEFAULT_MATRIX_A.map((r) => [...r]));
  const [matrixB, setMatrixB] = useState<number[][]>(DEFAULT_MATRIX_B.map((r) => [...r]));
  const [operation, setOperation] = useState<MatrixOp>("ADD");
  const [result, setResult] = useState<number[][] | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateA = (r: number, c: number, v: number) => {
    setMatrixA((prev) => prev.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? v : cell))));
    setResult(null);
  };
  const updateB = (r: number, c: number, v: number) => {
    setMatrixB((prev) => prev.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? v : cell))));
    setResult(null);
  };

  const calculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setIsDemo(false);

    try {
      const data = await apiFetch<{ matrix: string }>("/math-engine/matrix", {
        matrixA,
        matrixB,
        operation,
      });

      // Parse the returned matrix string — try JSON-like format first
      try {
        const parsed = JSON.parse(data.matrix);
        if (Array.isArray(parsed)) {
          setResult(parsed as number[][]);
          return;
        }
      } catch {
        // Fall through to show raw string as 1x1
        setResult([[0]]);
      }
    } catch {
      // Demo fallback
      const fallback =
        operation === "ADD" ? demoMatrixAdd(matrixA, matrixB) : demoMatrixMultiply(matrixA, matrixB);
      setResult(fallback);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [matrixA, matrixB, operation]);

  const opLabel = operation === "ADD" ? "Toplama (A + B)" : "Çarpma (A × B)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Matrix inputs */}
      <div
        className="glass"
        style={{ padding: 24, borderRadius: "var(--r-lg)" }}
      >
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <MatrixGrid label="Matris A" values={matrixA} onChange={updateA} />

          {/* Operation symbol */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
              color: "var(--accent-2)",
              minWidth: 32,
              alignSelf: "center",
              marginTop: 28,
            }}
          >
            {operation === "ADD" ? "+" : "×"}
          </div>

          <MatrixGrid label="Matris B" values={matrixB} onChange={updateB} />
        </div>

        {/* Operation toggle */}
        <div style={{ marginTop: 20 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 10,
            }}
          >
            İşlem Türü
          </p>
          <div
            style={{
              display: "inline-flex",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
          >
            {(["ADD", "MULTIPLY"] as MatrixOp[]).map((op) => (
              <button
                key={op}
                onClick={() => { setOperation(op); setResult(null); }}
                style={{
                  padding: "9px 22px",
                  border: "none",
                  background: operation === op
                    ? "linear-gradient(135deg, var(--accent-2), var(--accent))"
                    : "var(--panel)",
                  color: operation === op ? "#fff" : "var(--ink-2)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all var(--t-fast)",
                  borderRight: op === "ADD" ? "1px solid var(--line)" : "none",
                }}
              >
                {op === "ADD" ? "➕ Toplama" : "✖️ Çarpma"}
              </button>
            ))}
          </div>
        </div>

        {/* Calculate button */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={calculate}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 28px",
              borderRadius: "var(--r-md)",
              border: loading ? "1.5px solid var(--line)" : "none",
              background: loading
                ? "var(--panel)"
                : "linear-gradient(135deg, var(--accent), var(--accent-2))",
              color: loading ? "var(--ink-2)" : "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "var(--glow)",
              transition: "all var(--t-mid)",
            }}
          >
            {loading ? (
              <>
                <Spinner dark />
                <span>{t.tr("Hesaplanıyor…")}</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: 16 }}>⊞</span>
                <span>{t.tr("Hesapla")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "var(--r-md)",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Result */}
      {result !== null && (
        <div
          className="animate-scale-in"
          style={{
            padding: 28,
            borderRadius: "var(--r-lg)",
            background: "linear-gradient(135deg, #064e3b, #065f46)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 20px 60px rgba(6,78,59,0.4)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -30,
              left: -30,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "rgba(16,185,129,0.3)",
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>⊞</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.7)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Sonuç — {opLabel}
                </span>
              </div>
              {isDemo && (
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: "var(--r-full)",
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.8)",
                    fontWeight: 500,
                  }}
                >
                  Demo modu
                </span>
              )}
            </div>

            <MatrixDisplay data={result} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MathLabPage() {
  const t = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>("equation");

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scaleIn 200ms cubic-bezier(.2,.6,.3,1) both; }
      `}</style>

      {/* Animated background */}
      <div className="bg-canvas" />
      <div className="bg-grid" />

      <div className="page-shell" style={{ paddingBottom: 48 }}>
        {/* ── Hero ── */}
        <div
          className="glass hero"
          style={{
            borderRadius: "var(--r-xl)",
            padding: "36px 32px 28px",
            marginBottom: 24,
          }}
        >
          <div className="hero-content">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
              {/* Icon */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "var(--r-lg)",
                  background: "linear-gradient(135deg, #5b21b6, #2563eb)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                  flexShrink: 0,
                  boxShadow: "0 8px 24px rgba(91,33,182,0.4)",
                }}
              >
                ∑
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <h1
                    style={{
                      fontSize: "clamp(22px, 4vw, 32px)",
                      fontWeight: 800,
                      color: "var(--ink)",
                      margin: 0,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {t.mathLab.title}
                  </h1>
                  <span
                    className="pill pill-sm"
                    style={{
                      background: "linear-gradient(135deg, rgba(91,33,182,0.15), rgba(37,99,235,0.15))",
                      borderColor: "rgba(91,33,182,0.3)",
                      color: "#7c3aed",
                      fontWeight: 600,
                    }}
                  >
                    {t.tr("AI Çözücü")}
                  </span>
                </div>

                <p style={{ fontSize: 15, color: "var(--ink-2)", margin: 0, lineHeight: 1.6 }}>
                  {t.mathLab.subtitle}
                </p>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                  {["Denklem Çözücü", "Matris İşlemleri", "Trigonometri", "Logaritma", "Türev & İntegral"].map((tag) => (
                    <span key={tag} className="pill pill-xs pill-dark">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 20,
            background: "var(--panel)",
            borderRadius: "var(--r-lg)",
            border: "1px solid var(--line)",
            padding: 4,
            width: "fit-content",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {(
            [
              { key: "equation", label: t.mathLab.calculate, icon: "ƒ(x)" },
              { key: "matrix", label: t.mathLab.matrix, icon: "⊞" },
            ] as { key: Tab; label: string; icon: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
                borderRadius: "calc(var(--r-lg) - 4px)",
                border: "none",
                background:
                  activeTab === tab.key
                    ? "linear-gradient(135deg, #5b21b6, #2563eb)"
                    : "transparent",
                color: activeTab === tab.key ? "#fff" : "var(--ink-2)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all var(--t-mid)",
                boxShadow: activeTab === tab.key ? "0 4px 14px rgba(91,33,182,0.35)" : "none",
              }}
            >
              <span style={{ fontFamily: "monospace", fontSize: 15 }}>{tab.icon}</span>
              {t.tr(tab.label)}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div key={activeTab} className="animate-fade-slide-up">
          {activeTab === "equation" ? <EquationSolverTab /> : <MatrixOperationsTab />}
        </div>
      </div>
    </>
  );
}
