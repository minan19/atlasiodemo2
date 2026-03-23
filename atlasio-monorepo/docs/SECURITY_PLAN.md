# Atlasio Security Plan (Pragmatik Cyber Resilience) – 2026-02-16

## İlkeler
- Zero Trust: İç trafik dahil her istek denetlenir; yetki + oran + anomali kontrolü.
- Performans önceliği: Kararlar Redis/cache tabanlı, düşük gecikme.
- PII/KVKK/GDPR: Ham medya/loglarda PII maskeleme; retention 30/90 gün.
- Savunma + Deception: Honeypot ile saldırganı işaretle; otomatik sıkı rate-limit.

## 1) Gözlemleme (SIEM-lite)
- Nginx + App log formatı tekil; requestId zorunlu.
- Redis sayaçları: RPS, 401/403 fırtınası, WS mesaj sayısı.
- Alarm eşikleri: 5dk’da 2000 403 veya 500 RPS artışı → alarm + deny sıkılaştırma.

## 2) Otomatik Yanıt (SOAR-lite)
- Denylist: Eşik aşımında IP 15 dk (config) kısıtlanır (Nginx limit_req + app kontrolü).
- WS rate-limit: mesaj başı boyut limiti + saniyede X mesaj.
- Health fallback: hizmet ayakta, agresif bloklama yerine degrade mod (limit düşürme).

## 3) Deception / Honeypot
- Sahte endpoint örn. `/internal/backup-status` sadece loglar; dokunan IP sıkı rate-limit’e alınır.
- PII içermez; sadece saldırgan davranışı ölçer.

## 4) Red Team / DAST
- CI: basit fuzzer + OWASP zap-lite; yüksek riskli bulgu → build fail değil, uyarı + ticket.
- Prod: düşük hacimli canary istekler (ör. beklenmeyen query param) anomali skoruna eklenir.

## 5) WebSocket Güvenliği
- Auth guard, origin kontrolü, payload size limiti, mesaj rate-limit.
- Live/Whiteboard/Proctor kanallarında flood → bağlantı kopar + IP kısa süreli kısıtlama.

## 6) Veri Güvenliği
- At-rest şifreleme (disk), in-transit TLS.
- Backup: günlük + snapshot; RPO/RTO belgeli. ("1 ms" yerine gerçekçi RPO/RTO hedefi.)
- Audit log bütünlüğü: hash zinciri (opsiyonel); requestId, actor, IP/UA maskeli.

## 7) Sertifika Güvenliği
- QR + hash varsayılan; SBT flag’li (default kapalı), PII zincire yazılmaz.
- verifyCode dolduruldu; verify endpoint hash kontrolü + Redis cache.

## 8) Retention ve Maskeleme
- Log/ai_logs: 30/90 gün; PII maskeleme (IP kısmi, user id gerekli ise hash’li). 
- Honeypot/attack log: PII yok.

## 9) Operasyon
- Alarm kanalı: Slack/email webhook.
- “Deny for 15m” aksiyonu otomatik; kalıcı ban manuel.
- Runbook’a denylist/rate-limit adımları eklendi (Nginx/app).

