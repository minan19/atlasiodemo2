# Atlasio – AI Ghost-Mentor Teknik Tasarım (2026-02-16)

## 0) Amaç
Öğrencinin videoyu “tek yönlü” izlemek yerine, eğitmenin dijital ikiziyle (Ghost-Mentor) anlık etkileşim kurmasını sağlamak. Exam mode’da çözüm vermeyen, kaynak gösterimli, düşük gecikmeli, çok dilli bir deneyim.

## 1) Mimari Bileşenler
- **Index Service**: Ders yüklenir yüklenmez çalışır. Whisper-v3 transcription, time-stamp, semantic segmentasyon; PDF/slayt içerikleriyle birlikte vektör indeks (pgvector/Milvus).
- **RAG Service**: Hybrid search (semantic + timestamp context). Kaynak zorunlu; exam mode’da “çözüm” yerine ipucu.
- **Synth Service**: LLM → metin; TTS (eğitmen voice profile) → ses; Lip-sync/Wav2Lip → kısa overlay video. Pre-render cache sık sorular için.
- **UI Layer (“Pulse Interface”)**: Video player üstü hotspotlar, Ghost Sphere (duruma göre renk), Trust/Focus bar, Attention-Sync uyarıları.
- **Edge/Latency Katmanı**: Sık soru cevapları için CDN/edge cache; compute coğrafi yakın node’da.

## 2) Akış (MVP)
1. **Indexing** (upload anı)
   - Transcribe (Whisper).
   - Align: cümle → timestamp.
   - Segment: konu blokları (topic clustering).
   - Embed: metin + slayt/PDF → vector DB.
   - Store: `rag_chunks` (lesson_id, text, ts_start/ts_end, embedding, source_ref).
2. **Soru Anı**
   - Context capture: current timestamp + son 30s transcript.
   - Hybrid search: query + context → top-k chunks.
   - Prompt: “Sen bu dersin eğitmenisin, pedagojik ve kısa anlat; kaynak satırları ver. Exam mode = çözüm yok, sadece ipucu.”
   - LLM output (text + bullet kaynaklar).
3. **Synthesis**
   - TTS: eğitmen voice profile (onboard’da 5–10 dk ses örneği).
   - Lip-sync: 5–15 sn’lik overlay clip (480p).
   - Deliver: video overlay + aynı anda metin + kaynak linkleri/mind-map kelime bulutları.
4. **Proaktif Müdahale (Attention-Sync)**
   - Attention/Confusion ≥ eşiğin üstünde → video soft pause + Ghost Sphere turuncu.
   - Teklif: “Bu kısmı kolay örnekle açayım mı?” → onaylarsa kısa özet oynatılır.

## 3) API Taslağı
- `POST /ghost-mentor/ask`
  body: { courseId, lessonId, timestamp, query, locale, examMode?: bool }
  resp: { text, sources[], audioUrl?, videoUrl?, latencyMs }
- `POST /ghost-mentor/preload-faq` (eğitmen paneli)
  body: { lessonId, faqs: [{q,a}], locale } → pre-render cache
- `GET /ghost-mentor/heartbeat` (UI durum) → { status: “ready” | “busy”, avgLatencyMs }
- Webhook (opsiyon): `mentor.answer.generated` (log/audit)

## 4) Latency Hedefleri
- Toplam: ≤ 2 s (edge yakınlığı + küçük LLM; büyük model fallback opsiyonel).
- Pre-render: top 20 FAQ için önceden TTS+lip-sync cache (100–300 ms yanıt).
- Payload boyutu: kısa overlay (≤ 2 MB), metin + kaynaklar aynı JSON’da.

## 5) Güvenlik / Policy
- Exam mode: çözüm yok, sadece ipucu; kaynak zorunlu; çözüme giden prompt engeli.
- PII: öğrenci sesi/yüzü saklanmaz; sadece transient.
- Audit: requestId, userId, courseId, ts, prompt hash, model versiyon, kaynak listesi.
- Abuse koruması: rate limit, prompt injection filtresi, içerik moderasyonu.

## 6) Çok Dilli Destek
- Transcribe + translate pipeline (Whisper).
- TTS voice profile öncelik: TR/EN; diğer dillerde nötr TTS.
- UI metinleri i18n; right-to-left test (AR).

## 7) UI Davranışları (Pulse Interface)
- Ghost Sphere: mavi (normal), turuncu (yüksek kafa karışıklığı), kırmızı (exam policy ihlali).
- Video overlay: şeffaf cam efekti, PiP değil “katman” gibi; bokeh arkada.
- Mind-map: cevapta anahtar kelimeler tıklanabilir; kaynaklara derin link.
- Attention-Sync: tab kaybı/ekrandan göz çekilmesi → hafif titreşim/ışık; dönüşte “özetle?” promptu.

## 8) Veri Modeli Ekleri
- `rag_chunks` (lesson_id, text, ts_start, ts_end, embedding, source_ref).
- `ghost_answers` (id, user_id, lesson_id, ts, question, answer_text, sources, audio_url?, video_url?, latency_ms, policy_flags).
- `attention_metrics` (user_id, lesson_id, ts, attention_score, confusion_index) — PoA ile birleşik kullanılacak.

## 9) Yol Haritası (MVP → V2)
- **MVP (4–6 hafta)**: TR/EN, text + TTS, küçük overlay, pre-render FAQ, exam-safe prompt, latency ≤ 2 s.
- **V2**: Çok dil, lip-sync iyileştirme, adaptive “öğrenme stili” profili, öğretmen kişilik tonu seçimi, AR/eğitmen hologram entegrasyonu.
