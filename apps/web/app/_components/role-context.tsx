"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type UserRole = "admin" | "head-instructor" | "instructor" | "student" | "guardian";

type RoleContextValue = {
  role: UserRole;
  setRole: (r: UserRole) => void;
  language: string;
  setLanguage: (lang: string) => void;
};

const STORAGE_KEY = "atlasio.role";
const LANG_KEY = "atlasio.lang";
const TOKEN_KEY = "accessToken";

const ROLE_CONTEXT = createContext<RoleContextValue | undefined>(undefined);

/**
 * JWT payload'unu base64 decode ile okur (imza doğrulaması olmadan — sadece UI için).
 * Gerçek yetkilendirme API tarafında yapılır.
 */
function decodeJwtRole(token: string): UserRole | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // base64url → base64 dönüşümü
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
    const json = JSON.parse(atob(padded));
    // API'nin role alanı: "ADMIN" | "INSTRUCTOR" | "STUDENT" | "GUARDIAN" vs.
    const raw: string | undefined = json?.role ?? json?.roles?.[0];
    if (!raw) return null;
    const normalized = raw.toLowerCase().replace("_", "-") as UserRole;
    const valid: UserRole[] = ["admin", "head-instructor", "instructor", "student", "guardian"];
    return valid.includes(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("student");
  const [language, setLanguageState] = useState<string>("tr");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Önce JWT token'dan rol oku (daha güvenilir)
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const jwtRole = decodeJwtRole(token);
      if (jwtRole) {
        setRoleState(jwtRole);
        // localStorage ile senkronize et
        try { localStorage.setItem(STORAGE_KEY, jwtRole); } catch { /* ignore */ }
        // Dil ayarı
        const savedLang = localStorage.getItem(LANG_KEY);
        if (savedLang) setLanguageState(savedLang);
        return;
      }
    }

    // 2. JWT yoksa veya decode başarısızsa localStorage fallback
    const saved = localStorage.getItem(STORAGE_KEY) as UserRole | null;
    if (saved) setRoleState(saved);
    const savedLang = localStorage.getItem(LANG_KEY);
    if (savedLang) setLanguageState(savedLang);
  }, []);

  const setRole = (r: UserRole) => {
    setRoleState(r);
    try {
      localStorage.setItem(STORAGE_KEY, r);
    } catch {
      /* ignore */
    }
  };

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  };

  const value = useMemo(() => ({ role, setRole, language, setLanguage }), [role, language]);

  return <ROLE_CONTEXT.Provider value={value}>{children}</ROLE_CONTEXT.Provider>;
}

export function useRole() {
  const ctx = useContext(ROLE_CONTEXT);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
