# Atlasio Anti-Cheating & Güvenlik Stratejisi (Zero Trust) – 2026-02-16

## 1) Tehdit Modeli
- Kimlik sahteciliği: deepfake, önceden kaydedilmiş video, virtual cam.
- Yardım alımı: ikinci kişi, fısıltı/uzaktan ses, telefon/kitap.
- Cihaz suistimali: ikinci monitör, tab/screen switch, remote desktop.
- Veri bütünlüğü: sertifika veya sınav kaydının sonradan değiştirilmesi.

## 2) Sınav Akışı (Zero Trust)
1) **Pre-exam**
   - Yüz+kimlik karşılaştırma (similarity > 0.95, ham görüntü atılmaz, yalnızca hash/score).
   - 360° ortam taraması: ikinci kişi/cihaz tespiti.
   - Device fingerprint: OS, screen count, hardware hash (remote desktop işareti).
2) **Live Monitoring (5–10 Hz sinyal)**
   - Eye tracking: ekrandan uzaklaşma süresi.
   - Head pose: aşırı sapmalar.
   - Audio: fısıltı/ikinci ses, gürültü spike.
   - Object detection: telefon/kitap.
   - Tab/screen/monitor: focus kaybı, ikinci ekran, screenshot teşebbüsü.
3) **Challenge-Response** (anti-deepfake)
   - Rastgele komutlar: göz kırp, baş sola, “3” say; 2D video/loop çalışmaz.
4) **TrustScore**
   - Weighted skor: eye, head, audio, tab, object.
   - Threshold < T → “Manual Review”; >= T ve sınav geçer → sertifika süreci.
5) **Post-exam**
   - Ham medya silinir; sinyal + ihlal bayrakları + hash kalır.
   - İtiraz/hakem modu: kayıtlı ihlal bayrakları ve özet kullanıcıya gösterilir.

## 3) Teknik Önlemler
- **Virtual cam/OBS tespiti**: kaynak adlarını tarayıp “fake”/“obs” içerenleri blokla; tespit anında sınav dondur.
- **Remote desktop kontrolü**: RDP/VNC/TeamViewer process & displaySurface=browser check; bulunursa sınavı kilitle.
- **Screen/Tab policy**: visibilitychange, blur, key combos; izin verilen dış bağlantılar beyaz liste.
- **Dual monitor**: screen count >1 ise uyar + gerekirse sınav iptali.

## 4) Veri ve KVKK/GDPR
- PII minimizasyonu: ham video/audio tutulmaz; landmark/sinyal + hash.
- Retention: sinyal logları 30/90 gün (kurum politikasına göre), hash/prompt log uzun süreli.
- Açık rıza: biyometrik kullanım onayı; opt-out → manual proctoring seçeneği.
- Şeffaflık: kullanıcıya hangi verinin tutulduğu, silme talebi süreçleri.

## 5) Loglama & Alarm
- Realtime: TrustScore < T_warn → sarı; < T_fail → kırmızı, sınav dondur.
- Alarmlar: çoklu ihlal, screen loss, virtual cam, remote desktop, audio anomaly.
- Audit: kim, ne zaman, hangi ihlal, hangi cihaz; ISO8601 + requestId.

## 6) Sertifika Güven Zinciri
- Proof bundle: {exam_session_id, user_id, trustScore, exam_score, timestamp} → SHA-256 hash.
- QR verify: hash kontrolü; cache (Redis) + gerekirse zincir doğrulaması.
- SBT opsiyonlu: ERC-5192 (devredilemez), PII zincire yazılmaz; hash + token_id.
- Veri tabanı kompromize olsa bile hash/zincir tutarlılığıyla sahte sertifika engellenir.

## 7) Operasyonel Prosedür
- Sınav başlat: device check + rıza + liveness.
- Sınav sırasında: ihlal sayacı, anlık uyarı; kritik durumda sınavı otomatik sonlandır.
- Sınav sonrası: TrustScore + ihlal listesi, gerekirse manual review kuyruğu.
- Manuel review SLA: <24h; sonuç audit’e işlenir.

## 8) Test / QA
- Deepfake/loop senaryosu (baş/ göz komutu geçememeli).
- Virtual cam (OBS) açıldığında sınav kilitlenmeli.
- İkinci ekran + tab switch → yüksek ağırlık eklenmeli.
- Gürültü/fısıltı örnekleriyle false-positive ayarı.
- PII deletion & retention testleri.
