#!/usr/bin/env node
/**
 * i18n-revert-errors.mjs — TS hata satırlarındaki t.tr("...") çağrılarını
 * orijinal Türkçe string'e geri döndür (out-of-scope durumlar için).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const tscOut = execSync(
  `cd /Users/mustafainan/Desktop/ATLASIO/apps/web && /Users/mustafainan/.nvm/versions/node/v24.13.0/bin/node node_modules/typescript/bin/tsc --noEmit --skipLibCheck 2>&1 || true`,
  { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
);

const errLines = tscOut.split("\n").filter(l => l.match(/error TS2304: Cannot find name 't'/));
console.log(`Found ${errLines.length} TS2304 'Cannot find name t' errors`);

// Group by file → set of line numbers
const byFile = new Map();
for (const line of errLines) {
  const m = line.match(/^(.+?)\((\d+),(\d+)\)/);
  if (!m) continue;
  const [, file, ln] = m;
  const lineNum = parseInt(ln);
  if (!byFile.has(file)) byFile.set(file, new Set());
  byFile.get(file).add(lineNum);
}

let totalReverts = 0;
for (const [relFile, lineSet] of byFile) {
  const file = `/Users/mustafainan/Desktop/ATLASIO/apps/web/${relFile}`;
  let content = readFileSync(file, "utf8");
  const lines = content.split("\n");

  for (const ln of lineSet) {
    const idx = ln - 1;
    if (idx >= lines.length) continue;
    const before = lines[idx];
    // Replace t.tr("...") with the bare string
    // Two contexts:
    //   1. JSX text: {t.tr("X")}  → X
    //   2. JSX attr: ={t.tr("X")} → ="X"
    let after = before;
    // JSX attr case
    after = after.replace(/=\{t\.tr\("((?:[^"\\]|\\.)*)"\)\}/g, (_, s) => {
      totalReverts++;
      return `="${s}"`;
    });
    // JSX text case (with optional surrounding whitespace inside braces)
    after = after.replace(/\{t\.tr\("((?:[^"\\]|\\.)*)"\)\}/g, (_, s) => {
      totalReverts++;
      return s;
    });
    if (after !== before) {
      lines[idx] = after;
    }
  }

  writeFileSync(file, lines.join("\n"));
}

console.log(`Total reverts: ${totalReverts}`);
