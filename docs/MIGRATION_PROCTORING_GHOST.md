# Atlasio – Proctoring & Ghost-Mentor Migration Taslağı (Prisma odaklı)
Tarih: 2026-02-16

## 1) Postgres Şema Değişiklikleri (Prisma)
Eklenir:
```prisma
model ExamSession {
  id           String   @id @default(cuid())
  userId       String
  courseId     String
  startedAt    DateTime @default(now())
  endedAt      DateTime?
  deviceInfo   Json?
  trustScore   Float?   // final skor
  aiDecision   String?  // pass / flag / fail
  proctorNote  String?
  createdAt    DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  proctoringResults AiProctoringResult[]

  @@index([userId, courseId])
}

model AiProctoringResult {
  id               String   @id @default(cuid())
  sessionId        String
  eyeScore         Float?
  headScore        Float?
  audioScore       Float?
  tabSwitches      Int?     // count
  objectFlags      Int?     // phone/book vb.
  finalTrustScore  Float?
  aiRecommendation String?  // approve / manual_review / reject
  createdAt        DateTime @default(now())

  session ExamSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, createdAt])
}

model BiometricHash {
  id        String   @id @default(cuid())
  userId    String
  faceHash  String?
  voiceHash String?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model CognitiveLoad {
  id              String   @id @default(cuid())
  userId          String
  lessonId        String
  attentionScore  Float?   // 0-1
  confusionIndex  Float?   // 0-1
  recordedAt      DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@index([userId, lessonId, recordedAt])
}
```

Sertifika genişletme:
```prisma
model Certification {
  id         String              @id @default(cuid())
  userId     String
  courseId   String
  examSessionId String? @unique
  issuedAt   DateTime            @default(now())
  expiresAt  DateTime?
  status     CertificationStatus @default(ACTIVE)
  verifyCode String? @unique
  blockchainStatus String? // pending/minted/failed
  sbtTokenId String?
  createdAt  DateTime            @default(now())
  updatedAt  DateTime            @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  examSession ExamSession? @relation(fields: [examSessionId], references: [id], onDelete: SetNull)

  @@index([userId, status])
  @@index([expiresAt])
}
```

Notlar:
- `verifyCode` üretimi için mevcut doc sequence kullanılabilir.
- `blockchainStatus` ve `sbtTokenId` opsiyonel (flag ile aç/kapat).

## 2) NoSQL (ai_logs) ve Redis
- Mongo/Elastic koleksiyonu `ai_logs`: `{ sessionId, ts, event_type, confidence, meta }`
- Redis:
  - `proctor:session:<id>` → rolling trustScore + flag sayacı (TTL: sınav süresi + 1h)
  - `cert:verify:<code>` → QR doğrulama cache (TTL: 24h)

## 3) Vector Store
- `face_embeddings` (pgvector veya Milvus): user_id, vector, algo, version, created_at.
- RAG için `rag_chunks` mevcut planla aynı; Ghost-Mentor kullanıyor.

## 4) API Taslakları
- Proctoring:
  - `POST /proctor/sessions` → {sessionId, webrtc creds?, policy}
  - `POST /proctor/events` → sinyal gönderimi (eye/head/audio/tab/object)
  - `GET /proctor/score/:sessionId` → anlık trustScore, flags
- Ghost-Mentor:
  - `POST /ghost-mentor/ask` → {courseId, lessonId, timestamp, query, locale, examMode?}
  - `POST /ghost-mentor/preload-faq`
  - Yanıt: {text, sources[], audioUrl?, videoUrl?, latencyMs, policyFlags}

## 5) Policy / Güvenlik
- Exam mode: çözüm yok; sadece ipucu + kaynak.
- Prompt injection filtresi; rate limit.
- PII: ham medya yok, sinyal + hash; retention 30/90 gün (kuruma göre).

## 6) Migration Stratejisi
- Backward compatible: yeni alanlar nullable; `examSessionId` nullable başlar.
- `verifyCode` için tek seferlik populate script (sertifikalara code atama).
- pgvector gerekiyorsa: `CREATE EXTENSION IF NOT EXISTS vector;`
