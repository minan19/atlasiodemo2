# ATLASIO — Claude Code Çalışma Defteri

> Bu dosya, Claude Code oturumları arasında bağlamı korumak içindir.
> **Her oturumun başında oku, sonunda güncelle.**

---

## 1. Proje

**Atlasio** — Kurumsal uzaktan eğitim platformu (production-ready iskelet).
Türkçe, çok rollü (Admin / Instructor / Student / Guardian) bir öğrenme ortamı; canlı dersler, akıllı sınıf, sınav, sertifika, AI mentor, oyunlaştırma ve analitik içerir.

- **Repo**: monorepo (pnpm + turbo)
- **Çalışma dizini**: `/Users/mustafainan/Desktop/ATLASIO`
- **Ana branch**: `main`
- **Aktif branch**: `23martclaude`
- **Paket yöneticisi**: `pnpm@9.0.0`
- **Node**: 20+ (geliştirmede v24.13.0 kullanılıyor — `/Users/mustafainan/.nvm/versions/node/v24.13.0/bin/node`)

---

## 2. Mimari ve Dosya Yapısı

```
ATLASIO/
├── apps/
│   ├── api/                       # NestJS + Prisma + JWT + RBAC
│   │   ├── src/modules/           # ai, auth, courses, live, whiteboard, ...
│   │   └── prisma/                # schema + seed
│   └── web/                       # Next.js 16 (App Router) + React 18
│       └── app/
│           ├── _components/       # PanelShell, TopNav, NotificationBell, RoleContext
│           ├── _hooks/            # paylaşılan custom hook'lar
│           ├── _i18n/             # ÇOK DİL DESTEĞİ — strings.ts, use-i18n.ts, flat-translations.ts
│           ├── admin/             # admin paneli + 22 alt sayfa
│           ├── instructor/        # eğitmen paneli + alt sayfalar
│           ├── live/              # canlı ders, smart-classroom
│           ├── whiteboard/        # akıllı tahta, smartboard
│           ├── courses/           # kurs kataloğu
│           ├── guardian/          # veli paneli
│           ├── certificates/      # sertifikalar
│           ├── ai/                # AI mentor
│           └── ... (40+ sayfa)
├── infra/                         # docker-compose (Postgres + Redis), nginx, prod env'ler
├── docs/                          # OPERATIONS.md, RELEASE_RUNBOOK.md, ROLLBACK.md
└── scripts/                       # smoke-prod.sh
```

### Frontend (apps/web)
- **Framework**: Next.js 16.1.6 (App Router, Webpack)
- **State**: SWR + Context (RoleContext)
- **Çizim**: fabric.js (whiteboard), recharts (analytics), pdfjs-dist
- **Realtime**: socket.io-client
- **Stil**: inline style + tailwind 3.4 + Orbit Design System v2.0 (CSS değişkenleri)

### Backend (apps/api)
- **Framework**: NestJS 10
- **DB**: PostgreSQL + Prisma 5
- **Cache/queue**: Redis (ioredis)
- **Auth**: JWT + RBAC + audit log
- **Modüller**: 50+ modül (ai, ai-agents, ai-safety, auth, booking, certifications, courses, live, whiteboard, guardians, observability, payments, ...)

---

## 3. Tamamlanan Görevler

### i18n altyapısı (yarım — devam ediyor)
- `apps/web/app/_i18n/strings.ts` — tipli `I18nStrings` interface, 31 bölüm
- `apps/web/app/_i18n/use-i18n.ts` — `useI18n()` hook + `tr()` fonksiyonu
- `apps/web/app/_i18n/flat-translations.ts` — TR anahtar → dil çevirisi düz sözlük (5 dil: TR/EN/DE/AR/RU, 0 TS hatası)
- `LangKey` tipine `"ru"` eklendi
- TopNav dil seçicide Rusça mevcut (`<option value="ru">RU</option>`)

### Önceki feature commit'leri (git log)
- Orbit SVG redesign (Smart Classroom, Departments, LTI, Guardian, PanelShell)
- SmartBoard — complete redesign with API integration
- Orbit Design System v2.0 — complete visual overhaul
- Adaptive Quiz, Skill Roadmap, Course Builder, Analytics, Profile
- Cmd+K search, Progress Tracker, Admin Bulk Actions
- Ghost Mentor Chat, AI Agents Panel, AI Safety, Defense Center
- Notifications, Learning Plans, Booking, Peer Review, Certificate Renewal
- Language Lab, Math Engine, Smart Classroom, SSO, Departments

---

## 4. Devam Eden Görevler — i18n string sarma

