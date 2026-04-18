#!/usr/bin/env node
/**
 * i18n-wrap.mjs — Otomatik Türkçe string sarma
 *
 * Her page.tsx dosyasında:
 *   - useI18n hook değişken adını bul (t, i18n, vb.)
 *   - JSX text içeriği ve attribute'larda Türkçe karakter içeren stringleri
 *     ${hookVar}.tr("...") veya tr("...") ile sar
 *   - Zaten sarılmış olanları (tr(, .tr() içinde olanları) atlа
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const TR = /[çğıöşüÇĞİÖŞÜ]/;
const STRICT_TR = /[çğıöşüÇĞİÖŞÜ]/; // require at least one Turkish char

// Get all page files
const filesRaw = execSync(
  `find /Users/mustafainan/Desktop/ATLASIO/apps/web/app -name 'page.tsx' -o -name 'not-found.tsx' -o -name 'pay.tsx' -o -name 'error.tsx'`,
  { encoding: "utf8" }
);
const files = filesRaw.trim().split("\n").filter(Boolean);

let totalWraps = 0;
let totalFiles = 0;

for (const file of files) {
  let content = readFileSync(file, "utf8");
  const original = content;

  // Detect hook variable
  let hookVar = null;
  let useDestructured = false;
  const tEq = content.match(/const\s+(\w+)\s*=\s*useI18n\s*\(\s*\)/);
  const destruct = content.match(/const\s*\{\s*([^}]*\btr\b[^}]*)\s*\}\s*=\s*useI18n\s*\(\s*\)/);
  if (destruct) {
    useDestructured = true;
  } else if (tEq) {
    hookVar = tEq[1];
  } else {
    // No useI18n usage — skip silently (server components, etc.)
    continue;
  }

  const trCall = useDestructured ? "tr" : `${hookVar}.tr`;

  // Process line by line to skip imports, comments, type definitions
  const lines = content.split("\n");
  let inBlockComment = false;
  let inJSX = false;
  // We can't truly track JSX state cheaply; instead skip lines that look like imports/types/comments
  // and apply replacements only to "code" lines.

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip block comments
    if (inBlockComment) {
      if (trimmed.includes("*/")) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) inBlockComment = true;
      continue;
    }
    // Skip line comments, imports, type-only lines
    if (trimmed.startsWith("//")) continue;
    if (trimmed.startsWith("import ") || trimmed.startsWith("import{")) continue;
    if (trimmed.startsWith("type ") || trimmed.startsWith("interface ")) continue;
    if (trimmed.startsWith("export type ") || trimmed.startsWith("export interface ")) continue;

    // Skip lines that are clearly JS object key-value with technical strings
    // (we handle these via regex below carefully)

    if (!STRICT_TR.test(line)) continue;

    let modified = line;

    // Pattern 1: JSX text content >Türkçe<
    // Match: >...turkish...< where contents have no {, }, <
    modified = modified.replace(
      />([^<>{}\n]*?[çğıöşüÇĞİÖŞÜ][^<>{}\n]*?)</g,
      (match, text) => {
        const stripped = text.trim();
        if (!stripped) return match;
        if (!STRICT_TR.test(stripped)) return match;
        // Skip if already wrapped or contains template
        if (stripped.includes("tr(")) return match;
        // Escape internal double quotes
        const safe = stripped.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        const leading = text.match(/^\s*/)[0];
        const trailing = text.match(/\s*$/)[0];
        totalWraps++;
        return `>${leading}{${trCall}("${safe}")}${trailing}<`;
      }
    );

    // Pattern 2: JSX attribute attr="Türkçe..."
    // Match attr="...turkish..." where the attribute name is identifier
    modified = modified.replace(
      /(\s)([a-zA-Z][a-zA-Z0-9-]*)="([^"\n]*?[çğıöşüÇĞİÖŞÜ][^"\n]*?)"/g,
      (match, ws, attr, val) => {
        // Skip non-text attributes (className, style, src, href, id, key, type, name, role)
        const skipAttrs = new Set([
          "className", "class", "style", "src", "href", "id", "key", "type",
          "name", "role", "rel", "target", "method", "action", "encType",
          "form", "list", "min", "max", "step", "pattern", "accept", "lang",
          "dir", "tabIndex", "data-testid", "data-id", "xmlns", "viewBox",
          "fill", "stroke", "d", "cx", "cy", "r", "x", "y", "width", "height",
          "transform", "points", "x1", "y1", "x2", "y2", "rx", "ry",
        ]);
        if (skipAttrs.has(attr)) return match;
        if (attr.startsWith("on")) return match;
        if (attr.startsWith("data-")) return match;
        if (attr.startsWith("aria-") && attr !== "aria-label") return match;
        // Skip if value looks like CSS, URL, or number
        if (val.startsWith("/") || val.startsWith("http")) return match;
        if (/^[\d.,\s%pxremvh]+$/.test(val)) return match;
        if (val.includes("var(--")) return match;
        const safe = val.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        totalWraps++;
        return `${ws}${attr}={${trCall}("${safe}")}`;
      }
    );

    lines[i] = modified;
  }

  content = lines.join("\n");

  if (content !== original) {
    writeFileSync(file, content);
    totalFiles++;
    console.log(`✓ ${file.replace("/Users/mustafainan/Desktop/ATLASIO/", "")}`);
  }
}

console.log(`\n──────────────────────────────────────`);
console.log(`Files modified: ${totalFiles}`);
console.log(`Total wraps:    ${totalWraps}`);
