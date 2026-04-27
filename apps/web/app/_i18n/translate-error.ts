/**
 * Map raw fetch / backend error strings to a translatable Turkish key.
 *
 * Without this mapping the UI surfaces browser-native messages like:
 *   - Safari   → "Load failed"
 *   - Chrome   → "Failed to fetch"
 *   - Firefox  → "NetworkError when attempting to fetch resource."
 *
 * None of these are in `flat-translations.ts`, so users on DE/AR/RU/KK still
 * saw English. This helper canonicalises the network case to a single TR key
 * that already has native translations across all 6 languages.
 *
 * Usage:
 *   const t = useI18n();
 *   const friendly = translateError(errMessage, t.tr);
 */
export type TrFn = <T extends string | null | undefined>(text: T) => T extends string ? string : T;

export function translateError(raw: unknown, tr: TrFn): string {
  const msg =
    raw instanceof Error
      ? raw.message
      : typeof raw === "string"
        ? raw
        : "";
  const r = msg.toLowerCase();

  if (
    r.includes("load failed") ||
    r.includes("failed to fetch") ||
    r.includes("networkerror") ||
    r.includes("network request failed") ||
    r.includes("fetch failed") ||
    r === "typeerror"
  ) {
    return tr("Sunucuya ulaşılamadı. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.");
  }

  if (!msg) return tr("Bir hata oluştu. Lütfen tekrar deneyin.");

  // Otherwise let `tr()` look the message up. Backend EN error strings like
  // "Invalid credentials" / "Unauthorized" are already mapped in the TR block
  // (reverse-lookup) so they translate to user-facing TR/DE/AR/RU/KK.
  return tr(msg);
}
