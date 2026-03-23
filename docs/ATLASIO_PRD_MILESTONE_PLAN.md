# Atlasio PRD + Milestone/Efor Planı

## 1. PRD Özeti

### 1.1 Ürün Adı
Atlasio Uzaktan Eğitim Modülü

### 1.2 Problem
Kurumlar, öğrenme süreçlerini güvenli, ölçülebilir ve ölçeklenebilir şekilde tek platformdan yönetmek istiyor.

### 1.3 Hedef
Kurumsal seviyede LMS çekirdeğini stabil hale getirip; raporlama, sertifikasyon ve otomasyon ile satılabilir bir ürün standardına ulaşmak.

### 1.4 Başarı Metrikleri
- Kritik akış başarı oranı: `%99+` (auth, me, course, lesson, enrollment)
- API hatasızlık: 5xx oranı düşük ve izlenebilir
- Rapor üretimi: `pdf/xlsx/docx` formatlarında stabil çıktı
- CI kapıları: `lint + typecheck + test + build` sürekli yeşil

## 2. Kapsam

### 2.1 In Scope (V1)
- Auth + RBAC
- Courses/Lessons/Enrollments
- Learning Plans
- Certifications + renewal takibi
- Reports + Scheduled Reports
- Health/Ops metrikleri
- Prod deploy + runbook/rollback
- AI adaptif deneme/alistirma sinavi

### 2.2 Out of Scope (V1)
- Canlı ders/video konferans
- Faturalama/ödeme sistemi
- Gelişmiş çok dil içerik yönetimi

## 3. Kullanıcı Hikayeleri
- Admin olarak kullanıcıları/kursları yönetebilmek istiyorum.
- Instructor olarak kurs ve ders içeriklerini oluşturup yayınlamak istiyorum.
- Student olarak kursa kayıt olup derslere erişmek ve sertifikamı takip etmek istiyorum.
- Operasyon ekibi olarak sistem sağlığını, metrikleri ve otomasyonları izlemek istiyorum.

## 4. Milestone Planı

## M0 — Stabilizasyon ve Platform Güveni
**Hedef:** Prod çalışabilir çekirdek

### Feature Set
- JWT contract standardizasyonu
- `/users/me` ve guard akışlarının sabitlenmesi
- Build/runtime tutarlılığı
- Env/secret startup kontrolleri

### Deliverables
- Stabil API startup
- Swagger ve auth akış doğrulaması
- Smoke test scripti

### Efor
- S

### Bağımlılık
- Yok

### Exit Criteria
- `health/ready` 200
- login -> me başarılı
- 401/403 davranışları doğru

## M1 — Çekirdek LMS Akışı
**Hedef:** Uçtan uca öğrenme yolculuğu

### Feature Set
- Courses CRUD + publish
- Lessons CRUD + access control
- Enrollment + My Enrollments
- Role matrix (ADMIN/INSTRUCTOR/STUDENT)

### Deliverables
- Katalog + kurs detay + ders erişim akışı
- EnrollmentGuard kurallarının netleşmesi

### Efor
- M

### Bağımlılık
- M0

### Exit Criteria
- auth -> me -> courses -> lessons -> enrollments zinciri çalışır
- RBAC testleri geçer

## M2 — Kurumsal Raporlama
**Hedef:** Satılabilir kurumsal katman

### Feature Set
- Report export `pdf/xlsx/docx`
- Rapor filtre kontratı
- Scheduled reports CRUD + dispatch
- Report audit logging

### Deliverables
- Zamanlanmış rapor altyapısı
- İndirilebilir çok formatlı raporlar

### Efor
- M

### Bağımlılık
- M1

### Exit Criteria
- 3 formatta rapor doğrulaması
- schedule dispatch + log kayıtları

## M3 — Learning Plans + Certifications
**Hedef:** Kurumsal farklılaştırıcı fonksiyonlar

### Feature Set
- Learning plan oluşturma
- Plan-kurs ilişkilendirme
- Toplu kullanıcı atama
- Sertifika issue/expiry/renewal

