# Atlasio – 4 Haftalık Teknik Sprint Planı (Başlangıç) – 2026-02-16

## Hedef
Ghost-Mentor + Zero-Trust Proctoring + Güvenli Sertifika (QR/Hash, opsiyonel SBT) özelliklerini ilk pilotta üretmek; ölçülebilir ve “vav” etkisi yaratacak bir MVP’yi hazır etmek.

## Öncelik Prensipleri
- Tekrarsız ve çakışmasız ilerle: mevcut altyapıyı (build yeşil, OpenAPI güncel, QR/PDF) bozmadan üstüne ekle.
- Güven/KVKK: ham medya yok; sinyal + hash. Exam-mode’da çözüm verilmez.
- Opsiyonel SBT: flag kapalı, QR+hash varsayılan.

## Sprint 1 (Hafta 1) – Altyapı & API’ler
- Prisma migration (hazır şemayı uygulama): `ExamSession`, `AiProctoringResult`, `BiometricHash`, `CognitiveLoad`, `Certification` genişletmeleri.
- Proctoring API taslağı ve iskeleti:
  - `POST /proctor/sessions` (başlat)
  - `POST /proctor/events` (eye/head/audio/tab/object sinyalleri)
  - `GET /proctor/score/:sessionId` (anlık TrustScore)
- Ghost-Mentor API iskeleti:
  - `POST /ghost-mentor/ask`
  - `POST /ghost-mentor/preload-faq`
  - Exam-mode policy (ipucu, kaynak zorunlu).
- Redis entegrasyon iskeleti: `proctor:session:<id>` trustScore cache.

## Sprint 2 (Hafta 2) – Ghost-Mentor MVP
- Index Service: Whisper transcription + timestamp + RAG chunk’lama (pgvector).
- RAG Service: hybrid search (context+query) + kaynak zorunluluğu.
- Synth Service MVP: TTS (nötr ses) + metin cevabı; lip-sync küçük overlay opsiyonel flag.
- Pre-render: top 20 FAQ için cache (latency < 300 ms).
- Attention-Sync tetikleyici (temel): tab kaybı / göz-ayrılması uyarı sinyali.

## Sprint 3 (Hafta 3) – Proctoring Sinyal Toplama & Güven
- Frontend hooks: visibility/tab, screen count, basic eye/pose (MediaPipe web), ses spike algılayıcı.
- TrustScore hesaplayıcı (server): weighted skor, alarm eşiği, manual review flag.
- QR verify iyileştirmesi: Redis cache, hash kontrol logu.
- `verifyCode` populate script (mevcut sertifikalara kod atama).

### Whiteboard (canlı ders) eklenir
- WS kanal ve REST start/actions (tamamlandı).
- İzinsiz yazma engeli (eğitmen öncelikli) (tamamlandı).
- Şekil/yazı/grafik aksiyon tipleri (DRAW/ERASE/SHAPE/TEXT/IMAGE/GRID) (tamamlandı).
- V2: rate-limit, grant/revoke modeli, Canvas frontend.

## Sprint 4 (Hafta 4) – Pilot & Ölçüm
- Pilot kurs entegrasyonu (1 kurs): Ghost-Mentor ask/preload, proctoring oturumu.
- Latency/ops ölçümleri: ask → yanıt < 2s; proctoring event işleme < 200ms.
- Log/Audit: requestId, model sürümü, kaynak listesi; dashboards için temel metrikler.
- Ops dokümantasyonu güncelle: runbook’a proctoring/ghost servisleri ekle.

## Çıktı ve Başarı Ölçütleri
- Ghost-Mentor: %90+ yanıt kaynağı mevcut; ask→cevap < 2s (cache’li) / <4s (cold). 
- Proctoring: TrustScore üretebilen uçtan uca akış; alarm eşikleri çalışır; QR verify 200 ms cache hit.
- Sertifika: verifyCode tüm kayıtlar için dolu; PDF QR çalışıyor; SBT flag kapalı (opsiyon hazır).

## Risk / Mitigasyon
- Whisper/LLM latency: pre-render + edge cache.
- PII/GDPR: sinyal+hash, ham medya yok; retention 30/90 gün.
- Deepfake/virtual cam: detection hookları “fail closed” (oturumu dondur).
