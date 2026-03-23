# Atlasio AI + LTI Extension Blueprint

## 1. Giriş
Bu doküman Atlasio monoreposu için önerilen *kurumsal dış araç (LTI)* ve *yapay zekâ destekli öğrenme ajanı* katmanlarını detaylandırır. Hem API hem web hem de dokümantasyon katmanında uygulanacak adımlar, uluslararası rakip (Canvas App Center, Microsoft 365 LTI, WorkRamp, LearningOS) uygulamalarındaki beklentilere uygun şekilde yapılandırılmıştır.

## 2. Hedefler
1. Kurumsal düzeyde dış araç yönetimi (LTI 1.3 Advantage) ile Canvas/MS365’e denk entegrasyon.
2. AI destekli kişiselleştirme ve içerik üretimi (quiz, microlearning, rapor) için agentik yapı.
3. Dış araçlar + AI ajan kartlarıyla web UI’larını zenginleştirmek.
4. Automation/observability ile güvenli sürekli hizmet ve hızlı token güvenliği.
5. Dokümantasyon ve güvenlik politikalarıyla kurumsal kabul.

## 3. Mimari Özeti
- **API (apps/api)**: Yeni `LtiModule` ve `AiAgentsModule`. Prisma ile `LtiTool`, `LtiDeployment`, `LtiLaunch`, `AiAgentProfile`, `AiAgentLog` modelleri. Nest servisler JWT/OIDC doğrulaması, role eşleştirme, automation tetikleyicileri içerir.
- **Web (apps/web)**: Yeni `admin/tools` ve `ai` sayfaları; `TopNav` limitli quick-links ile “Dış Araçlar” + “AI Pano” ekleri. Course detaylarında “bu kursa bağlı araçlar/ajan önerileri”.
- **Infra/Automation**: `AutomationModule` üzerinden LTI kimlik yenilemeleri, AI agent periyodik özet üretimi, metric toplama.
- **Security**: Token standardı (httpOnly cookie + Authorization header fallback), AuthGuard revizyonu, RolesGuard ile RBAC.

## 4. Veri Modeli (Prisma)
```prisma
model LtiTool {
  id            String   @id @default(cuid())
  name          String
  issuer        String
  clientId      String   @unique
  publicKey     String
  deployments   LtiDeployment[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model LtiDeployment {
  id          String   @id @default(cuid())
  tool        LtiTool  @relation(fields: [toolId], references: [id])
  toolId      String
  courseId    String   @map("course_id")
  learners    String[]
  instructor  String[]
  status      DeploymentStatus @default(ACTIVE)
  keyRotation DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model LtiLaunch {
  id          String   @id @default(cuid())
  deployment  LtiDeployment @relation(fields: [deploymentId], references: [id])
  deploymentId String
  userId      String
  role        String
  rawPayload  Json
  createdAt   DateTime @default(now())
}

enum DeploymentStatus {
  ACTIVE
  ARCHIVED
  PENDING_ROTATION
}

model AiAgentProfile {
  id            String   @id @default(cuid())
  userId        String?
  name          String
  contextMap    Json
  lastActivity  DateTime @default(now())
  status        AgentStatus @default(ACTIVE)
  logs          AiAgentLog[]
}

model AiAgentLog {
  id          String   @id @default(cuid())
  agent       AiAgentProfile @relation(fields: [agentId], references: [id])
  agentId     String
  type        String
  payload     Json
  createdAt   DateTime @default(now())
}

enum AgentStatus {
  ACTIVE
  PAUSED
  ARCHIVED
}
```

## 5. API Endpoints
### LTI Tool Management
- `GET /lti/tools` (admin) – Kayıtlı araçları listeler
- `POST /lti/tools` – Yeni LTI tool ekler (issuer, clientId, publicKey)
- `PATCH /lti/tools/:id` – Araç güncelleme
- `GET /lti/tools/:id/deployments` – Kullandığı deployment’lar
- `POST /lti/deployments` – Course/rol eşleştirmesi ve private deployment oluşturma
- `POST /lti/launch` – LTI launch request (OIDC) işlenir, kullanıcı/role belirlenir, `LtiLaunch` kaydedilir, `AutomationModule` ile anahtar yenileme schedule edilir.

