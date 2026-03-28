"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  label: string;
  href: string;
  /** Emoji string or a React SVG element */
  icon?: string | ReactNode;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

export function PanelShell({
  roleLabel,
  userName,
  userSub,
  navSections,
  children,
}: {
  roleLabel: string;
  userName: string;
  userSub?: string;
  navSections: NavSection[];
  children: ReactNode;
}) {
  const pathname = usePathname();

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      style={{
        display: "grid",
        gap: 20,
        gridTemplateColumns: "1fr",
        alignItems: "start",
      }}
      className="panel-shell-grid"
    >
      <style>{`
        @media (min-width: 1024px) {
          .panel-shell-grid { grid-template-columns: 240px 1fr !important; }
        }
      `}</style>

      {/* ── Sidebar ── */}
      <aside
        style={{
          position: "sticky",
          top: 24,
          borderRadius: "var(--r-xl)",
          background: "var(--panel)",
          border: "1.5px solid var(--line)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* User card */}
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "var(--r-lg)",
            background: "linear-gradient(135deg,color-mix(in srgb,var(--accent-2) 10%,var(--panel)),color-mix(in srgb,var(--accent) 7%,var(--panel)))",
            border: "1.5px solid color-mix(in srgb,var(--accent) 20%,var(--line))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 800,
                color: "#fff",
                flexShrink: 0,
                boxShadow: "var(--glow-blue)",
              }}
            >
              {initials || "?"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--accent)",
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                {roleLabel}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {userName}
              </div>
              {userSub && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {userSub}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {navSections.map((section) => (
            <div key={section.title}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  paddingLeft: 4,
                  marginBottom: 6,
                }}
              >
                {section.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 12px",
                        borderRadius: "var(--r-md)",
                        fontSize: 13,
                        fontWeight: active ? 700 : 500,
                        color: active ? "var(--accent)" : "var(--ink-2)",
                        background: active
                          ? "color-mix(in srgb,var(--accent) 10%,var(--panel))"
                          : "transparent",
                        border: active
                          ? "1px solid color-mix(in srgb,var(--accent) 25%,var(--line))"
                          : "1px solid transparent",
                        textDecoration: "none",
                        transition: "all var(--t-fast)",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: 14,
                          color: active ? "var(--accent)" : "var(--muted)",
                        }}
                      >
                        {item.icon ?? (
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "currentColor",
                              display: "block",
                            }}
                          />
                        )}
                      </span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.label}
                      </span>
                      {active && (
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "var(--accent)",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Content ── */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        {children}
      </div>
    </div>
  );
}
