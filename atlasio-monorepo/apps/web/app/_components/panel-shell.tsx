"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon?: string;
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
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="glass rounded-2xl border border-slate-200 p-4 shadow-sm h-fit sticky top-6 space-y-5">
        {/* User card */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{roleLabel}</div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100">{userName}</div>
          {userSub ? <div className="text-xs text-slate-500 dark:text-slate-400">{userSub}</div> : null}
          <div className="mt-2 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
            <div className="h-full w-2/3 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full" />
          </div>
        </div>

        {/* Nav sections */}
        <div className="space-y-4">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                        active
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 shadow-sm border border-emerald-200 dark:border-emerald-800"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
                      }`}
                    >
                      <span className="text-base w-5 text-center flex-shrink-0">{item.icon ?? "•"}</span>
                      <span className="truncate">{item.label}</span>
                      {active && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="space-y-6 min-w-0">{children}</div>
    </div>
  );
}
