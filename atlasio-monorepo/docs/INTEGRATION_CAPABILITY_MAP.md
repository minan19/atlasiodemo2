# Atlasio Integration Capability Map

Bu dosya Atlasio’nun hem kendi LMS modülü hem de dış sistemlerle (üniversiteler, akademik paydaşlar, harici LMS’ler) entegre çalışabilmesi için gereken tüm bağlantı noktalarını, veri akışlarını ve operasyon kurallarını bir arada sunar. Amaç: **LTI 1.3 Advantage + OneRoster + QTI + xAPI/cmi5 + Caliper + Open Badges** gibi uluslararası standartları merkezi şekilde yönetebilecek bir “integration hub” tasarlamak.

## 1. Integrasyon Katmanları & Kapasite Haritası
| Katman | Open Standard | Amaç | Ana Data/Endpoints | Kurumsal Gereklilikler |
| --- | --- | --- | --- | --- |
| **Tool Orchestration** | LTI 1.3 (Advantage) + NRPS + Deep Linking + AGS | Harici araçları (Canvas App Center, M365) jed-tek tıklamayla embed et | `GET /lti/tools`, `POST /lti/deployments`, `POST /lti/launch`, AGS grade/note callbacks | Tenant metadata (issuer/clientId), key rotation (RFC7515), deployment domain allowlist, audit logging (traceId) |
| **Roster Sync** | OneRoster CSV & REST | Öğrenci/kurs/rol/kayıtları periyodik çek | `POST /integrations/oneroaster/push`, `GET /integrations/oneroaster/status` | Kaynak verinin tenantId, org hierarchy (university -> college -> department), change data capture (CDC) ile incremental sync |
| **Assessment Moving** | QTI / Common Cartridge bundle | Soru bankası ve test paketlerini mobile/remote taşı | `POST /assessments/import-qti`, `GET /assessments/export-common-cartridge` | Tag tabanlı madde analizi (LO, difficulty, discrimination), fallback (XML ↔ JSON) |
| **Learning Records** | xAPI / cmi5 + optional LRS | Tüm öğrenme olaylarını Captura | Event schema (actor, verb, object, result) + `POST /events/xapi`, `GET /events/exports` | Tenant isolation, optional LRS store; `actor.account.homePage` = tenant canonical |
| **Analytics Stream** | Caliper Analytics | Belirgin event mapping (nav, content, assessment) | `POST /events/caliper`, BI exports (Parquet/S3) | Actor/action/object triad, shipping to IT’s analytics lake (Snowflake, Databricks) |
| **Credential Delivery** | Open Badges + Verifiable Credentials | Sertifika/rozet doğrulanabilir link | `POST /credentials/open-badge`, `GET /credentials/verify/{code}` | Signed tag, public revocation list, TTL (ex: 3 yıl), metadata (badgeClass)

Her katman `IntegrationConnector` olarak modellendi; bu dokümanda her connector için
- Varsayılan `scheduler` (cron) frekansları, idempotent job kaydı
- Failure playbook (alert + retry) ve audit log (kimin neyi tetiklediği) yer almalı
- Provizyon (sertifika, key rotation) `AutomationModule` içinde `Cron` job olarak tanımlanmalı.

## 2. Event Şemaları (xAPI + Caliper) [Örnek JSON]
### xAPI `ContentViewed`
```json
{
  "actor": {"objectType": "Agent", "account": {"name": "u_123", "homePage": "https://atlasio.com/tenants/demo"}},
  "verb": {"id": "http://adlnet.gov/expapi/verbs/experienced", "display": {"en-US": "experienced"}},
  "object": {"id": "https://atlasio.com/courses/c_100/lessons/l_10", "definition": {"name": {"en-US": "Lesson: Intro"}, "type": "http://adlnet.gov/expapi/activities/lesson"}},
  "result": {"duration": "PT5M", "extensions": {"atlasio:progress": 1.0}},
  "timestamp": "2026-02-15T08:23:35Z"
}
```
### Caliper `Event`
```json
{
  "@context": ["http://purl.imsglobal.org/ctx/caliper/v1p2"],
  "id": "urn:uuid:xxxx",
  "type": "http://purl.imsglobal.org/caliper/v1/SessionEvent",
  "actor": {"id": "https://atlasio.com/users/u_123", "type": "Person"},
  "action": "http://purl.imsglobal.org/caliper/v1/action/viewed",
  "object": {"id": "https://atlasio.com/courses/c_100", "type": "http://purl.imsglobal.org/caliper/v1/Resource"},
  "eventTime": "2026-02-15T08:23:35Z"
}
```
Bu event’ler hem `learningRecord` tablosuna hem de optional `external LRS` (Moodle/SaaS) kaynağına gönderilir. `IntegrationService` yeni `emitEvent` method’u ile Caliper/xAPI formatını unify edip `EventHub`/Redis Streams + Postgres kopyasına yazar.

## 3. SSO + IdP Yönetişimi (Kısa Hatırlatma)
- Tenant bazlı metadata (SAML EntityID, ACS URL, certificate) `integrationConnector` config içinde tutulur.
- `SSOAuthGuard` (Nest middleware) `saml2-js` veya `openid-client` ile handshake. Metadata otomatik `cron` job ile (SAML metadata url) refresh edilir.
- Event `AuthEvent` log record: `tenantId`, `userId`, `provider`, `result`, `ip`, `device`. Bu data `AuditService` + `KPI snapshots` ile `PerformanceSnapshot` tablosuna eklenecek.

## 4. Connector Lifecycle & Runbook
1. Connector tanımlanır (`POST /integrations/connector`) + credential (client secret) secure vault’a (HashiCorp) kaydedilir.
2. Deployment (LTI) vs Roster (OneRoster) vs Assessment (QTI) job’ları `AutomationModule` cron’uyla çalışır.
3. Hata: `IntegrationAudit` event log (status/retry/exceptions) + `NotificationModule` (Ops Slack). Rota: 0-10-60 dk (exponential) + manual override.

## 5. Referanslar
- IMS Global LTI 1.3 Advantage: https://www.imsglobal.org/lti-advantage-overview
- OneRoster v1.2: https://www.1edtech.org/standards/oneroster
- ADL SCORM/xAPI: https://adlnet.gov
- IMS Caliper: https://www.imsglobal.org/standards/caliper
- IMS Open Badges: https://www.imsglobal.org/spec/ob/v3p0

Bu belge, dev ekibin hem kod modülleri hem de dokümantasyon + runbook bileşenleri için referans olmalıdır.
