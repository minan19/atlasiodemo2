# Atlasio – Akademik Closed-Loop AI Learning Sistemi

Bu belge, “üniversite/akademik ekosistemle entegre olabilen kurumsal uzaktan eğitim modülü” için gerekli olan AI destekli kapalı döngü sistemin mimari ve operasyon detaylarını kapatır. Tamamlayıcı işlevler hem Atlasio ürününün hem de önerilen ek modüllerin gelişimiyle hemen uygulanabilir.

## 1. Sistem Hedefi
Hem varsayılan Atlasio LMS modülüne hem de harici LMS (Canvas, Moodle, Blackboard vb.) ile LTI tabanlı tool olarak çalışabilecek bir **öneri + performans değerlendirme katmanı** sunmak.
Kurumsal gereklilikler:
- Tek tenant izolasyonu (üniversite > fakülte > bölüm)
- SSO (SAML2/OpenID Connect)
- Audit + explainability + KVKK uyumu
- Standart entegrasyonlar: LTI 1.3 (Advantage), OneRoster, QTI/Common Cartridge, xAPI/cmi5 + LRS, Caliper, Open Badges

## 2. Kapalı Döngü MLOps Akışı
1. **Event stream**: tüm öğrenme olayları (`ContentViewed`, `QuizAnswered`, `LiveJoin`, `AssignmentSubmitted`, `GradePosted`, `VideoDropoff`, `CaliperEvent` vb.) Kafka/Redis Streams / EventHub üzerinden toplanır.
2. **Feature store + metrics**: Content mastery, quiz accuracy, attendance ratio, engagement dwell time. KPI’lar: mastery %, pass rate, recommendation conversion.
3. **Model + rule pipeline**: Knowledge Graph + BKT/IRT skorları + behavior sinyalleri ile hybrid recommendation (kurallar + ML).
4. **Deployment**: Model registry, versioned API (recommendation service), drift monitoring, A/B test env.
5. **Explainability + governance**: Öneri her çıktıda `why` alanı, prompt injection filtresi, tenant-level masking, audit trail (traceId).
6. **Evaluation**: öneri + risk etkileri, early-warning scoreboard, A/B/online experiment results.

## 3. Öneri Motoru Modülleri
- **Student Recommendation Service**: `GET /ai/recommendations/student/:id` → `next-step`, `micro-content`, `schedule slot`, `adaptive difficulty`.
- **Instructor Recommendation Service**: `GET /ai/recommendations/instructor/:courseId` → `content drop-off analysis`, `early warning students`, `question quality alerts`, `rubric suggestions`.
- **Admin Insights Service**: `GET /ai/reports/unit/:unitId` → `performance heatmap`, `content quality score`, `live session scale advice`.

Her servis event/dataset bazlı tetiklenir. Telifli LLM/Local inference (OpenAI + open-source) kullanılabilir; her istem `tenant_id` ile prefixlenir.

## 4. Entegrasyon Katmanı
1. **LTI 1.3 Tool** – Launch ve assignment + grade services, NRPS, deep linking.
2. **OneRoster Sync** – Weekly CSV + REST roster ingestion pipeline.
3. **QTI / Common Cartridge** – Soru bankası + assessment import/export.
4. **xAPI / cmi5 | LRS** – `LearningRecord` event’leri, stored in `learning_records` DB + optional LRS service.
5. **Caliper Analytics** – Event mapping (actor/action/object) + export to analytics platform (BI).
6. **Open Badges + Verifiable Credentials** – Certificate issued event publishes signed badge.

## 5. Veri Modeli Özetleri
- `learning_outcome`: id, code, description, course_id, version.
- `assessment_item`: question, difficulty, tags, mcq options, qti_xml.
- `attempt`: user_id, item_id, score, start_at, submitted_at, metadata.
- `recommendation`: tenant_id, user_id, type, payload, reason, score, created_at.
- `ai_metric`: name, tenant_id, resource_id, value, created_at (drift tracking).

## 6. Observability + Governance
- **Telemetry**: request_id, tenant_id, user_id, model_version, latency.
- **Explainability**: each recommendation includes `why` fields referencing features.
- **MLOps**: drift alerts when metric deviation > 3σ, versioned automation runs, canary release.
- **Security**: SSO enforcement, prompt injection guard (sanitize inputs), PII masking, data deletion hook.

## 7. Uygulama Planı
1. Basit LTI tool + OneRoster için `IntegrationModule`: connector servisi, webhook scheduler, config.
2. AI modülleri: telemetry collector, recommendation service, risk calcs, UI kart bileşenleri (instructor dashboard + admin analytics).
3. Tests: integration tests (simulated event stream), safety tests (drift guard), LTI / OneRoster contract tests.
4. Docs: ops runbook, release checklist, AI governance policy, multi-tenant security plan.

## 8. Event Schema + API Contract
1. **Recommendation API**
   * `GET /ai/recommendations/student/:userId?tenantId=` – Next-step list. Response includes `why` key referencing feature weights (mastery, drop-off, time-since-last).
   * `GET /ai/recommendations/instructor/:courseId` – early warning list, content revision suggestions.
   * `POST /ai/risk-scores` – Bulk evaluate (studentId -> riskScore). Uses BKT/IRT equations + micro-content interactions.
2. **Learning Events**
   * `POST /events/xapi` – Accepts xAPI JSON (actor, verb, object). `tenantId` required header. Stores to `LearningEvent` + optional LRS insert.
   * `POST /events/caliper` – Accepts Caliper & fills `learningEvent` and `PerformanceSnapshot` for analytics.
3. **Drift + Explainability**
   * Each recommendation stores `modelVersion`, `featureSnapshot` and `decisionPath` (JSON) inside `Recommendation.context`.
   * Drift job: hourly automation compares `ai_metric` (prediction_count, success_rate). If deviation > 3σ, sends Slack/Email via `NotificationsModule`.
4. **Governance Hooks**
   * All endpoints propagate `traceId` header.
   * Prompt injection guard: `sanitizePrompt(payload.prompt)` ensures banned tokens and tenant scope.
   * Data deletion API: `DELETE /tenants/:id/ai-data` removes `AiAgentLog` (soft) and `LearningEvent` (if retention window expired) with audit entry.

## 9. Referanslar
- UNESCO guidance on generative AI (https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research).
- NIST AI RMF (https://www.nist.gov/itl/ai-risk-management-framework).
- IMS Global standards (LTI, QTI, Caliper, Open Badges) for integration compliance.

Bu tasarımı doğrudan kodda uygulamak için sıradaki adım `IntegrationModule` ve `AI/Recommendation` servislerinin skeleton’larını yazmak. Devamında `apps/web` tarafına ilgili dashboard kartlarını ekleyip ops döküman güncelleyip automation cron’larını (drift/performance) tanımlayacağım. Top sende, bir sonraki hamleye devam ediyorum.
