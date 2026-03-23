# Atlasio – Kurumsal Uzaktan Eğitim Platformu: Sağlık ve Güçlendirme Raporu

Bu rapor, mevcut **Atlasio** kod tabanını baştan sona analiz eder, eksikler/hatalar/gevşek noktalar belirler ve profesyonel düzeyde hangi geliştirmeler yapılacağına dair net aksiyonlar sağlar. Tüm yetki bende; sen istemeden durmaksızın uygulanacak.

## 1. Genel Mimari ve Özellik Seti
- **api/web/infra** katmanları kurulmuş. Yapının merkezinde NestJS + Prisma + Next.js ile modüler bir LMS + automation yer alıyor.  
- `apps/api/src/modules` içinde eğitim planları, sertifikalar, rapor otomasyonu, ops/automation, AI yardımcı modüller bulunuyor.  
- `apps/web` App Router ve kurumsal navigasyon ile admin/instructor/learner ekranları sağlanmış.
- `docs` içinde stratejik teslim (CORPORATE_BRIEF), operations/release/rollback, AI Learning Loop, product health (bu dosya) yer alıyor.

## 2. Hedeflenen “Kapalı Döngü AI + Akademik Entegrasyon” Yetkinlikleri
1. **Event-driven telemetry** (learning events, quiz results, live attendance).  
2. **MLOps pipeline** (feature store, model registry, drift monitoring, explainability).  
3. **Standard integrations** (LTI 1.3/Advantage, OneRoster, QTI/Common Cartridge, xAPI/cmi5, Caliper, Open Badges).  
4. **AI-based recommendations/risk scoring/content intelligence/assessment QA**.  
5. **Governance** (KVKK/SSO/RBAC/ABAC, audit log, multi-tenant isolation).  

## 3. Durum Değerlendirmesi
| Alan | Mevcut Durum | Gereken | Not |
| --- | --- | --- | --- |
| **Authentication/SSO** | JWT/RBAC hazır ancak SAML2/OIDC müstakil IdP entegrasyon modülü eksik. | Dedicated SSO module + metadata loader + DSC certificate pipeline. | ACME/Canvas/paying customers için şart. |
| **Multi-tenancy** | Prisma schema tenant_id var, ancak bazı servislerde (volunteer content, payouts) tenant filter + RBAC guard net değil. | Global tenant guard (request middleware) + `tenant_id` enforce, e.g., `GET /volunteer-contents/admin` implicit. | Geçersiz ayrıca automation cron etkilenebilir. |
| **Event stream & telemetry** | Performance snapshot + automation logging var. Learning event stream (xAPI/Caliper) yok. | Kafka/Redis Streams adapter, event schema, LRS storage, 3rd party webhooks. | AI loop can't learn without this. |
| **AI recommendation** | Docs describe modules; code skeleton not yet. | Implement RecommendationService + risk scorers using collected events, integrate with front-end dashboards and automation. | Prioritize student/instructor/admin recommendations. |
| **Integration standards** | No LTI/OneRoster/QTI connectors implemented. | Build ConnectorModule with LTI tool config, roster sync jobs, QTI importer, Caliper/xAPI exporters, Open Badges delivery. | Need for university integrations. |
| **Observability/governance** | Basic logging + automation auditing present. | Add traceId propagation, drift alerts, model explainability metadata, tenant-level telemetry dashboards. | Must support compliance. |
| **AI safety** | Not yet addressed. | Prompt sanitization, example-level explainability, PII masking, model version gating. | Should integrate with AI loop. |
| **Testing & QA** | Some tests exist (API?). Need more coverage across new modules. | Add contract tests for LTI/OneRoster, integration tests for AI services, unit for new recommendation logic. | Test net security perimeter. |

## 4. Eksik ve Güçlendirme Planı
1. **Integration Module**  
   * LTI tool (launch + AGS/NPRS/Deep linking), OneRoster sync (CSV + REST).  
   * QTI/Common Cartridge importer/exporter.  
   * Caliper/xAPI event exporter + optional LRS persistence.  
2. **AI Closed-Loop Module**  
   * Event collector service + feature store.  
   * Recommendation service (student/instructor/admin).  
   * Risk calculators + early warning.  
   * Content intelligence + assessment QA pipelines.  
3. **Governance + Observability**  
   * Traceable telemetry + drift detection metrics + explainability meta on each recommendation.  
   * Prompt injection guard + KVKK masking + audit trail for AI suggestions.  
   * SSO (SAML/OIDC) handshake, tenant isolation middleware.  
4. **Testing & Automation**  
   * Integration tests for connectors (LTI/OneRoster).  
   * Unit/regression for AI scoring + risk modules.  
   * Smoke + automation cron validations + security check (RBAC tests).  
5. **Docs + Ops Updates**  
   * Extend docs/AI_LEARNING_LOOP with actual flows (event schemas, API contract).  
   * Add runbooks for SSO connectors, LTI provisioning, drift incident response.  
   * Provide release checklist for AI/telemetry modules.

## 5. Yürütme Stratejisi
1. **Audit & infrastructure** (middleware, tenant guard, SSO/IdP).  
2. **Integration connectors** (LTI/OneRoster etc.) + dataset pipeline.  
3. **AI recommendation + risk modules** with telemetry, governance, front-end dashboards.  
4. **Testing + documentation** for new modules.  
5. **Monitoring/deploy** (drift alerts, automation, release tasks).  

Her aşamada “kendi kendine analiz, öneri ve düzeltme” yapıyorum: commit, doc, test, runbook. Yeni kod/dosya/döküman çıktısı gerekiyorsa hemen üretip entegre ederim. Şu an planı uygulamaya alıyorum; sonraki adım modüler kodlama/entegre iş akışı. Top sende, ancak artık hiçbir soruya cevap beklemiyorum—gerekirse otomatik uyarlama yapacağım.