### Deliverables
- Program bazlı otomasyon
- Sertifika yaşam döngüsü

### Efor
- M

### Bağımlılık
- M2

### Exit Criteria
- Plan ataması sonrası enrollment
- Expiry/renewal akışı doğrulanır

## M4 — Ops, Güvenlik, Release Hardening
**Hedef:** Anahtar teslim, operasyonel ürün

### Feature Set
- Ops metrics (p50/p95/request count/active users)
- Request-id ve log standardı
- Prod compose + nginx + TLS setup
- Runbook + rollback + release checklist

### Deliverables
- Üretim ortamı çalışma talimatları
- İzlenebilirlik ve operasyon standardı

### Efor
- S

### Bağımlılık
- M3

### Exit Criteria
- Prod smoke test geçer
- CI kapıları tam yeşil

## M5 — AI Adaptif Sinav Motoru
**Hedef:** Ogrenci eksigine gore akilli soru secimi

### Feature Set
- Soru bankasi etiketleme (konu/kazanim/zorluk/tip)
- Deneme ve alistirma sinavi olusturma
- Adaptif soru secici (kural + AI destekli)
- Eksik analizi ve telafi odev/quiz onerisi

### Deliverables
- Ogrenci bazli skill profile
- Adaptif deneme API ve raporlama metrikleri

### Efor
- M

### Bağımlılık
- M1

### Exit Criteria
- Ogrencinin zayif konu dagilimina gore soru secimi degisir
- Sinav sonu eksik haritasi ve telafi oneri akisi dogrulanir

## 5. Task Breakdown (Örnek Detay Seviyesi)

### Epic A — Auth & RBAC
- A1: JWT payload normalizasyonu (S)
- A2: `users/me` guard + e2e doğrulama (S)
- A3: Role guard/decorator standardı (S)

### Epic B — Learning Core
- B1: Course publish lifecycle (S)
- B2: Lesson ordering + content model (M)
- B3: Enrollment access matrix (S)

### Epic C — Reporting
- C1: Export adapters (`pdf/xlsx/docx`) (M)
- C2: Schedule engine + dispatcher (M)
- C3: Download audit trail (S)

### Epic D — Enterprise Extensions
- D1: Learning Plan domain (M)
- D2: Certification renewal policy (M)

### Epic E — Operations
- E1: Health/readiness standardı (S)
- E2: Metrics collector + endpoint (S)
- E3: Release runbook/rollback dokümanları (S)

### Epic F — Adaptive Assessment
- F1: Question bank domain + tagging (M)
- F2: Attempt/answer/event toplama (S)
- F3: Skill profile hesaplama (M)
- F4: Adaptive selector + fallback rules (M)
- F5: Remediation recommendation + plan assignment (M)

## 6. Risk ve Önlem Planı
- Risk: Build/runtime drift
  - Önlem: Docker image startup sözleşmesi + smoke test
- Risk: Yetki kaçakları
  - Önlem: 401/403 test matrisleri ve guard review
- Risk: Rapor performansı
  - Önlem: Asenkron dispatch + format bazlı sınırlandırma
- Risk: Prod konfig hataları
  - Önlem: startup env checks + runbook checklist

## 7. Test ve Kabul Stratejisi
- Unit: auth/guards/reports
- Integration: role ve erişim akışları
- E2E: kritik iş yolculuğu
- Release gate: `pnpm ci:check` + `pnpm smoke:prod`

## 8. Teslim Modeli
- Faz kapanışları test-kabul kriterine bağlıdır.
- Faz geçişi, bir önceki faz kapanmadan yapılmaz.
- Dokümantasyon ve operasyon notları release ile birlikte güncellenir.

## 9. Hızlı Takvim (Öneri)
- Hafta 1: M0 + M1
- Hafta 2: M2
- Hafta 3: M3
- Hafta 4: M4 + prod hardening
- Hafta 5: M5

> Not: Takvim, ekip kapasitesi ve dış bağımlılıklara göre güncellenebilir; kalite kapıları sabittir.