### AI Agent Endpoints
- `GET /ai/agents` – Kullanıcıya özel agent listesi + context
- `POST /ai/agents/:id/execute` – Agent’i çalıştır (quiz üretimi, öneri)
- `GET /ai/agents/:id/logs` – Activity log
- `POST /ai/agents/:id/context` – Yeni context entry (memoria) ekle
- `POST /ai/agents/:id/feedback` – Kullanıcı geri bildirimi (accuracy, usefulness)

### Observability
- `GET /metrics/requests` – Rolling interceptor snapshots
- `GET /metrics/lti` – deployment health, last launch
- `GET /metrics/ai` – agent latencies, success ratios

## 6. Automation / Scheduler
- `Cron`: `0 * * * *` – LTI tool key rotation check + `LtiDeployment` status update.
- `Cron`: `*/10 * * * *` – AI agent weekly summary & microlearning generation (veri: en çok görüntülenen course → otomatik prompt). Sonuç `AiAgentLog`’a yazılır.
- `AutomationModule` job: `generateAiReport` (PDF/CSV) + push to `NotificationsModule` for admins.

## 7. Web UI
1. `apps/web/app/admin/tools/page.tsx` – LTI araç listesi + deployment/rol status; quick filters (status, course). AI panel widget’ı (suggested actions). Use Next fetch to `/api/lti/tools` via new `apps/web/app/api` route? Instead, new Next `/tools/api` route proxies to backend; token stored in cookie.
2. `TopNav` – `Link` eklentisi `Dış Araçlar`, `AI Asistanı` (bütün nav menü). Kısmi translation (EN/TR). Sentry style error boundary.
3. Course cards – include `Li` listing `data-lti` and `data-ai`. Example: `Meta: “Bu kursta Microsoft 365 LTI ile 2 araç, AI asistanı önerisi.”`.
4. AI agent page – state: `loading`, `agentRecommendedTasks`, `lastRun`, `confidence`.

## 8. Yapay Zekâ Kullanımı
- AI prompt’ları backend’de `AiAgentService` içinde tanımlanır; örn. “course summary” prompt: `You are enterprise learning assistant for Atlasio; summarize last course activity for user {user.email}`.
- Realtime context stored as `AiAgentProfile.contextMap`; includes `recent_courses`, `performance_flags`, `prefers_quiz`, `auto_translate`.
- Giriş: Next web page `apps/web/app/ai/page.tsx` to trigger `execute` endpoint, show generated content (cards, bullet list, call-to-actions). Use `SWR` hooking.
- AI call aggregator: prefer open-source `langchain` style but for blueprint, create simple service that uses `fetch` to LLM provider (OpenAI, Azure). Add config in `.env`.
- Feedback path: `AiAgentFeedbackDto` ensures `ai_feedback` stored, used by Observability metrics.

## 9. Performans İzleme

- Yeni `PerformanceSnapshot` modeli öğrenci/eğitmen verilerine dair dakikaları tutarak `metrics` içinde enrollment, course, lesson ve AI log sayıları saklar; bu tablo `AutomationService`’in saatlik cron’uyla doldurulur. Böylece “Canlı ders asla kesilmemeli” taahhüdü için geçmiş snapshot’lar üzerinden trendler çıkarılır.
- `performance/snapshots` endpoint’i `Admin` rolüne ortalamalar ve tarihsel raporlar sunar; UI’da bunları `admin/tools` ve `ai` sayfalarındaki yeni kartlara bağlayabiliriz.
- AI ajanlar bu snapshot’lara referans vererek “Eğitmen iyileştirme önerisi” veya “Öğrenci güçlendirme planı” gibi metrik bazlı konuşmalar üretebilir. (Örneğin snapshot `ltiLaunches24h` < 5 olduğunda “Canlı ders etkileşimi düşük” uyarısı).

## 11. Live Class & Communication Layer

