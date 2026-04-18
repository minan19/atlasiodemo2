#!/usr/bin/env node
/**
 * i18n-wrap-pass2.mjs — Multiline JSX text content sarma
 *
 * Pass 1 sadece tek satır JSX textlerini sardı (`>Türkçe<`).
 * Pass 2: Bir önceki satırı `>` ile biten ve sonraki satırı `<` veya `{` ile başlayan
 * "saf metin" satırlarını yakala — bunlar çok satırlı JSX text.
 *
 * Örnek:
 *   <p>
 *     Talebiniz Alındı!     ← BU SATIR
 *   </p>
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const TR = /[çğıöşüÇĞİÖŞÜ]/;

const filesRaw = execSync(
  `find /Users/mustafainan/Desktop/ATLASIO/apps/web/app -name 'page.tsx'`,
  { encoding: "utf8" }
);
const files = filesRaw.trim().split("\n").filter(Boolean);

let totalWraps = 0;
let totalFiles = 0;

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");

  // Detect hook variable
  const tEq = content.match(/const\s+(\w+)\s*=\s*useI18n\s*\(\s*\)/);
  if (!tEq) continue;
  const hookVar = tEq[1];
  const trCall = `${hookVar}.tr`;

  let modified = false;

  // Helper: previous non-empty line
  const prevNonEmpty = (i) => {
    for (let j = i - 1; j >= 0; j--) {
      if (lines[j].trim()) return lines[j].trim();
    }
    return "";
  };
  const nextNonEmpty = (i) => {
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim()) return lines[j].trim();
    }
    return "";
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!TR.test(trimmed)) continue;

    // Skip code lines: contain JSX brackets, JS operators, etc.
    if (trimmed.startsWith("//")) continue;
    if (trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
    if (trimmed.startsWith("import")) continue;
    if (/^[a-zA-Z_$][\w]*\s*[:=]/.test(trimmed)) continue; // key: value or var =
    if (trimmed.includes("//")) continue; // mid-line comment
    if (trimmed.includes("=>")) continue;
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) continue;
    if (trimmed.startsWith("<")) continue;
    if (trimmed.endsWith(",") || trimmed.endsWith(";")) continue;
    if (trimmed.includes("(") && !trimmed.includes(".tr(")) continue;
    if (trimmed.includes("=")) continue;

    // Pure text? Allow letters, spaces, basic punctuation, & escapes
    // Reject if too many code-like chars
    const codeLikeChars = /[<>{}\[\]\\=;()]/;
    if (codeLikeChars.test(trimmed)) continue;

    // Check context: previous line should end with > or be a text line itself
    const prev = prevNonEmpty(i);
    const next = nextNonEmpty(i);

    const prevIsJSXOpen = prev.endsWith(">") || prev.endsWith("}") || (TR.test(prev) && !codeLikeChars.test(prev));
    const nextIsJSXClose = next.startsWith("<") || next.startsWith("{");

    if (!prevIsJSXOpen) continue;
    if (!nextIsJSXClose && !TR.test(next)) continue;

    // Wrap the line
    const leading = line.match(/^\s*/)[0];
    const trailing = line.match(/\s*$/)[0];
    const text = trimmed;
    if (text.includes(`${trCall}(`)) continue;
    const safe = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    lines[i] = `${leading}{${trCall}("${safe}")}${trailing}`;
    totalWraps++;
    modified = true;
  }

  if (modified) {
    writeFileSync(file, lines.join("\n"));
    totalFiles++;
    console.log(`✓ ${file.replace("/Users/mustafainan/Desktop/ATLASIO/", "")}`);
  }
}

console.log(`\n──────────────────────────────────────`);
console.log(`Files modified: ${totalFiles}`);
console.log(`Total wraps:    ${totalWraps}`);
