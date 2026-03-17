# Atlasio – Ürün Tanımı ve Teknik Gereksinimler

## 1. Doküman Amacı
Bu doküman, **Atlasio Uzaktan Eğitim Modülü** için ürün kapsamını, teknik sınırları, kalite hedeflerini ve yayın kriterlerini tek bir referans altında toplar.

## 2. Ürün Tanımı
Atlasio, kurumların çalışan/eğitmen/öğrenci odaklı öğrenme süreçlerini dijital ortamda uçtan uca yönetmesini sağlayan bir uzaktan eğitim platformudur.

### 2.1 Ana Değer Önerisi
- Kurumsal ölçekte güvenli ve yönetilebilir LMS altyapısı
- Rol bazlı içerik yönetimi ve katılım akışları
- Sertifikasyon, raporlama ve otomasyon ile operasyonel verimlilik
- Ölçeklenebilir monorepo mimarisi ile sürdürülebilir geliştirme

## 3. Kapsam

### 3.1 Kapsamda Olanlar
- Kimlik doğrulama (JWT), rol/yetki yönetimi
- Kurs, ders ve enrollment (kayıt) yaşam döngüsü
- Learning plan (program) ve toplu atama
- Sertifika üretimi, geçerlilik/yenileme takibi
- Rapor üretimi ve zamanlanmış rapor gönderimi
- Operasyonel sağlık ve metrik görünürlüğü
- AI destekli deneme/alistirma sinavi ve konu eksigi odakli soru atama

### 3.2 Kapsam Dışı (V1)
- Canlı ders/video konferans altyapısı (WebRTC) 
- Çok dil destekli tam içerik yönetimi
- Gelişmiş ödeme/faturalama modülü

## 4. Kullanıcı Rolleri
- **ADMIN**: Platform ve tenant yönetimi, içerik/politika/rapor yönetimi
- **INSTRUCTOR**: Kurs ve ders içerik üretimi, yayınlama
- **STUDENT**: Katalog erişimi, kayıt, ders tüketimi, sertifika takibi

## 5. Fonksiyonel Gereksinimler

### 5.1 Kimlik ve Erişim
- FR-01: Kullanıcı register/login akışı JWT ile çalışmalıdır.
- FR-02: `GET /users/me` doğrulanmış token ile profil dönmelidir.
- FR-03: Role-based access control (RBAC) zorunludur.
- FR-04: Geçersiz token 401, yetkisiz rol erişimi 403 dönmelidir.

### 5.2 Kurs ve Ders Yönetimi
- FR-05: Admin/Instructor kurs oluşturmalı (draft).
- FR-06: Kurs yayınlama/publish akışı olmalı.
- FR-07: Yayındaki kurslar katalogda listelenmeli.
- FR-08: Ders ekleme, sıralama ve içerik erişimi yönetilmelidir.

### 5.3 Enrollment ve Öğrenme Akışı
- FR-09: Öğrenci kursa kayıt olabilmelidir.
- FR-10: Kayıt olmayan kullanıcı ders içeriğine erişememelidir (preview hariç).
- FR-11: Öğrenci “Kurslarım” görünümünde kayıtlarını görmelidir.

### 5.4 Kurumsal Katman
- FR-12: Learning plan oluşturma ve kurs ilişkilendirme olmalıdır.
- FR-13: Plan bazlı toplu kullanıcı atama desteklenmelidir.
- FR-14: Sertifika issue/expiry/renewal takibi yapılmalıdır.
- FR-15: Raporlar en az `pdf|xlsx|docx` formatlarında indirilebilmelidir.
- FR-16: Scheduled report oluştur/güncelle/listele/çalıştır akışı bulunmalıdır.

### 5.5 AI Adaptif Degerlendirme
- FR-17: Deneme ve alistirma sinavlari soru bankasindan dinamik olarak olusturulmalidir.
- FR-18: Soru bankasi `konu/kazanim/zorluk/tip` etiketleri ile siniflandirilmalidir.
- FR-19: Sistem, ogrencinin yanit gecmisine gore zayif oldugu konulara agirlikli soru secmelidir.
- FR-20: Her deneme sonunda konu bazli eksik analizi ve telafi onerisi uretilmelidir.
- FR-21: Eksik analizi sonucu learning plan/quiz atamasi otomatik tetiklenebilmelidir.

