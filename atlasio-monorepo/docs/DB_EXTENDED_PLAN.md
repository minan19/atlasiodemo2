# Atlasio Genişletilmiş Veri Katmanı Planı (Postgres + NoSQL + Redis + Vector) – 2026-02-16

## 0) Amaç
Proctoring, AI, sertifika/SBT ve RAG ihtiyaçlarını karşılayacak hibrit veri mimarisi:  
- İlişkisel (PostgreSQL): transaksiyonel çekirdek.  
- NoSQL/Timeseries (Mongo/Elastic): yüksek frekanslı AI logları.  
- Redis: canlı skor/cache.  
- Vector store (pgvector veya Milvus): yüz embedding ve RAG chunk’ları.

## 1) Postgres Tabloları (Prisma migration taslağı)
- `biometric_hashes` (user_id FK, face_hash, voice_hash, created_at)  
- `exam_sessions` (id, user_id, course_id, start_at, end_at, device_info JSON, trust_score, ai_decision, proctor_comment)  
- `ai_proctoring_results` (id, session_id FK, eye_score, head_score, audio_score, tab_switches, object_flags, final_trust_score, ai_recommendation)  
- `certifications` (güncelle) → exam_session_id UNIQUE FK, blockchain_status (pending/minted/failed), sbt_token_id TEXT, verify_code, issued_at, expires_at  
- `blockchain_metadata` (cert_id FK, contract_address, token_id, tx_hash, ipfs_link)  
- `cognitive_load` (id, user_id, lesson_id, attention_score, confusion_index, ts)  
- `face_embeddings` (id, user_id, vector, algo, version, created_at) – pgvector kolonu veya dış vector store referansı  
- `document_sequence` (doc_type, year, counter) – seri/öğrenciNo üretimi  
- `learning_events` mevcut; RAG/analytics için payload genişletilebilir.

## 2) NoSQL / Timeseries (Mongo/Elastic)
- Koleksiyon: `ai_logs`  
  - Örnek belge: `{ session_id, ts, event_type: "eye_off_screen", confidence, frame_hash?, meta }`  
  - Retention: 30/90 gün (policy)  
  - Kullanım: real-time izleme, anomaly analizi, manual review kaynağı.

## 3) Redis
- `proctor:session:<id>` → rolling trustScore + flag sayacı (TTL sınav süresi + 1h)  
- `cert:verify:<code>` → geçerli hash/cache (TTL 24h)  
- Presence/streams (mevcut) yeniden kullanılır.

## 4) Vector Store
Seçenekler:  
- **pgvector** (Postgres içinde, kolay bakım)  
- **Milvus** (büyürse, yüksek QPS/embeddings)  
Kullanımlar:  
- `face_embeddings`: liveness / kimlik doğrulamada yüz karşılaştırma.  
- `rag_chunks`: ders içerik chunk embedding (lesson_id, text, source_ref, embedding).

## 5) Migration Notları (Prisma)
- Yeni tablolar eklenir, mevcutlara nullable alanlar eklenir (backward compatible).  
- `certifications.exam_session_id` nullable başlat, sonra doldur.  
- `blockchain_status` varsayılan `pending`.  
- pgvector kullanımı için: `CREATE EXTENSION IF NOT EXISTS vector;` (infra notu).

## 6) Yazma/Yükleme Yolları
- Proctoring Service → `exam_sessions` + `ai_proctoring_results` (son skor) + `ai_logs` (NoSQL) + Redis cache.  
- Certificate pipeline → `certifications` + `blockchain_metadata`; hash üretir, verify_code doldurur.  
- RAG indexer → `rag_chunks`/`face_embeddings` vector store’a, referansları Postgres’te.

## 7) Retention ve Gizlilik
- `ai_logs` 30/90 gün (kurum politikası).  
- `biometric_hashes` kullanım amacıyla sınırlı; silme talebinde kayıt kaldırılır.  
- Ham medya tutulmaz; yalnızca sinyal, hash, embedding.  
- Audit: tüm yazmalar ISO8601, requestId, actor.

## 8) Performans İpuçları
- AI loglarını Postgres’e yazma → kaçınılır; yalnızca özet skor Postgres’te.  
- Sertifika verify yoğunluğu: Redis cache + zincir doğrulama fallback.  
- pgvector: IVF/flat index seçimi veri hacmine göre; EF search < 50 ms hedefi.

## 9) İzleme
- DB health (/healthz) + bg job başarısı.  
- NoSQL write hataları için alarm; Redis hit/miss oranı.  
- Vector store gecikmesi + hata oranı metrikleri.
