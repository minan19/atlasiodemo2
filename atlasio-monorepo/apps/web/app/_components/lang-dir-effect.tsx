"use client";

import { useEffect } from "react";
import { useRole } from "./role-context";

export function LangDirEffect() {
  const { language } = useRole();
  useEffect(() => {
    const dir = language === "ar" ? "rtl" : "ltr";
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = dir;
      document.body.dir = dir;
      if (dir === "rtl") {
        document.documentElement.classList.add("rtl");
      } else {
        document.documentElement.classList.remove("rtl");
      }
    }
  }, [language]);
  return null;
}