## 6. Teknik Gereksinimler

### 6.1 Mimari
- TR-01: Monorepo (pnpm workspace) kullanılmalıdır.
- TR-02: Backend NestJS, frontend Next.js olmalıdır.
- TR-03: Veri katmanı Postgres + Prisma ile yönetilmelidir.
- TR-04: Redis cache/rate-limit/otomasyon state için kullanılmalıdır.

### 6.2 API ve Sözleşme
- TR-05: Tüm korumalı endpoint’lerde `Authorization: Bearer <token>` desteklenmelidir.
- TR-06: JWT payload sözleşmesi `id + userId + role + email` ile uyumlu olmalıdır.
- TR-07: Swagger dokümantasyonu güncel tutulmalıdır (`/docs`).

### 6.3 Güvenlik
- TR-08: Global validation strict mode aktif olmalıdır.
- TR-09: Rate limiting üretim ortamında zorunlu olmalıdır.
- TR-10: Startup sırasında kritik env/secret kontrolleri yapılmalıdır.
- TR-11: Audit log: kim, neyi, ne zaman yaptı/indirdi kayıt altına alınmalıdır.

### 6.4 Gözlemlenebilirlik ve Operasyon
- TR-12: `/health` ve `/health/ready` endpointleri sağlıklı dönmelidir.
- TR-13: Request id üretimi ve loglara taşınması zorunludur.
- TR-14: Latency metrikleri (p50/p95) ve request sayısı izlenmelidir.
- TR-15: Zamanlanmış görevler (rapor dispatch, expiry kontrolleri) otomatik çalışmalıdır.

### 6.5 CI/CD ve Kalite
- TR-16: CI kapıları: `lint + typecheck + test + build` yeşil olmadan release yapılamaz.
- TR-17: Unit + integration/e2e kritik akış testleri bulunmalıdır.
- TR-18: Runbook, rollback ve operasyon dokümanları sürdürülmelidir.

### 6.6 AI Teknik Gereksinimler
- TR-19: AI soru secim motoru deterministik fallback kurallari ile calismalidir (AI devre disi iken kural tabanli secim).
- TR-20: AI kararlarinda kullanilan sinyal seti (dogruluk, sure, konu bazli basari) audit edilebilir olmalidir.
- TR-21: Model/algoritma ciktilari tenant izolasyonuna tam uymali, tenantlar arasi veri gecisi olmamalidir.

## 7. Performans ve Ölçek Hedefleri
- NFR-01: API ortalama yanıt süresi kritik endpointlerde düşük ms aralığında hedeflenmelidir.
- NFR-02: Çoklu kurum/kullanıcı büyümesine uygun yatay ölçeklenebilir mimari korunmalıdır.
- NFR-03: Rapor üretimi asenkronlaştırılabilir şekilde tasarlanmalıdır.

## 8. Yayın (Go-Live) Kabul Kriterleri
- KR-01: Auth, users/me, courses, lessons, enrollments uçtan uca çalışır.
- KR-02: RBAC kuralları doğru uygulanır (401/403 davranışları doğru).
- KR-03: Report export formatları doğru içerik döndürür.
- KR-04: Scheduled report tetiklenir ve audit kaydı oluşur.
- KR-05: Sertifika expiry/renewal akışı doğrulanır.
- KR-06: CI tamamen yeşildir ve prod smoke test geçer.
- KR-07: Adaptif deneme akisinda ayni ogrenci icin konu zayifliklarina gore soru dagilimi degisimi dogrulanir.

## 9. Çalışma Prensipleri
- Kararlar merkezi ve teknik doğruluk odaklı alınır.
- Geçici workaround’lar kalıcı prod yoluna taşınmaz.
- Her faz, bir önceki fazın test/kabul kriteri sağlanmadan kapanmaz.

## 10. Doküman Sahipliği
- Ürün sahipliği: Atlasio proje yönetimi
- Teknik sahiplik: Atlasio mühendislik ekibi
- Güncelleme sıklığı: Her major release öncesi zorunlu revizyon
