import { useCallback, useMemo } from "react";
import { useRole } from "../_components/role-context";
import { strings, type I18nStrings } from "./strings";
import { flat } from "./flat-translations";

export type UseI18nReturn = I18nStrings & {
  /** Translate any arbitrary Turkish string to the current language.
   *  Falls back to the original string if no translation is found.
   *  Safely passes through null/undefined/empty values. */
  tr: <T extends string | null | undefined>(text: T) => T extends string ? string : T;
};

export function useI18n(): UseI18nReturn {
  const { language } = useRole();
  const lang = (language as keyof typeof strings) in strings ? (language as keyof typeof strings) : "tr";

  const typed = useMemo(() => strings[lang] ?? strings.tr, [lang]);

  const tr = useCallback(
    (text: any): any => {
      if (text == null || text === "") return text;
      if (typeof text !== "string") return text;
      // Look up in target-language dict (TR block holds API error → TR mappings).
      const dict = flat[lang];
      const direct = dict?.[text];
      if (direct) return direct;
      if (lang === "tr") return text;
      // Fallback chain: target lang → EN → original Turkish
      if (lang !== "en") {
        const en = flat.en?.[text];
        if (en) return en;
      }
      return text;
    },
    [lang]
  );

  return useMemo(() => ({ ...typed, tr }), [typed, tr]);
}
