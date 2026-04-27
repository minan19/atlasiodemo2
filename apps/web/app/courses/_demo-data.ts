/**
 * Shared demo course catalog.
 *
 * These records are used as a frontend-only fallback when the backend API
 * does not return a matching course (e.g. demo IDs `d1`-`d12` that exist
 * only in the catalog grid). Both /courses/catalog and /courses/[id] read
 * from this list.
 */

export type DemoLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface DemoLesson {
  id: string;
  title: string;
  order: number;
  isPreview: boolean;
}

export interface DemoCourse {
  id: string;
  title: string;
  description: string;
  instructor: string;
  category: string;
  level: DemoLevel;
  price: number;
  rating: number;
  enrollmentCount: number;
  duration: number; // hours
  thumbnail?: string;
  tags: string[];
  isFree: boolean;
  createdAt?: string;
  lessons: DemoLesson[];
}

/**
 * Build a small demo lessons list for a given course title.
 * Keeps lesson titles consistent across catalog cards and detail pages.
 */
function buildLessons(prefix: string, count: number): DemoLesson[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-l${i + 1}`,
    title: `${prefix} — Bölüm ${i + 1}`,
    order: i + 1,
    isPreview: i === 0,
  }));
}

export const DEMO_COURSES: DemoCourse[] = [
  {
    id: 'd1',
    title: 'Modern React & Next.js ile Tam Yığın Geliştirme',
    description:
      'React 18, Next.js 14, TypeScript ve Tailwind CSS ile profesyonel web uygulamaları geliştirin.',
    instructor: 'Ahmet Yılmaz',
    category: 'Yazılım',
    level: 'INTERMEDIATE',
    price: 199,
    rating: 4.9,
    enrollmentCount: 8420,
    duration: 42,
    tags: ['React', 'Next.js', 'TypeScript'],
    isFree: false,
    createdAt: '2026-01-15',
    lessons: buildLessons('React & Next.js', 8),
  },
  {
    id: 'd2',
    title: 'Python ile Veri Bilimi ve Makine Öğrenmesi',
    description:
      'Pandas, NumPy, Scikit-learn ve TensorFlow ile veri analizi ve ML modelleri oluşturun.',
    instructor: 'Zeynep Kaya',
    category: 'Yazılım',
    level: 'BEGINNER',
    price: 0,
    rating: 4.8,
    enrollmentCount: 15300,
    duration: 38,
    tags: ['Python', 'ML', 'Pandas'],
    isFree: true,
    createdAt: '2026-02-01',
    lessons: buildLessons('Python Veri Bilimi', 8),
  },
  {
    id: 'd3',
    title: 'UI/UX Tasarım: Figma ile Profesyonel Arayüz',
    description:
      "Figma'da wireframe, prototip ve tasarım sistemleri oluşturarak kullanıcı deneyimini mükemmelleştirin.",
    instructor: 'Selin Demir',
    category: 'Tasarım',
    level: 'BEGINNER',
    price: 149,
    rating: 4.7,
    enrollmentCount: 5670,
    duration: 24,
    tags: ['Figma', 'UX', 'Prototip'],
    isFree: false,
    createdAt: '2026-01-20',
    lessons: buildLessons('UI/UX Tasarım', 6),
  },
  {
    id: 'd4',
    title: 'İş Analitiği ve Strateji: Veri Odaklı Kararlar',
    description:
      'Excel, Power BI ve stratejik analiz araçlarıyla iş kararlarınızı veriye dayandırın.',
    instructor: 'Murat Öztürk',
    category: 'İş',
    level: 'INTERMEDIATE',
    price: 249,
    rating: 4.6,
    enrollmentCount: 3210,
    duration: 18,
    tags: ['Analitik', 'Power BI', 'Strateji'],
    isFree: false,
    createdAt: '2025-12-10',
    lessons: buildLessons('İş Analitiği', 5),
  },
  {
    id: 'd5',
    title: "İngilizce: B1'den C1'e Hızlı Yükseliş",
    description:
      'Konuşma, yazma ve dinleme becerilerinizi pekiştirin. Gerçek hayat senaryolarıyla pratik yapın.',
    instructor: 'Elif Arslan',
    category: 'Dil',
    level: 'INTERMEDIATE',
    price: 0,
    rating: 4.5,
    enrollmentCount: 21000,
    duration: 30,
    tags: ['İngilizce', 'Konuşma', 'Gramer'],
    isFree: true,
    createdAt: '2026-02-14',
    lessons: buildLessons('İngilizce', 7),
  },
  {
    id: 'd6',
    title: 'İleri Kalkülüs ve Diferansiyel Denklemler',
    description:
      'Mühendislik ve fizik problemlerini çözmek için kalkülüs ve diferansiyel denklemlerde uzmanlaşın.',
    instructor: 'Hasan Çelik',
    category: 'Matematik',
    level: 'ADVANCED',
    price: 179,
    rating: 4.8,
    enrollmentCount: 2100,
    duration: 55,
    tags: ['Kalkülüs', 'Diferansiyel', 'Mühendislik'],
    isFree: false,
    createdAt: '2025-11-05',
    lessons: buildLessons('Kalkülüs', 9),
  },
  {
    id: 'd7',
    title: 'Kuantum Fiziği: Temelden İleri Seviyeye',
    description:
      'Kuantum mekaniği prensipleri, dalga fonksiyonları ve modern fizik uygulamalarını keşfedin.',
    instructor: 'Dr. Ayşe Şahin',
    category: 'Bilim',
    level: 'ADVANCED',
    price: 299,
    rating: 4.9,
    enrollmentCount: 980,
    duration: 60,
    tags: ['Fizik', 'Kuantum', 'Teori'],
    isFree: false,
    createdAt: '2025-10-20',
    lessons: buildLessons('Kuantum Fiziği', 10),
  },
  {
    id: 'd8',
    title: 'Node.js & Express ile RESTful API Geliştirme',
    description:
      'Backend geliştirme, veritabanı entegrasyonu ve API güvenliğini pratik projelerle öğrenin.',
    instructor: 'Can Yıldız',
    category: 'Yazılım',
    level: 'INTERMEDIATE',
    price: 0,
    rating: 4.7,
    enrollmentCount: 11200,
    duration: 28,
    tags: ['Node.js', 'API', 'Express'],
    isFree: true,
    createdAt: '2026-03-01',
    lessons: buildLessons('Node.js API', 7),
  },
  {
    id: 'd9',
    title: 'Grafik Tasarım: Adobe Suite ile Marka Kimliği',
    description:
      'Photoshop, Illustrator ve InDesign kullanarak güçlü marka kimliği ve kurumsal tasarımlar oluşturun.',
    instructor: 'Pınar Doğan',
    category: 'Tasarım',
    level: 'BEGINNER',
    price: 129,
    rating: 4.4,
    enrollmentCount: 4500,
    duration: 22,
    tags: ['Adobe', 'Marka', 'Logo'],
    isFree: false,
    createdAt: '2026-01-08',
    lessons: buildLessons('Grafik Tasarım', 6),
  },
  {
    id: 'd10',
    title: 'Girişimcilik ve Startup: Fikrinden Şirkete',
    description:
      'Lean startup metodolojisi, MVP geliştirme, yatırımcı sunumu ve büyüme stratejilerini öğrenin.',
    instructor: 'Barış Erdoğan',
    category: 'İş',
    level: 'BEGINNER',
    price: 0,
    rating: 4.6,
    enrollmentCount: 7800,
    duration: 16,
    tags: ['Startup', 'Girişim', 'MVP'],
    isFree: true,
    createdAt: '2026-02-20',
    lessons: buildLessons('Girişimcilik', 5),
  },
  {
    id: 'd11',
    title: 'Almanca A1-B2: Günlük Hayatta Almanca',
    description:
      'Sıfırdan başlayarak B2 seviyesine ulaşın. Sesli alıştırmalar ve kültürel içeriklerle öğrenin.',
    instructor: 'Nur Koç',
    category: 'Dil',
    level: 'BEGINNER',
    price: 199,
    rating: 4.5,
    enrollmentCount: 3400,
    duration: 45,
    tags: ['Almanca', 'A1-B2', 'Konuşma'],
    isFree: false,
    createdAt: '2025-12-28',
    lessons: buildLessons('Almanca', 8),
  },
  {
    id: 'd12',
    title: 'Biyokimya ve Moleküler Biyoloji Temelleri',
    description:
      'Hücre biyolojisi, protein sentezi ve metabolizma yollarını kapsamlı şekilde inceleyin.',
    instructor: 'Prof. Taner Aksoy',
    category: 'Bilim',
    level: 'INTERMEDIATE',
    price: 219,
    rating: 4.7,
    enrollmentCount: 1650,
    duration: 48,
    tags: ['Biyoloji', 'Kimya', 'Hücre'],
    isFree: false,
    createdAt: '2026-01-30',
    lessons: buildLessons('Biyokimya', 7),
  },
];

/**
 * Look up a demo course by its ID. Returns `null` if not a demo ID.
 */
export function findDemoCourseById(id: string): DemoCourse | null {
  return DEMO_COURSES.find((c) => c.id === id) ?? null;
}

/**
 * True if the given ID is one of the frontend demo course IDs.
 */
export function isDemoCourseId(id: string): boolean {
  return /^d\d+$/.test(id);
}