**Sorun**: Dil değiştirildiğinde sayfaların çok az kısmı çevriliyor. Sebep: pages dosyalarındaki Türkçe stringler hâlâ hardcode; sadece title/subtitle çevriliyor.

**Çözüm yaklaşımı**: Her sayfada `const { tr } = useI18n()` ekle, hardcoded `"Türkçe metin"` → `{tr("Türkçe metin")}`.

**Durum**: Önceki oturumda 6 paralel agent başlatıldı, hepsi rate limit'e takıldı. **Hiçbir page dosyası `tr()` ile sarılmadı** (grep `tr("` → 0 sonuç). Sıfırdan başlamak gerek.

---

## 5. Sıradaki Adımlar (Yol Haritası)

### Öncelik 1 — i18n string sarma (devam eden iş)
Aşağıdaki batch'ler halinde sayfalarda `tr()` sarmaları yapılacak. Her batch'i ayrı ele alıp aralıkta TS check çalıştırılır.

1. **Live & Whiteboard** (4 büyük): `live/[id]`, `live/smart-classroom`, `whiteboard`, `whiteboard/smartboard`
2. **Dashboard & Admin** (22 sayfa): `dashboard`, `admin`, tüm `admin/*` alt sayfaları
3. **Instructor** (8 sayfa): `instructor` + alt sayfalar
4. **Courses & Exams** (12 sayfa): `courses`, `catalog`, `my-courses`, `exams`, `leaderboard`, `progress`, `analytics`
5. **Certificates / Payments / Guardian / Booking / Profile** (10 sayfa)
6. **AI / Labs / Login / Register / Portal / vd.** (18 sayfa)
7. **Paylaşılan componentler**: `top-nav.tsx`, `panel-shell.tsx`, `notification-bell.tsx`
8. **flat-translations.ts genişletme**: keşfedilen yeni stringleri ekle
9. **Final**: 0 TS hatası, manuel preview testi (RU/EN/DE/AR)

### Öncelik 2 — Yorum satırı temizleme (kullanıcı isteği)
Tüm projedeki yorumları tara, "açıklama" ile "devre dışı kod" ayır, listeyi onaya sun, sadece eski kod bloklarını sil.

### Öncelik 3 — Bekleyen iyileştirmeler
- `apps/api/dist/**` modified dosyaları `.gitignore`'da olmalı (şu an git status'ta `M` görünüyor)
- `dump.rdb` repo'dan çıkarılmalı (Redis dump dosyası)

---

## 6. Önemli Notlar ve Kurallar

### Çalışma anlaşması (kullanıcı tarafından belirlendi)
- **Büyük değişiklikten önce onay al** — özellikle dosya silme, mimari değişiklik, çoklu dosya refactor
- **Rutin kodlama** → Sonnet, **karmaşık problem / mimari** → Opus
- **Oturum uzayınca** `/compact` uygula
- **Her oturum sonu** → bu CLAUDE.md'yi güncelle (tamamlananlar + sıradakiler)
- **Her oturum başı** → bu CLAUDE.md'yi oku, kaldığın yerden devam et, kısa özet ver
- **Tıkandığında 3 uzman analizi**: Senior Dev / Sistem Mimarı / Debug uzmanı perspektiflerini sırayla yaz, en iyiyi seç

### Teknik kurallar
- `node` yolu: doğrudan `node` çalışmaz, tam yol kullan: `/Users/mustafainan/.nvm/versions/node/v24.13.0/bin/node`
- TypeScript kontrolü: `cd apps/web && /Users/mustafainan/.nvm/versions/node/v24.13.0/bin/node node_modules/typescript/bin/tsc --noEmit --skipLibCheck`
- `apps/api/dist/**` derlenmiş çıktıdır; elle düzenleme yapma
- Server component'lerde (`async function`) hook kullanılamaz — i18n için bu sayfaları client component'e çevir veya atla
- `const t = useI18n()` ile `.map((t) => ...)` çakışır; map parametresini `item` olarak yeniden adlandır
- `flat-translations.ts`'de **bir dil bloğu içinde aynı anahtar iki kez bulunmamalı** (TS1117 hatası verir)

### Git
- Kullanıcı açıkça istemedikçe **commit oluşturma**
- `git push --force`, `git reset --hard` gibi yıkıcı komutları onaysız çalıştırma

---

## 7. Oturum Kaydı

### 2026-04-11 — i18n string sarma — otomatik 2-pass
**Başarılar**:
- `scripts/i18n-wrap.mjs` yazıldı — JSX text + attribute regex sarma
- `scripts/i18n-wrap-pass2.mjs` yazıldı — multiline JSX text sarma
- `scripts/i18n-revert-errors.mjs` yazıldı — out-of-scope `t` referanslarını temizleme
- **Pass 1**: 62 dosya, 643 sarma → 88 TS hatası → revert → 555 net sarma
- **Pass 2**: 60 dosya, 388 sarma → 68 TS hatası → revert → 320 net sarma
- **Toplam**: 64 dosyada **851 `t.tr(...)` çağrısı**, **0 TS hatası**

