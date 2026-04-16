#!/usr/bin/env node
/**
 * i18n-wrap-render-sites.mjs — wrap JSX expressions that reference module-level
 * Turkish data fields. Pattern: {x.label} → {t.tr(x.label)}
 *
 * Targets common text-content property names. Safe because tr() is now
 * undefined/null/non-string passthrough.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const TEXT_PROPS = new Set([
  "label", "title", "subtitle", "text", "name", "description", "desc",
  "heading", "caption", "summary", "body", "content", "message",
  "placeholder", "tooltip", "hint", "note", "info", "tag", "category",
]);

const filesRaw = execSync(
  `find /Users/mustafainan/Desktop/ATLASIO/apps/web/app -name 'page.tsx'`,
  { encoding: "utf8" }
);
const files = filesRaw.trim().split("\n").filter(Boolean);

let totalWraps = 0;
let totalFiles = 0;

for (const file of files) {
  const content = readFileSync(file, "utf8");

  // Need useI18n hook variable
  const m = content.match(/const\s+(\w+)\s*=\s*useI18n\s*\(\s*\)/);
  if (!m) continue;
  const hookVar = m[1];
  const trCall = `${hookVar}.tr`;

  let modified = content;
  let fileWraps = 0;

  // Pattern: {ident.prop} or {ident.prop.prop2} where last segment is a text-prop
  // Avoid double-wrapping (already inside .tr())
  // Match: {  word.word(.word)*  }
  modified = modified.replace(
    /\{([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)+)\}/g,
    (match, expr) => {
      const parts = expr.split(".");
      const last = parts[parts.length - 1];
      if (!TEXT_PROPS.has(last)) return match;
      // Skip if already wrapped (preceding text contains .tr( before this { )
      // (regex matches inside replacement context — easier to check expr itself)
      if (expr.includes(".tr(")) return match;
      // Skip the hook itself: t.tr or t.role etc — properties of the hook var
      if (parts[0] === hookVar) return match;
      // Skip identifiers like 'document', 'window', 'console'
      if (["document", "window", "console", "process", "navigator"].includes(parts[0])) return match;
      fileWraps++;
      return `{${trCall}(${expr})}`;
    }
  );

  if (fileWraps > 0) {
    writeFileSync(file, modified);
    totalFiles++;
    totalWraps += fileWraps;
    console.log(`✓ ${file.replace("/Users/mustafainan/Desktop/ATLASIO/", "")} (+${fileWraps})`);
  }
}

console.log(`\n──────────────────────────────────────`);
console.log(`Files modified: ${totalFiles}`);
console.log(`Total wraps:    ${totalWraps}`);
