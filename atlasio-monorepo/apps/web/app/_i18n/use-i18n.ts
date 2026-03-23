import { useMemo } from "react";
import { useRole } from "../_components/role-context";
import { strings, type I18nStrings } from "./strings";

export function useI18n(): I18nStrings {
  const { language } = useRole();
  return useMemo(() => strings[language as keyof typeof strings] ?? strings.tr, [language]);
}