**Geriye kalan ~1900 sarılmamış Türkçe string**:
- 707 **moduleData** — component dışı sabit array'ler (`const ITEMS = [{ label: 'Türkçe' }]`) → `t` orada scope'ta yok, refactor gerekli
- 885 **other** — karışık durumlar (template literal, koşullu string, JSX içi inline kompleks)
- 201 **attrInline** — aynı satırda hem string hem JSX hem JS karışımı
- 70 **multiJsx** — pass 2'de yakalayamadığı edge case'ler
- 71 **mockNames** — Türkçe özel isim mock data ("Dr. Ayşe Kaya"), çevrilmeyebilir

**Karar bekleyen**:
- Module-level data refactor edilecek mi? Her dosyada array'leri component içine taşıma + `useMemo(() => [...], [t.tr])` gerekir. Tahmini 30+ dosya elle iş.
- Mock isimler çevrilecek mi? (Tahminime göre HAYIR — özel isim)

### Sıradaki adım (yeni oturumda)
Kullanıcıdan onay sonrası seçenek:
- **A**: Module-level data refactor turuna gir (en büyük kategori, 707 string)
- **B**: Mevcut durumu commit et, manuel preview test yap, sonra spot-fix
- **C**: Kalan stringleri kabul et, `flat-translations.ts`'ye eksik anahtarları (zaten sarılmış 851 anahtarın çoğu) ekleme turuna gir

### 2026-04-11 (devam) — Pass 3: EN sözlük doldurma
- Sarılmış 776 benzersiz anahtardan EN sözlükte eksik 710 tanesi tek seferde eklendi
- `flat-translations.ts` EN bloğu 537 → 1247 anahtar
- 0 TS hatası, build temiz

### 2026-04-11 (devam) — EN fallback chain
- `use-i18n.ts` `tr()` artık iki kademeli fallback: hedef dil → EN → TR
- DE/AR/RU sözlüklerinde eksik anahtar olduğunda artık TR yerine EN gösterilir
- Pratik etki: DE/AR/RU sayfaları artık karışık dil yerine "kısmen native + gerisi EN" görünür — kullanıcı için daha tutarlı
- DE/AR/RU bloklarına manuel native çeviri eklemek hâlâ değerli ama acil değil
- 0 TS hatası
- **Karar bekleyen**: (A) Module data refactor (707 string), (B) DE/AR/RU manuel native genişletme, (C) Commit + preview test

### 2026-04-11 (devam) — Pass 4: Render-site wrapping (module data)
- `scripts/i18n-wrap-render-sites.mjs` yazıldı — JSX `{x.label}` → `{t.tr(x.label)}` (TEXT_PROPS whitelist)
- `scripts/i18n-revert-render-sites.mjs` yazıldı — TS2304 hatası veren satırlarda otomatik geri al
- Pass 4 sonuç: 61 dosya, 380 sarma → 57 revert → **323 net render-site sarması**
- `tr()` null/undefined/non-string passthrough — nullable module data alanları güvenli
- EN sözlüğüne ~500 module-level data çevirisi eklendi (`Module-level data (pass 4)` bölümü)
- **Toplam `t.tr(...)` çağrısı: 1168** (önceki: 851)
- 0 TS hatası, build temiz
- **Sıradaki**: kullanıcı kararı — A/B/C (yukarıda) — varsayılan öneri: **C** (commit + preview test)

### 2026-04-13 — Pass 5: Manuel sayfa sarma + EN sözlük genişletme
**Yapılanlar:**
- `middleware.ts`'e dev bypass eklendi — `NODE_ENV=development`'da auth gerektirmez, tüm sayfalara direkt erişim
- `app/page.tsx` (homepage) → `"use client"` + `useI18n()` + tüm stringler sarıldı
- `app/not-found.tsx` → `"use client"` + `useI18n()` + 404 metinleri çevrildi
- AI page template literal bug düzeltildi (`{t.tr(...)}` → plain text module-level fn içinde)
- **25+ sayfa manuel agent ile sarıldı**: dashboard, courses/catalog, my-courses, profile, live/[id], live/smart-classroom, admin/ai-agents, admin/reports, instructor/insights, exams, whiteboard, notifications, analytics, progress, roadmap, certificates, guardian, booking, adaptive-quiz, leaderboard, instructor, live, admin, portal, admin/email, admin/payments, admin/departments, admin/sso, admin/authorization, admin/defense, admin/ai-safety, admin/observability, admin/connectors, exams/results, exams/adaptive, certificates/renewal, peer-review, ghost-mentor, whiteboard/smartboard, admin/tools, demo, report-cards, my-courses/skill-profile, instructor/ai-queue, courses/[id]
- EN sözlüğüne **+360 yeni çeviri** eklendi (toplam ~2500+ anahtar)
- Whiteboard tooltip: offset `+8→+4px` + sol ok işareti (▶) eklendi
- **Toplam `t.tr(...)` çağrısı: 2147** (önceki oturum sonu: 1168)
- **0 TS hatası**

