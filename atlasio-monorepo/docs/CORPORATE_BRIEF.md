# Kurumsal Dijital Eğitim Projesi – Başlangıç Özeti

## 1. Vizyon & Amaç
- Kurumsal kullanıcı rolleri (ADMIN / INSTRUCTOR / STUDENT) için öğrenme planları, sertifikalar, rapor programları, operasyon metriği takibi ve otomasyon operasyonlarını uçtan uca destekleyen (API + Web + Infra) production-ready bir temel oluşturmak.
- Hedef: hızlı, güvenli ve ölçülebilir raporlama/kabul süreçleri ile otomasyon ve ops dokümanlarının uyumlu çalıştığı bir kurumsal platform sunmak.

## 2. Mevcut yapı
- `apps/api` (NestJS + Prisma + JWT auth + RBAC + audit log + rapor export) kurumsal veri katmanını ve servisleri sağlıyor. Yeni domain’ler (`learning-plans`, `certifications`, `reports`, `ops`, `automation`) hali hazırda modüller halinde yer alıyor; artırılacak noktalar servis kontratları, audit log meta’sı ve scheduled rapor dispatcher olacak.
- `apps/web` (Next.js App Router + Tailwind + kurumsal navigasyon bileşenleri) kullanıcıya kurumsal standartlarda header/breadcrumb/contextual back/recent/saved yapılarıyla deneyim sunacak.
- `infra` Docker Compose konfigürasyonları (PostgreSQL + Redis) ve `.env` şablonlarıyla çalışıyor, `scripts/smoke-prod.sh` ve `scripts/smtp-probe.mjs` gibi onay aşamaları bulunuyor.
- Operasyon rehberleri `docs/OPERATIONS.md`, `docs/RELEASE_RUNBOOK.md` ve `docs/ROLLBACK.md` içinde yer alıyor; bunların otomasyon, rapor export ve sertifika güncellemeleriyle paralel tutulması gerekiyor.

## 3. Öncelikli iş akışları
1. **API/Prisma** – Learning plan / sertifika / rapor / ops metriği modellerini schema’da gözden geçirip eksik ilişkileri tamamla, RBAC erişimleri netleştir, audit log ve scheduled report dispatcher event’lerini tüm ilgili eylemlere bağla (PDF/CSV/XLSX/DOC/DOCX export yeteneklerine dokunarak). Yeni eğitmen hakediş altyapısı (payout profile, enrollment completion/refund, instructor payments + volunteer content/value score) burada dönüşüyor; otomasyon her sabah hesaplayıp audit kaydı tutuyor.
2. **Kurumsal Web** – Yeni domain ekranlarını kurumsal navigasyon kalıpları içine yerleştir (kurum panelinde learning plan listesi, sertifika ilerleme kartı, raportör, automation status). Aynı zamanda contextual back ve saved views ile veri odaklı tekrar eden görevleri destekle.  
3. **Infra & Ops + QA** – Docker Compose + TLS + health probe akışlarını doğrula; automation scheduler/dakikalık job’ların `docs/RELEASE_RUNBOOK.md`/`docs/ROLLBACK.md`’de güncellendiğinden emin ol; `scripts/smoke-prod.sh` ve SMTP probe testlerini güncellenmiş akışla tekrar çalıştır.

## 4. Milestone önerisi (erken teslim ilkesiyle)
- **Sprint 0 (0–2 gün)**: Paydaş kimlikleri/akışları netleştirme + schema inceleme + ortam yapılandırması kontrolü.  
- **Sprint 1 (2–7 gün)**: API servisleri (learning plan create/assign, scheduled report create/dispatch, certification lifecycle, ops metric snapshot) ve test kapsayıcılığı.  
- **Sprint 2 (7–12 gün)**: Web’de corporate dashboard + contextual nav, onboarding/rapor/learning plan sayfaları, automation status card + export preview.  
- **Sprint 3 (12–14 gün)**: Ops doküman güncellemesi (runbook, rollback), qa (smoke + smtp probe), deploy-ready rehber paketleme.

## 5. Hemen başlayan işler
1. Prisma schema ve servislerde audit log + report dispatch adımlarını artırmak için `apps/api/src/modules/...` şemalarını/servislerini gözden geçireceğim.
2. `apps/web/src/app` altında yeni corporate ekran iskeletleri hazırlayıp varolan başlık/breadcrumb yapısına adapte edeceğim.
3. `docs/RELEASE_RUNBOOK.md` / `docs/ROLLBACK.md` dosyalarında hangi adımların (otomasyon jobs, report export) eklenmesi gerektiğini listeleyen ve update-ready hale getirecek bir taslak ekleyeceğim.

## 6. İlerleme & İletişim
- İlerleme raporlarını sprint sonlarında (veya onay istediğin noktada) paylaşırım. Herhangi bir kritik kararda (örneğin yeni veri modeli, export formatı) karar bağımsızlığı bende, fakat ihtiyaç duyduğunda örneklerle birlikte liste sunarım.
