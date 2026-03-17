#!/usr/bin/env node
import fetch from 'node-fetch';

const base = process.env.HEALTH_URL || 'http://localhost:5000/api/health';
async function main() {
  try {
    const res = await fetch(base, { timeout: 4000 });
    let json = {};
    try {
      json = await res.json();
    } catch (_) {
      // non-json response
    }
    const ok = res.ok && json.status === 'success';
    console.log(
      `[health] ${ok ? 'OK' : 'FAIL'} status=${json.status ?? res.status} db_ok=${json.db_ok ?? 'n/a'} db_ms=${json.db_ms ?? 'n/a'}`
    );
    process.exit(ok ? 0 : 1);
  } catch (err) {
    console.error('[health] error', err.message);
    process.exit(1);
  }
}
main();