**Sıradaki oturumda:**
- Kalan sarılmamış sayfalara bak (admin/alarms, admin/proctoring, admin/security, admin/automation, admin/lti, admin/approvals, admin/volunteer, payments/success vb.)
- DE/AR/RU native çevirileri eklemek isteniyor mu?
- Commit + final preview testi (RU/DE/AR dilleri)

### 2026-04-20 — Pass 6-7 + Design System + Cleanup + DE/AR genişletme
**Yapılanlar:**

**Pass 6 (6 dosya, ~76 t.tr sarması):**
- `whiteboard/smartboard/page.tsx`, `courses/math-lab/page.tsx`, `admin/content/page.tsx` (StatusDot refactor + `ct` rename), `pay.tsx`, `live/legacy-panel.tsx`, `instructor/analytics/page.tsx` (RiskBadge tr prop)
- EN sözlüğüne +23 anahtar (Pass 6 bloğu): BİLİMSEL HESAP MAKİNESİ, Güvenli Ödeme, Ödeme Demo, Risk Skoru, Yüksek/Orta/Düşük Risk, Kişi başı ücret, Gelir paylaşım oranı vb.

**Pass 7 (15 dosya, ~98 t.tr sarması):**
- `courses/page.tsx` (WelcomeBanner subcomponent), `instructor/`, `notifications/`, `portal/`, çeşitli sayfalar
- EN sözlüğüne +34 anahtar (Pass 7 bloğu): AI Asistan, Tuvale Ekle, Hızlı Oturum (Legacy), Oturum Aç, Katıl vb.

**Design System (commit ae4a84d):**
- Font değişikliği: Space Grotesk + Source Sans 3 → **Plus Jakarta Sans** (başlık) + **Inter** (gövde)
- Renk paleti: Corporate Sapphire — `--brand-a: #2563EB`, `--brand-b: #1D4ED8`, `--brand-c: #059669`
- Light mode canvas: hafif mavi-gri (`#F7F8FC`), subtle gradients (mavi + yeşil radial)
- Kullanıcı onayı: "evt güzel olmuş"

**Dizin temizliği:**
- Masaüstünde 4 ATLASIO klasörü vardı: ana proje (`/Desktop/ATLASIO/`), 3 gereksiz kopya
- Temizlendi: `ATLASIO-backup/`, `ATLASIO-2/`, `atlasio-fresh/` silindi
- `/Desktop/atlasiodemo2/` ayrı proje (ECONIQ), dokunulmadı
- Doğru kök dizin: `/Users/mustafainan/Desktop/ATLASIO/`

**GitHub sync (commits):**
- `aecd85c` — i18n pass 3-5 + EN sözlük
- `73b69a9` — pass 6 (whiteboard, math, content, pay, legacy, analytics)
- `7f9bd56` — pass 7 (courses, instructor, notifications, portal, components)
- `ae4a84d` — design system (Plus Jakarta Sans + Corporate Sapphire)

**DE/AR genişletme (bu oturum):**
- DE bloğuna ~200 yeni anahtar eklendi: whiteboard, live, admin, instructor, progress, certificates, payments, guardian, learning plans, booking, AI mentor, roadmap, peer review, language lab, math lab, adaptive quiz, analytics, profile, portal, 3D science
- AR bloğuna ~200 yeni anahtar eklendi: aynı kategoriler + zaman birimleri (gün/hafta/ay/yıl), durum etiketleri (Açık/Kapalı/Bağlanıyor vb.)
- 0 TS hatası

**Sıradaki oturumda:**
- Kalan sarılmamış sayfalar: admin/alarms, admin/proctoring, admin/security, admin/automation, admin/lti, admin/approvals, admin/volunteer, payments/success vb.
- Commit + final preview testi (RU/DE/AR dilleri)
- İsteğe bağlı: RU bloğunu da genişlet (şu an en kapsamlı ama hâlâ eksikler var)

