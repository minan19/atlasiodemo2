# Atlasio Enterprise Standards

Bu rehber, P0 seviyesinde kilitlediğimiz kurumsal kararları ve derin güvenlik/operasyon uygulamalarını tek metinde toplar. Atlasio’nun "kurumsal sistem" olarak ayakta kalması için aşağıdaki standartlara uyulmalıdır.

## 1. SSO, MFA ve Oturum Güvenliği
- **SSO hazır**: Her tenant, SAML 2.0 ya da OIDC sağlayıcısını (LDAP/AD entegrasyonu) tanımlayabilir. `apps/api/src/modules/auth` içindeki `AuthService`/`JwtStrategy` bu IdP’leri destekleyecek şekilde genişletilmeli.
- **MFA policy**: Policy Engine MFA ihtiyacını `obligations` alanında döner (Ör. `refund.approve` ya da `policy.publish` dizisi). MFA zorluğu, `tokens` ve `session` altındaki `deviceBinding` ile uyumlu şekilde zorunlu olmalı.
- **Session lifecycle**: Erişim token’ları kısa ömürlü (örn. 15 dk) olmalı; refresh token her rotate edildiğinde eski okey iptal edilmeli. Olay (anomalous login) izleme: IP/ASN değişimi, multiple devices, riskli role climb.
- **Logout / revoke**: Global logout kimlikte, `session` tablosu (future) ve `refresh` token store ile `force revoke` desteklenmeli.

## 2. KVKK / Veri Koruma
- **Hassas alanlar**: TCKN, IBAN, kart numarası gibi alanlar hem transit hem disk üzerinde şifrelenmelidir. Node tarafında `mask()` helper’ları UI’da `****` gösterirken loglamaz.
- **Masking & Arithmetic**: UI rolleri maskeler (örn. sadece `finance_manager` tam görür). Logging sadece `audit` bağlamında, `payload_json` maskeli.
- **Retention**:
  - Audit log: 10 yıl
  - Documents: belge türüne göre `document_types` üzerinden (örn. öğrenci belgesi 5 yıl, mezuniyet 10 yıl)
  - Financial ledger: mevzuat gereği 10 yıl
- **Export guard**: CSV/PDF export`lar `docs/Reports` alanında approver onayı ve `watermark`/`purpose` metadata’sı olmadan çalışmaz.
- **Veri taşıma**: Data export (ör. `student_report`) policy + approval complement; `role` haricindeki exposures pre-approved.

## 3. Finance Reconciliation & Refund State Machine
- **Ledger center**: Her charge/payment/refund/adjustment `ledger_entries` ile kaydedilir; silme yok, sadece yeni satır.
- **Reconciliation job**: Gün sonunda `payments` + provider settlement verileri karşılaştırılır, `difference` rapor edilir (alarm `outbox` event). Irregular pattern detection (e.g. payment success no ledger) sets alarm.
- **Refund state machine**:
  1. `requested` (student/higher action) → `approval` obligation
  2. `approved` → `sent_to_provider` (outbox event) with `idempotency_key`
  3. `processed`/`failed`
  4. `failed` → `retry/backoff` → `manual_review` (ApprovalRequest)
  5. `processed` → ledger credit (reversal) + allocation update
- **Manual overrides** require 2nd step (policy/approval) and audit reason; high amounts escalate to `dean/general-secretary`.

## 4. Delegasyon, Vekalet ve Onay Standartları
- **Delegasyon**: Appointment model in `approval_requests` maps delegations; `agent` assignment includes start/end.
- **Separation of duties**: e.g. refund requester ≠ approver, `finance_officer` vs `finance_manager`. Data model ensures (policy + `ApprovalStep`).
- **Audit & correlation**: Every approval writes `audit_logs` with `correlation_id`, `actor`, `target` and `policy_id`. Overriding decision requires `decision_reason`, `policy_override` flag.

## 5. DR / Observability / Backup
- **Backup policy**: DB with PITR (RPO ≤ 15 dk), object storage versioning + immutability, cross-region snapshot for DR. Weekly restore drills documented in `INFRA/README`.
- **Observability SLOs**: list endpoints: P95 list < 800 ms, P95 write < 1.5–2 s, error rate ≤ 0.5%. Monitor:
  - Outbox lag
  - Payment callback success rate
  - Notification failure spike
  - Authentication anomalies
  - Live session extensions
- **Alarms/notifications**: On outbox failure, reconciliation drift, auth anomaly, circuits break; send to Slack/email via Notification Layer (outbox event).
- **Disaster recovery**: Region failover plan with `drill-checklist.md` outlines failing-over API, worker queue, reconfiguring provider secrets.

Bu standartlar her sprintte gözden geçirilmeli ve yeni modüller eklenirken polici-based akış replicates edilmeli. Sonraki P1 adımlarında (transkript/mezz/etc.) bu rehber referans alınarak uyumluluk doğrulanacaktır.