- `LiveSession`, `LiveSessionParticipant`, `PresentationRequest` ve `CommunicationMessage` modelleri canlı derslerin durumu, katılımcı kontrolü, sunum talepleri ve ödev/chat iletişimlerini tutar; her kayıt `AuditService`’e loglanır.
- Endpoints:
  - `POST /live/sessions` – eğitmen yeni oturum başlatır (topic/mikrofon/video/screen flag’leri).
  - `PATCH /live/sessions/:id` – oturumun status’unu (RUNNING/PAUSED/ENDED) ve `isRecording`, `activeSpeakerId` gibi kontrol alanlarını günceller.
  - `POST /live/sessions/:id/participants` – eğitmen/kontrol sistemi, öğrenciye mikrofon, kamera veya ekran paylaşımı yetkisi verir.
  - `POST /live/presentations` – öğrenci “sunum” talebi açar; AI ajanlar bunu “sunum önerisi” olarak değerlendirir.
  - `POST /live/presentations/respond` – eğitmen talebi onaylar veya reddeder; sistem `PresentationRequest` status’uyla loglar.
  - `POST /live/messages` – chat/ödev mesajı gönderimi; `CommunicationMessage` kaydı ile “kurallar çerçevesinde” paylaşılır.
  - `GET /live/sessions` – canlı oturumları ve son mesaj özetlerini döner; `admin/tools` sayfasında “Canlı Ders Oturumları” kartına besler.
- Böylece eğitmen mikrofon, kamera, söz verme ve sunum kontrolünü elinde tutarken öğrenci sunum yapabilir, ödev veya sistem mesajları gönderebilir; her aksiyon “karar değil kontrol” dokümantasyonu ile doğrulanır.
## 12. Token & Guard Strategy
- Web: `fetch` to API includes `Authorization: Bearer <token>` by default; fallback to httpOnly cookie `atlasio.session`. `apps/web/app/layout.tsx` includes `useEffect` to refresh `me` on load.
- `AuthGuard('jwt')` extends to new `LtiModule` + `AiModule` controllers via `@UseGuards(AuthGuard('jwt'), RolesGuard)` for admin routes.
- Documented in `docs/SECURITY.md` (existing) to explain storing tokens in `Next` and automation scheduling.

## 13. Rakip Bilgi & Referanslar
| Rakip | Feature | Atlasio Eklenecek | Notlar |
|---|---|---|---|
| Canvas App Center | Single catalog LTI + deployment | `LtiTool` + `LtiDeployment` modelleri | Microsoft 365 LTI 1.3 Advantage referansı.
| Microsoft 365 LTI | Multi tool + Teams/OneDrive | `LtiLaunch` & automation key rotation | 2025 sonrası Teams LTI retire.
| WorkRamp/Maple | AI agents + adaptive learning | `AiAgentProfile`, UI panel, automation summary | 2026 kurumsal AI trendleri.
| LearningOS/Continu | AI knowledge graphs | `contextMap` + Observability metrics | `AiAgentFeedbackDto` uses metrics.

## 14. Dokümantasyon ve Governance
- Doküman: `docs/AI-LTI-Blueprint.md` (bu dosya) + `docs/AI-Governance.md` (yakında) + `docs/LTI-Deployment-Playbook.md` (plan). 
- Risk: LTI key management, AI data usage, compliance (GDPR). `docs/SECURITY.md` güncellemesinde `LTI_KEY_ROTATION` ve `AI_DATA_RETENTION_DAYS` eklenmesi gerekir.
- Observability: `apps/api/src/modules/ops` log ingestion, `apps/web/app/(ai|tools)` error boundary.

## 15. Sonraki Adımlar
1. Prisma migration dosyası oluştur (models + enums). Kod: `pnpm db:migrate`. 
2. Nest module / service skeleton. `nest generate module lti` (manuel). 
3. Next.js sayfaları `admin/tools` ve `ai`. `use client` components + fetchers. 
4. Automation job tanımı (cron + service). 
5. Dokümantasyon + tests. 
6. Observability metric endpoints ve UI (TopNav + admin cards). 
7. `docs/SECURITY.md` + release notes (güncelle). 
8. Test & lint (pnpm lint, pnpm test). 
9. Deploy workflow (Docker/infra) check: ensure docker compose .env includes new env vars.