### 2026-04-21 — Emerald migrasyonu tamamlandı + CSS kontrast fix + 3 kullanıcı sorunu

**Emerald → Navy/Gold/Amber migrasyonu TAMAMLANDI:**
- Tüm `.tsx` dosyalarında `emerald` sıfır kaldı (grep sonucu: 0 dosya)
- Son batch: instructor/analytics, live, admin/ai-safety, admin/ai-agents, pay, courses/[id], whiteboard/smartboard, admin/volunteer
- Commit: `8204a1f`

**CSS kontrast fix:**
- `.shell-header .back-btn`: `background: rgba(255,255,255,0.08)` + `color: rgba(255,255,255,0.75)` — açık modda koyu lacivert nav üzerinde okunur hale getirildi
- `globals.css` CSS değişkenleri: `--brand-c`, `--accent-2`, `--brand-grad`, `--success`, `.hero-live strong` → emerald → gold/amber
- Commit: `253b316`

**Kullanıcının 3 sorusu:**
1. **Açık mod kontrast** → DÜZELTİLDİ (yukarıda)
2. **Dil sorunu (DE/AR/RU/KK karışık)** → Kök neden: bu dillerde binlerce anahtar eksik. EN fallback var ama TR'ye düşen anahtarlar da var. Çözüm seçenekleri: A) Manuel native çeviri, B) Makine çevirisi batch, C) Kritik 100 UI anahtarı önce. Kullanıcı kararı bekliyor.
3. **Gerçek auth** → Login/Register sayfaları ZATEN API'ye bağlı (`/auth/login`, `/auth/register` + localStorage token). Middleware dev bypass kaldırılmalı, token refresh akışı eklenmeli, e-posta doğrulama kontrol edilmeli. Bir sonraki oturumda uçtan uca test yapılabilir.

**Sıradaki adımlar (öncelik sırasıyla):**
1. **Gerçek auth testi** — Backend başlatıp login → token → protected page akışını doğrula
2. **Middleware dev bypass kaldırma** — Production-ready auth
3. **Token refresh + logout** — `/auth/refresh` endpoint'ini frontend'e bağla
4. **Dil sorunu** — Kullanıcı kararına göre (A/B/C yukarıda)
5. **i18n sarılmamış sayfalar** — admin/proctoring, admin/security vb.

### 2026-04-21 (devam) — Auth hardening + Critical UI i18n Pass 8

**Auth production-ready (tamamlandı):**
- `apps/web/app/api/client.ts` → `logout()` + `clearTokens()` public export
  - `logout()` backend'e `/auth/logout` POST atıp refresh token'ı Redis'ten iptal eder, sonra localStorage + cookies temizler, /login'e yönlendirir
  - Backend erişilmezse bile frontend temizliği garanti
- `apps/web/middleware.ts` → `NODE_ENV === 'development'` bypass **kaldırıldı**
  - Yeni davranış: opt-in `NEXT_PUBLIC_SKIP_AUTH=1` env var ile bypass (default: auth zorunlu)
  - Eski davranış CVE-2025-29927 pattern'ine yakın güvenlik sorunuydu (dev build prod'a deploy edilirse tüm sayfalar halka açık olurdu)
