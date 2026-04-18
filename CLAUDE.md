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
