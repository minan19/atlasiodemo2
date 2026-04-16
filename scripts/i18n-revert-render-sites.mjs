#!/usr/bin/env node
/**
 * Reverts {t.tr(x.label)} → {x.label} on TS2304 'Cannot find name t' lines.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const tscOut = execSync(
  `cd /Users/mustafainan/Desktop/ATLASIO/apps/web && /Users/mustafainan/.nvm/versions/node/v24.13.0/bin/node node_modules/typescript/bin/tsc --noEmit --skipLibCheck 2>&1 || true`,
  { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
);

const errLines = tscOut.split("\n").filter(l => l.match(/error TS2304: Cannot find name 't'/));
console.log(`Found ${errLines.length} TS2304 errors`);

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
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");

  for (const ln of lineSet) {
    const idx = ln - 1;
    if (idx >= lines.length) continue;
    const before = lines[idx];
    let after = before;
    // Pattern A: {t.tr(expr)} → {expr}
    after = after.replace(/\{t\.tr\(([^()]+)\)\}/g, (_, expr) => {
      totalReverts++;
      return `{${expr}}`;
    });
    // Pattern B (call inside larger expr): t.tr(expr) → expr (for cases where regex above missed)
    after = after.replace(/\bt\.tr\(((?:[^()]|\([^()]*\))*)\)/g, (_, expr) => {
      totalReverts++;
      return expr;
    });
    if (after !== before) lines[idx] = after;
  }

  writeFileSync(file, lines.join("\n"));
}

console.log(`Total reverts: ${totalReverts}`);