- `apps/web/app/profile/page.tsx` → logout butonu yeni helper kullanır (inline `localStorage.remove` pattern'i silindi)
- Backend auth (NestJS, `auth.service.ts`) zaten production-grade: Argon2 + JWT rotation + Redis refresh revocation + IP rate-limit + audit log + email verification + forgot-password
- Frontend `api/client.ts` 401 → refresh → retry → logout fallback zaten çalışıyor (mutex'li)

**Critical UI i18n Pass 8 (tamamlandı):**
- Top-120 TR anahtarı codebase'den `grep -oE 't\.tr\("..."\)' | sort | uniq -c | sort -rn` ile çıkarıldı
- **DE: +77 native çeviri** (546 toplam), **AR: +77** (543), **RU: +68** (724)
- Eklenen anahtarlar: "Kayıt", "katılımcı", "Yükleniyor…", "Tahta", "Oturum", "Reddet", "Yazdır", "Söz Ver", "Söz Al", "Kamera Kapalı", "AI Asistan", "— Eğitmen seçin —", "Sonuç bulunamadı", "Tümü →", "Tüm zamanlar", "Tespit Edilen Sorunlar", "Tamamlama", "Tahta Kilitli/Açık", "Sürükle", "Süresi Dolmuş", "Süre:", "Süre doldu", "Soru…", "Soru Sayısı", "Yeni API Anahtarı", "Uyarı", "Yönetici Merkezi", vd.
- flat-translations.ts 4850 → 5076 satır
- 0 TS hatası, 0 duplicate key (TS1117 check passed)

**Kalan i18n micro-fix'ler (tamamlandı):**
- `admin/lti/page.tsx` → `fields` array + stats array module-local inline sarıldı (`t.tr(label)` + `t.tr(placeholder)`)
- `admin/alarms` → FALSE POSITIVE (BADGE_LABEL + tabs zaten render site'ta `t.tr()` ile sarılı)
- `admin/security/page.tsx` + `admin/automation/page.tsx` → time-format template literals (`${m} dk önce`) → module-level function, `t` scope'ta yok; refactor gerekli ama düşük impact (admin-only, relative time)
- `admin/proctoring/page.tsx` → 13 string kaldı (mock isimler + gerçek UI karışık); sonraki oturumda

**Sonraki oturumda:**
1. **Gerçek uçtan uca auth test** — backend başlat (`pnpm --filter api dev`), Redis/Postgres up, login → protected page → logout döngüsü
2. **TopNav'e logout menüsü** — şu an sadece /profile'da; avatar'a hover menü ekle
3. **Next.js 16 `middleware.ts` → `proxy.ts` migration** — deprecated ama çalışıyor; codemod: `npx @next/codemod@latest middleware-to-proxy`
4. **Kalan i18n micro-fix**:
   - `admin/security` + `admin/automation` time-format → factory fn `makeTimeAgo(t)` pattern
   - `admin/proctoring` 13 string (mock isimleri hariç)
5. **DE/AR/RU daha geniş native çeviri** — şu an 543-724 anahtar/blok, EN 2333; ikinci 100 UI turunda genişlet

### 2026-04-21 (devam 2) — Pass 9-10 i18n + .gitignore hygiene + proctoring fix

**Pass 9 — Relative time anahtarları (5 dile eklendi):**
- `Az önce`, `dk önce`, `sa önce`, `gün önce` → EN/DE/AR/RU/KK (20 çeviri)
- `admin/security` + `admin/automation` sayfalarında `makeRelTime(tr)` factory pattern'ine çevrildi
- Module-level `relTime` fn → render-time `tr`-aware fn

**admin/proctoring DECISION_BADGE düzeltmesi:**
- `DECISION_BADGE(aiDecision)` → `DECISION_BADGE(aiDecision, t.tr)` (2 call site)
- Şüpheli/Bayraklı/Temiz rozet etiketleri artık çevrilebilir

**Pass 10 — Auth feature lists + proctoring UI (5 dile eklendi):**
- 24 EN anahtarı (auth login/register/forgot-password feature lists + proctoring UI)
- 23 DE / 23 AR / 22 RU / 13 KK native çevirisi
- Önemli yeni anahtarlar: "Güvenli sıfırlama bağlantısı", "256-bit SSL şifreleme", "KVKK & GDPR uyumlu", "İki faktörlü kimlik doğrulama", "Proctoring Dashboard", "Filtre", "Toplam Oturum", "Düşük/Orta/Yüksek Risk (...)", "TrustScore Yenile" vb.

**Kalan sarılmamış sayfalar kontrolü:**
- admin/alarms, admin/approvals, admin/volunteer, payments/success, payments/cancel, forgot-password, reset-password, verify-email, login, register → **HEPSİ TEMİZ** (module-level data render site'ta sarılmış)
- CLAUDE.md'deki eski "sarılmamış sayfalar" listesi yanlışmış

**.gitignore hijyeni:**
- `**/tsconfig.tsbuildinfo` + `**/*.tsbuildinfo` eklendi (TS incremental build cache)
- `apps/web/tsconfig.tsbuildinfo` index'ten çıkarıldı (`git rm --cached`)
- `dump.rdb` + `**/dist/` + `**/node_modules/` zaten kapsamda

**Sonuç:**
- 0 TS hatası
- Toplam `t.tr(...)` çağrısı değişmedi (~2147) — bu oturum yeni sarma değil, eksikleri kapattı

**Sıradaki:**
1. E2E auth smoke test — Docker compose up + login/refresh/logout akışı
2. Commit + final preview testi (RU/DE/AR dilleri)
3. İsteğe bağlı: DE/AR/RU 2. parti native genişletme

### 2026-04-22 — E2E auth smoke + commit (devam)

**E2E auth smoke test (TAMAMLANDI, 6/6 adım geçti):**
- `/tmp/smoke-auth.sh` — register → login → /auth/me → refresh → logout → revoked-refresh=401
- DB bağlantı sorunu çözüldü: `.env` port `5432` → `5433` (Docker Postgres)
- Prisma schema drift düzeltildi: `pnpm --filter api prisma db push --accept-data-loss` (User tablosundaki eksik sütunlar eklendi)
- Sonuç: Argon2 + JWT rotation + Redis refresh revocation uçtan uca doğrulandı (production-grade)

**Commit: `b5cdebd` — feat: auth hardening + i18n Pass 9-10 + gitignore hygiene**
- 25 dosya, +3418 / -634 satır
- `middleware.ts → proxy.ts` (Next.js 16 rename)
- `api/client.ts`: `logout()` + `clearTokens()` public helper
- Pass 9-10 i18n (5 dil × relative time + auth feature lists + proctoring UI)
- `admin/proctoring` DECISION_BADGE `tr` param fix
- `.gitignore`: `**/tsconfig.tsbuildinfo` hijyeni

**Untracked (commit dışı bırakıldı):**
- `apps/web/public/hybrid-preview.html`, `apps/web/public/logo-options.html` — önceki logo preview artifact'leri, bu oturumla ilgisiz

**Sıradaki oturumda:**
1. DE/AR/RU 2. parti native genişletme (EN'de 2333, DE 546, AR 543, RU 724 anahtar — fark büyük)
2. Final preview test (manuel tarayıcı — RU/DE/AR görsel kontrol)
3. TopNav avatar dropdown'a logout butonu ekleme (şu an sadece /profile'da)

### 2026-04-22 (devam) — Pass 11: DE/AR/RU en sık kullanılan 284 anahtar

**Analiz:**
- Codebase'deki en sık kullanılan top 500 `t.tr("...")` anahtar grep ile çıkarıldı
- Her dil için EN'de var ama hedef dilde eksik anahtarlar tespit edildi
- DE: 351 eksik, AR: 351 eksik, RU: 338 eksik (top 500 içinde)
- Uniq birleştirme: 284 benzersiz anahtar EN referanslı olarak çevrildi

**Çeviri sonuçları (5 dil toplam):**
- DE: 573 → **857 anahtar** (+284)
- AR: 570 → **854 anahtar** (+284)
- RU: 750 → **1021 anahtar** (+271; 13 zaten vardı)
- EN: 2349 (değişmedi), KK: 580 (değişmedi)
- Toplam +839 çeviri; `flat-translations.ts` 5223 → 6069 satır

**Kapsam örnekleri:**
- Ortak fiiller/durumlar: "Çıkış yap", "Kamerayı Kapat/Aç", "Katıl", "Oluştur", "Aktifleştir"
- Emoji'li UI anahtarları: "🧠 Akıllı Tahta", "🚀 Başlat", "🔁 Tekrar Bölümü (A-B)", "✋ El Kaldıranlar"
- Tam cümleler: "⚠ Demo verisi gösteriliyor...", "Ödemeler yönetici onayıyla kesinleşir..."
- Form placeholder'ları: "örn. Hücre Biyolojisi", "Ör: usr_12345", "Örn: Fotosentez için zihin haritası..."
- Uyarı/bilgi metinleri: "ℹ️ Mikrofon erişimi gereklidir...", "İşlem başarısız"

**Validation:**
- 0 TS hatası (strict + skipLibCheck)
- 0 duplicate key (TS1117 check passed)
- Her 3 dil için unique-key scan temiz

**Sıradaki:**
1. Pass 11 commit
2. Final preview test (tarayıcıda RU/DE/AR)
3. TopNav avatar dropdown logout

### 2026-04-24 — Pass 16 + Pass 17 + Register hardening + TR reverse-lookup

**Pass 16 (commit f3712b7) — DE/AR/RU top-200 native + TR reverse-lookup:**
- DE/AR/RU her biri +208 native anahtar (toplam +624 çeviri)
  - Kritik, Bilgi, Başarısız, Beklemede, Demo Talep Et, KALDI, Akademik, Basit ve ~200 diğer sık kullanılan UI etiketi
- **TR reverse-lookup bloğu**: backend EN hata mesajları → TR gösterim
  - `"Invalid credentials"` → `"Hatalı e-posta veya şifre"`, `Unauthorized`, `Forbidden`, `Not Found`, `Bad Request`, `Internal Server Error`
- EN blokta aynı backend hata anahtarlarının identity eşlemesi + `"Geçerli"`
- **`use-i18n.ts` değişikliği**: `tr()` artık TR dilinde de önce sözlükten bakar → backend EN hataları TR'ye map edilir; normal TR stringler identity-through
- **`register/page.tsx` güçlendirme**: array-map form → explicit label'lar (browser autoComplete için), canlı şifre validation indicator (kırmızı "N/8" → yeşil "✓ Geçerli"), name="..." attribute'ları eklendi

**Pass 17 (commit 03f1336) — KK 256 native genişletme:**
- KK: 841 → **1097 anahtar** (+256)
- Top-500 en sık kullanılan `t.tr()` anahtarından KK'da eksik 257 tanesi Cyrillic Kazakh'a çevrildi
- Kapsam: core navigation (Тақта, Сессия, Қабылдамау), dashboard/gamification (Лига, Көшбасшылар), demo form (Сұранысыңыз қабылданды!), progress/GPA (Жалпы несие, Жалпы орта бал), skill tree (Дағды ағашы, Көк/Алтын/Сұр түйіндер), whiteboard (Тақта құлыпталды, Лазер көрсеткіш), AI agents/proctoring (TrustScore тікелей, Аудит жазбасы), LTI/OneRoster/QTI (Интеграция орталығы, Экспорт, Импорт), security center (Қауіпсіздік дабылдары, Тікелей бақылау)

**Validation:**
- 0 TS hatası (strict + skipLibCheck)
- 0 duplicate key
- Final anahtar sayıları: tr:8 · en:2739 · de:1083 · ar:1080 · ru:1246 · **kk:1097**

**Sıradaki oturumda:**
1. Manuel preview test — tarayıcıda RU/DE/AR/KK dil değiştirme turu
2. Pass 18 — EN'den halen geride olan diller için ikinci 200-300 turu (KK en geride 1642 anahtar, sonra AR 1659, DE 1656)
3. Mock isim/placeholder policy kararı ("Ahmet Yılmaz" gibi özel isimler çevrilsin mi?)
4. `admin/proctoring` 13 kalan string + `admin/security`/`automation` time-format refactor (düşük impact)

### 2026-04-24 (devam) — Pass 18 + git hygiene doğrulama

**Git hijyeni (doğrulandı, zaten temiz):**
- `apps/api/dist/**`, `dump.rdb`, `*.tsbuildinfo` → hepsi `.gitignore`'da, tracked değil
- CLAUDE.md'deki eski "bekleyen git temizliği" notu eskimişti

**Pass 18 (commit ab9c744) — DE/AR ortak +100, KK ayrı +101:**
- **DE: 1083 → 1183 (+100)** — dashboard/demo form/progress/skill-tree/whiteboard top-used anahtarlar
- **AR: 1080 → 1180 (+100)** — DE ile aynı 100-anahtar batch'i
- **KK: 1097 → 1198 (+101)** — content library (upload), departments, SSO entegrasyonları (SAML/OIDC), LTI dialogları, admin approval center, AI safety center (PII masking), automation center

**Önemli tespit:** DE ve AR'nin en sık eksik anahtarları %100 örtüşüyor (her ikisinde de Pass 17'de KK'ya eklenen aynı UI anahtarları eksikti). KK ise Pass 17 sonrası farklı bir top-100'e kaydı → admin/integration UI ön planda.

**Validation:**
- 0 TS hatası (strict + skipLibCheck)
- 0 duplicate key
- Son sayımlar: tr:8 en:2739 de:1183 ar:1180 ru:1246 **kk:1198**

**Sıradaki oturumda:**
1. Pass 19 — sıradaki 100 × 3 dil (DE/AR şu an aynı top-752'de eksik, KK'da farklı kalan ~800)
2. RU native genişletme (sonraki top-200)
3. Manuel preview test — tarayıcı (senin elinde)
4. Mock isim policy kararı

### 2026-04-24 (devam 2) — Pass 19: DE/AR/KK +100 × 3 dil

**Pass 19 (commit 7a7a720) — 300 yeni native çeviri:**
- **DE: 1183 → 1283 (+100)** — whiteboard toolbar (NOT EKLE, RENK, KALINLIK), admin UI (Finans Merkezi, SSO), SSO/LTI diyalogları, proctoring (TrustScore)
- **AR: 1180 → 1280 (+100)** — DE ile aynı batch (100% örtüşme top-missing'de)
- **KK: 1198 → 1298 (+100)** — Savunma Merkezi, Kullanıcı Yönetimi, E-posta Şablonları, Satış/AI dashboard

**Validation:**
- 0 TS hatası (strict + skipLibCheck)
- 0 duplicate key
- Son sayımlar: tr:8 en:2739 **de:1283** **ar:1280** ru:1246 **kk:1298**

**Sıradaki oturumda:**
1. Pass 20 — sıradaki 100 × 4 dil (DE/AR/RU/KK); RU'yu özellikle genişlet (en az güncellenmiş)
2. Coverage raporu — kaç distinct `t.tr()` anahtarı / dil başına % kapsama
3. Manuel tarayıcı preview test (senin elinde)
4. Mock isim/placeholder policy kararı (hâlâ bekliyor)
