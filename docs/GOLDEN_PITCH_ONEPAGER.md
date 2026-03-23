# Atlasio “Golden Pitch” (1 Sayfa) – 2026-02-16

## Özet
Atlasio, “içerik aktarımı” değil **“güven aktarımı”** yapar. Öğrencinin dersi gerçekten izlediğini, sınavda hile yapmadığını **AI Proctoring** ile kanıtlar; bu kanıtı **Blockchain** (SBT) ile mühürler. Sonuç: küresel, dijital akreditasyon kurumu.

## Neden Biz? (Zoom / Udemy / Coursera’ya karşı)
- Mevcut platformlar → içerik ve not tutar.
- Atlasio → **güven zinciri** kurar: AI gözetim + TrustScore + hash + SBT.
- Sertifika sadece PDF değil; sahteciliğe karşı zincirde doğrulanabilir.

## Ürün Sütunları
1) **AI Proctoring (Zero Trust)**: Liveness/challenge, eye/head/audio/object, tab/screen kontrolü; TrustScore < T → manual review.
2) **SBT Sertifika**: ERC-5192, devredilemez; verify QR + hash; PII zincire yazılmaz.
3) **Adaptive Ed-OS**: Kişiye özel içerik/quiz, erken uyarı, eğitmen AI koçu.
4) **Interoperability**: LTI 1.3, OneRoster; pgvector RAG ile içerik arama; SCORM/xAPI rotası açık.

## Pazar ve Para
- **Kurum lisansı** (seat + özellik paketi: proctoring, SBT, adaptive).
- **Proctoring oturum/dakika** bazlı kullanım ücreti.
- **SBT opsiyonlu premium**: zincir maliyeti + marka prestiji.
- **Teklif/RFP asistanı**: enterprise satış hızlandırıcı.

## Teknoloji Ayracı
- Mikroservis mimarisi; Postgres + NoSQL (ai_logs) + Redis + vector store.
- WebRTC + Edge/RTMP gateway; MediaPipe/YOLO/Whisper tabanlı sinyal motoru.
- Hash + QR + opsiyonel Polygon/Avalanche SBT; IPFS sadece PII’siz metadata.
- Privacy by design: ham video/audio tutulmaz, sadece sinyal + hash; KVKK/GDPR uyumlu.

## Çekirdek KPI’lar
- Fraud-free sertifika oranı (%99+ hedef).
- TrustScore < T olan sınavlarda manuel review süresi (<24h).
- Sertifika doğrulama yanıt süresi (<200 ms cache, <2 sn zincir).
- Proctoring oturum başı maliyet vs. geleneksel gözetmen maliyetinde %60+ düşüş.

## Yol Haritası (kısaltılmış)
- **MVP (0–3 ay)**: Proctoring v1 (eye/head/audio/tab), TrustScore, QR+hash verify, OpenAPI, runbook.
- **Growth (3–6 ay)**: SBT opsiyon, adaptive path, canlı ders özet, RAG asistan.
- **Scale (6–12 ay)**: Deepfake/voice spoof tespiti, kurumsal raporlama, çoklu bölge edge dağıtımı, akreditasyon iş ortaklıkları.
