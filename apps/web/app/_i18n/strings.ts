export type LangKey = "tr" | "en" | "de" | "ar" | "ru" | "kk";

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions — every key must exist in every language
// ─────────────────────────────────────────────────────────────────────────────
export type I18nStrings = {
  /** Shared / global strings */
  common: {
    save: string; cancel: string; delete: string; edit: string; add: string;
    search: string; filter: string; loading: string; error: string; success: string;
    confirm: string; close: string; back: string; next: string; previous: string;
    refresh: string; submit: string; reset: string; download: string; upload: string;
    copy: string; copied: string; send: string; view: string; create: string;
    update: string; remove: string; enable: string; disable: string; all: string;
    none: string; yes: string; no: string; ok: string; retry: string;
    noData: string; noResults: string; demoMode: string; loginRequired: string;
  };

  /** Role labels */
  roles: {
    admin: string;
    headInstructor: string;
    instructor: string;
    student: string;
    guardian: string;
  };

  /** Top navigation */
  nav: {
    brandSub: string; login: string; logout: string; roleLabel: string; langLabel: string;
    search: string; darkMode: string; lightMode: string; aiMentor: string;
    notifications: string; security: string; myCourses: string; profile: string;
    back: string; forward: string; home: string; dashboard: string;
    alarmsTip: string;
  };

  /** Auth — Login */
  login: {
    heroPill: string; heroTitle1: string; heroTitle2: string; heroDesc: string;
    formTitle: string; formSub: string; email: string; emailPh: string;
    password: string; passwordPh: string; loading: string; submit: string;
    noAccount: string; register: string; forgotPassword: string;
    roleButtons: { key: string; label: string }[];
  };

  /** Auth — Register */
  register: {
    heroPill: string; heroTitle: string; heroDesc: string;
    stat1Label: string; stat1Value: string;
    stat2Label: string; stat2Value: string;
    stat3Label: string; stat3Value: string;
    formTitle: string; formSub: string;
    name: string; namePh: string; email: string; emailPh: string;
    password: string; passwordPh: string; passwordHint: string;
    confirmPassword: string; confirmPh: string;
    submit: string; loading: string;
    haveAccount: string; loginLink: string;
    errorMismatch: string; errorWeak: string;
  };

  /** Auth — Forgot / Reset / Verify */
  auth: {
    forgotTitle: string; forgotSub: string; forgotDesc: string;
    forgotSubmit: string; forgotLoading: string; forgotSuccess: string;
    forgotPill: string;
    resetTitle: string; resetSub: string;
    newPassword: string; newPasswordPh: string;
    resetSubmit: string; resetLoading: string; resetSuccess: string;
    verifyTitle: string; verifySub: string; verifyDesc: string;
    verifySuccess: string; verifyLoading: string;
    backToLogin: string; rememberPassword: string;
  };

  /** Landing / Home page */
  home: {
    pill: string; activePill: string; activeCount: string;
    title1: string; title2: string; slogan: string; desc: string;
    ctaStart: string; ctaDemo: string; ctaCatalog: string;
    trustedBy: string; universities: string; companies: string; countries: string;
    statsTitle: string; statsHeading: string;
    featuresTitle: string; featuresHeading: string; featuresDesc: string;
    pricingTitle: string; pricingHeading: string; pricingDesc: string;
    ctaHeading: string; ctaDesc: string; ctaRegister: string; ctaBrowse: string;
    testimonialTitle: string; testimonialHeading: string;
    freePlan: string; proPlan: string; enterprisePlan: string;
    monthSuffix: string; customPrice: string;
    planCtaFree: string; planCtaPro: string; planCtaEnterprise: string;
    planDescFree: string; planDescPro: string; planDescEnterprise: string;
    highlighted: string;
  };

  /** Dashboard */
  dashboard: {
    deniedTitle: string;
    deniedDesc: (role: string) => string;
    welcomeBack: string;
    quickActions: string;
    recentActivity: string;
    upcomingLive: string;
    myMaterials: string;
    uploadAssignment: string;
    pendingApprovals: string;
  };

  /** Courses */
  courses: {
    catalogTitle: string; catalogDesc: string;
    searchPh: string; filterAll: string; filterFree: string; filterPremium: string;
    sortNewest: string; sortOldest: string; sortPopular: string; sortRating: string;
    enrolled: string; enroll: string; continue: string; preview: string;
    free: string; duration: string; lessons: string; students: string;
    rating: string; instructor: string; level: string; certificate: string;
    noCoursesFound: string; loadMore: string;
    detailOverview: string; detailCurriculum: string; detailInstructor: string;
    detailReviews: string; detailEnroll: string;
    myCoursesContinue: string; myCoursesCompleted: string; myCoursesAll: string;
    skillProfile: string;
  };

  /** Live sessions */
  live: {
    title: string; subtitle: string;
    statusRunning: string; statusScheduled: string; statusEnded: string;
    joinBtn: string; scheduleBtn: string; endedLabel: string;
    noSessions: string; demoNote: string;
    participantsLabel: string; durationLabel: string;
  };

  /** Whiteboard */
  whiteboard: {
    labels: {
      actionsTitle: string;
      quickActions: {
        pdf: string; presentation: string; shareScreen: string;
        cameraOn: string; cameraOff: string; quiz: string; downloadPng: string;
      };
      viewRole: { instructor: string; student: string };
      background: string; thickness: string; color: string;
      pages: string; newPage: string; undo: string; redo: string;
      clear: string; close: string; privateMsg: string; privateTo: string;
      noMsg: string; send: string;
    };
  };

  /** Profile */
  profile: {
    title: string; subtitle: string;
    personalInfo: string; security: string; preferences: string;
    displayName: string; displayNamePh: string;
    emailLabel: string; currentPassword: string; newPassword: string;
    changePhoto: string; saveChanges: string; saving: string;
    successSaved: string; errorSave: string;
    language: string; theme: string; notifications: string;
    darkTheme: string; lightTheme: string; systemTheme: string;
  };

  /** Notifications */
  notifications: {
    title: string; subtitle: string;
    markAllRead: string; clearAll: string; noNotifications: string;
    filterAll: string; filterUnread: string; filterSystem: string;
    typeLesson: string; typeCertificate: string; typeAlarm: string; typeSystem: string;
  };

  /** Leaderboard */
  leaderboard: {
    title: string; subtitle: string;
    rankLabel: string; studentLabel: string; xpLabel: string;
    badgesLabel: string; streakLabel: string; completedLabel: string;
    filterWeek: string; filterMonth: string; filterAll: string;
    yourRank: string; topPerformers: string;
  };

  /** Progress */
  progress: {
    title: string; subtitle: string;
    overallProgress: string; coursesInProgress: string;
    completedCourses: string; totalXP: string; currentStreak: string;
    weeklyGoal: string; achievements: string; badges: string;
    noProgress: string; startLearning: string;
  };

  /** Report cards */
  reportCards: {
    title: string; subtitle: string;
    period: string; overallGrade: string; attendance: string;
    performance: string; comments: string; downloadPDF: string;
    noReports: string;
  };

  /** Certificates */
  certificates: {
    title: string; subtitle: string;
    issuedOn: string; expiresOn: string; verifyBtn: string;
    downloadBtn: string; shareBtn: string; renewBtn: string;
    noCertificates: string; verifyTitle: string; verifyDesc: string;
    verifySubmit: string; verifyPh: string; verifySuccess: string;
    verifyFail: string;
  };

  /** Exams */
  exams: {
    title: string; subtitle: string;
    startExam: string; reviewExam: string; retakeExam: string;
    timeLeft: string; questionsCount: string; passScore: string;
    status: { pending: string; passed: string; failed: string; inProgress: string };
    resultsTitle: string; yourScore: string; correctAnswers: string;
    adaptiveTitle: string; adaptiveDesc: string;
    difficulty: { easy: string; medium: string; hard: string };
  };

  /** AI / Ghost-Mentor */
  ai: {
    title: string; subtitle: string; online: string;
    placeholder: string; sendBtn: string;
    chips: string[];
    sources: string; confidence: string; lowConfidence: string;
    disclaimer: string; clearChat: string;
    contentTitle: string; contentDesc: string;
    tabs: { chat: string; content: string };
  };

  /** Booking */
  booking: {
    title: string; subtitle: string;
    selectDate: string; selectTime: string; selectInstructor: string;
    duration: string; notes: string; notesPh: string;
    submit: string; submitting: string; success: string;
    cancelBtn: string; rescheduleBtn: string;
    upcomingSessions: string; pastSessions: string;
    noSessions: string; availableSlots: string;
  };

  /** Payments */
  payments: {
    title: string; subtitle: string;
    currentPlan: string; upgradePlan: string; manageBilling: string;
    invoices: string; paymentMethod: string;
    successTitle: string; successDesc: string; successBtn: string;
    cancelTitle: string; cancelDesc: string; cancelBtn: string;
    amount: string; date: string; status: string; invoice: string;
  };

  /** Guardian */
  guardian: {
    title: string; subtitle: string;
    childrenLabel: string; addChild: string;
    progressLabel: string; attendanceLabel: string; gradesLabel: string;
    messagesLabel: string; reportLabel: string; noChildren: string;
  };

  /** Learning plans */
  learningPlans: {
    title: string; subtitle: string;
    createPlan: string; myPlans: string; recommended: string;
    duration: string; modules: string; startPlan: string;
    progress: string; completed: string; noPlans: string;
  };

  /** Instructor hub */
  instructor: {
    title: string; subtitle: string;
    analytics: string; courseBuilder: string; earnings: string;
    insights: string; aiStudio: string; aiQueue: string;
    volunteer: string;
    studentsLabel: string; coursesLabel: string; revenueLabel: string;
    ratingLabel: string;
  };

  /** Admin hub */
  admin: {
    title: string; subtitle: string;
    users: string; content: string; security: string; payments: string;
    reports: string; settings: string; monitoring: string;
    email: string; sso: string; lti: string; connectors: string;
    departments: string; automation: string; aiAgents: string;
    approvals: string; volunteer: string; alarms: string;
    observability: string; proctoring: string; tools: string;
    totalUsers: string; activeToday: string; revenue: string; uptime: string;
  };

  /** Errors */
  errors: {
    notFoundTitle: string; notFoundDesc: string;
    notFoundHome: string; notFoundCatalog: string;
    serverError: string; unauthorized: string;
    forbidden: string; networkError: string;
  };

  /** Roadmap */
  roadmap: {
    title: string; subtitle: string;
    milestones: string; upcoming: string; completed: string;
    inProgress: string; noMilestones: string;
  };

  /** Peer review */
  peerReview: {
    title: string; subtitle: string;
    submitWork: string; reviewPeers: string; myReviews: string;
    criteria: string; score: string; feedback: string;
    feedbackPh: string; submitReview: string; noReviews: string;
  };

  /** Language lab */
  languageLab: {
    title: string; subtitle: string;
    practiceBtn: string; vocabulary: string; grammar: string;
    listening: string; speaking: string; writing: string;
    levelBeginner: string; levelIntermediate: string; levelAdvanced: string;
    streak: string; xpEarned: string;
  };

  /** Math lab */
  mathLab: {
    title: string; subtitle: string;
    calculate: string; graph: string; matrix: string; statistics: string;
    expression: string; expressionPh: string; solveBtn: string; result: string;
    history: string; noHistory: string;
  };

  /** Adaptive quiz */
  adaptiveQuiz: {
    title: string; subtitle: string;
    startBtn: string; continueBtn: string; nextBtn: string;
    questionLabel: string; difficulty: string; submitAnswer: string;
    correctAnswer: string; wrongAnswer: string; explanation: string;
    quizComplete: string; yourScore: string; retryBtn: string;
    selectCourse: string; selectDifficulty: string; questionsCount: string;
  };

  /** Analytics hub */
  analytics: {
    title: string; subtitle: string;
    liveData: string; lastUpdated: string; previousPeriod: string;
    totalEnrollments: string; completionRate: string; totalRevenue: string;
    activeUsers: string; npsScore: string; avgSession: string;
    enrollmentTrend: string; completionTrend: string;
    dailyRevenue: string; dailyRevenueDesc: string;
    userActivity: string; userActivityDesc: string;
    topCourses: string; categoryDist: string;
    retention: string; retentionDesc: string;
    cohortLabel: string; weekLabel: string;
    courseTitle: string; enrollments: string; completions: string; revenue: string;
    demoData: string; minutesSuffix: string;
    day7: string; day30: string; day90: string;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// TURKISH  🇹🇷
// ─────────────────────────────────────────────────────────────────────────────
const tr: I18nStrings = {
  common: {
    save: "Kaydet", cancel: "İptal", delete: "Sil", edit: "Düzenle", add: "Ekle",
    search: "Ara", filter: "Filtrele", loading: "Yükleniyor...", error: "Hata",
    success: "Başarılı", confirm: "Onayla", close: "Kapat", back: "Geri",
    next: "İleri", previous: "Önceki", refresh: "Yenile", submit: "Gönder",
    reset: "Sıfırla", download: "İndir", upload: "Yükle", copy: "Kopyala",
    copied: "Kopyalandı", send: "Gönder", view: "Görüntüle", create: "Oluştur",
    update: "Güncelle", remove: "Kaldır", enable: "Etkinleştir", disable: "Devre dışı",
    all: "Tümü", none: "Hiçbiri", yes: "Evet", no: "Hayır", ok: "Tamam",
    retry: "Tekrar dene", noData: "Veri bulunamadı", noResults: "Sonuç yok",
    demoMode: "Demo modu", loginRequired: "Giriş yapmanız gerekiyor",
  },
  roles: {
    admin: "Yönetici", headInstructor: "Baş Eğitmen",
    instructor: "Eğitmen", student: "Öğrenci", guardian: "Veli",
  },
  nav: {
    brandSub: "Global Öğrenme Ağı", login: "Giriş", logout: "Çıkış",
    roleLabel: "Rol", langLabel: "Dil",
    search: "Ara (⌘K / Ctrl+K)", darkMode: "Koyu mod", lightMode: "Açık mod",
    aiMentor: "Ghost-Mentor AI", notifications: "Bildirimler",
    security: "Güvenlik alarmları", myCourses: "Kayıtlarım",
    profile: "Profil", back: "Geri", forward: "İleri", home: "Anasayfa",
    dashboard: "Yönetim Paneli", alarmsTip: "Güvenlik alarmı",
  },
  login: {
    heroPill: "Çok rollü erişim · SSO hazır",
    heroTitle1: "Tek ekrandan", heroTitle2: "tüm Atlasio rol girişleri",
    heroDesc: "Admin, eğitmen, öğrenci ve veli oturumları için birleşik giriş. MFA / token saklama uyumlu, zero-trust ilkesiyle tasarlandı.",
    formTitle: "Giriş", formSub: "Atlasio kimlik doğrulama merkezi",
    email: "E-posta", emailPh: "eposta@domain.com",
    password: "Parola", passwordPh: "En az 8 karakter",
    loading: "Giriş yapılıyor...", submit: "Giriş yap",
    noAccount: "Hesabınız yok mu?", register: "Kayıt ol", forgotPassword: "Şifremi unuttum",
    roleButtons: [
      { key: "admin", label: "Yönetici" }, { key: "instructor", label: "Eğitmen" },
      { key: "student", label: "Öğrenci" }, { key: "guardian", label: "Veli" },
    ],
  },
  register: {
    heroPill: "Ücretsiz başla", heroTitle: "Atlasio'ya hoş geldin.",
    heroDesc: "Binlerce kurs, canlı dersler ve kişiselleştirilmiş öğrenme yolculuğu seni bekliyor.",
    stat1Label: "Aktif öğrenci", stat1Value: "12K+",
    stat2Label: "Kurs sayısı", stat2Value: "380+",
    stat3Label: "Ortalama puan", stat3Value: "4.8★",
    formTitle: "Hesap oluştur", formSub: "Ücretsiz, dakikalar içinde hazır.",
    name: "Ad Soyad", namePh: "Adınız (isteğe bağlı)",
    email: "E-posta", emailPh: "eposta@domain.com",
    password: "Şifre", passwordPh: "En az 8 karakter",
    passwordHint: "En az 8 karakter",
    confirmPassword: "Şifre Tekrar", confirmPh: "Şifreyi tekrar girin",
    submit: "Kayıt ol", loading: "Hesap oluşturuluyor...",
    haveAccount: "Zaten hesabınız var mı?", loginLink: "Giriş yap",
    errorMismatch: "Şifreler eşleşmiyor", errorWeak: "Şifre çok zayıf",
  },
  auth: {
    forgotTitle: "Şifrenizi mi unuttunuz?", forgotSub: "Şifre sıfırla",
    forgotDesc: "E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.",
    forgotSubmit: "Sıfırlama bağlantısı gönder", forgotLoading: "Gönderiliyor...",
    forgotSuccess: "Bağlantı e-posta adresinize gönderildi.", forgotPill: "Şifrenizi sıfırlayın",
    resetTitle: "Yeni şifre belirle", resetSub: "Şifre sıfırlama",
    newPassword: "Yeni Şifre", newPasswordPh: "En az 8 karakter",
    resetSubmit: "Şifremi güncelle", resetLoading: "Güncelleniyor...", resetSuccess: "Şifreniz başarıyla güncellendi.",
    verifyTitle: "E-postanızı doğrulayın", verifySub: "Neredeyse bitti!",
    verifyDesc: "E-posta adresinize gönderilen bağlantıya tıklayarak hesabınızı doğrulayın.",
    verifySuccess: "E-posta adresiniz başarıyla doğrulandı.", verifyLoading: "Doğrulanıyor...",
    backToLogin: "Giriş sayfasına dön", rememberPassword: "Şifremi hatırladım",
  },
  home: {
    pill: "Atlasio 2026 • Global Learning Grid", activePill: "Şu an", activeCount: "öğrenci aktif",
    title1: "Dünya Standartlarında", title2: "Uzaktan Eğitim Platformu",
    slogan: "Bilgiyi Değere Dönüştüren Dijital Eğitim Platformu",
    desc: "Eğitmen, öğrenci ve kurumlar için tek ekrandan canlı ders, akıllı tahta, AI mentor ve sertifika deneyimi.",
    ctaStart: "Ücretsiz Başla", ctaDemo: "▶ Canlı Demo İzle", ctaCatalog: "Kurs Katalogu",
    trustedBy: "Güvenen kurumlar:", universities: "42 Üniversite",
    companies: "180 Şirket", countries: "64 Ülke",
    statsTitle: "Platform İstatistikleri", statsHeading: "Rakamlarla Atlasio",
    featuresTitle: "Özellikler", featuresHeading: "Bir Platformda Her Şey",
    featuresDesc: "Bireyden kuruma, öğrenciden eğiticiye — ihtiyacınız olan her çözüm tek çatı altında.",
    pricingTitle: "Fiyatlandırma", pricingHeading: "Size Uygun Plan",
    pricingDesc: "İhtiyacınıza göre ölçeklenen esnek planlar.",
    ctaHeading: "Öğrenmeye bugün başla", ctaDesc: "14 gün ücretsiz deneme. Kredi kartı gerekmez.",
    ctaRegister: "Hesap Oluştur", ctaBrowse: "Kurslara Göz At",
    testimonialTitle: "Kullanıcı Yorumları", testimonialHeading: "Binlerce memnun kullanıcı",
    freePlan: "Ücretsiz", proPlan: "Pro", enterprisePlan: "Kurumsal",
    monthSuffix: "/ay", customPrice: "Özel fiyat",
    planCtaFree: "Başla", planCtaPro: "Pro'ya Geç", planCtaEnterprise: "Bize Ulaş",
    planDescFree: "Başlamak için mükemmel", planDescPro: "Bireysel öğrenci ve eğitmenler için",
    planDescEnterprise: "Şirket ve üniversiteler için", highlighted: "En Popüler",
  },
  dashboard: {
    deniedTitle: "Bu panel yalnızca yönetici ve baş eğitmen içindir.",
    deniedDesc: (role) => `Seçili rol: ${role}. Rolünü üst barda değiştirerek erişebilirsin.`,
    welcomeBack: "Tekrar hoş geldiniz",
    quickActions: "Hızlı Eylemler", recentActivity: "Son Aktiviteler",
    upcomingLive: "Yaklaşan Canlı Dersler", myMaterials: "Materyallerim",
    uploadAssignment: "Ödev Yükle", pendingApprovals: "Bekleyen Onaylar",
  },
  courses: {
    catalogTitle: "Kurs Kataloğu", catalogDesc: "Profesyonel kurslar ve sertifika programları",
    searchPh: "Kurs veya eğitmen ara...", filterAll: "Tümü", filterFree: "Ücretsiz", filterPremium: "Premium",
    sortNewest: "En Yeni", sortOldest: "En Eski", sortPopular: "En Popüler", sortRating: "En Yüksek Puan",
    enrolled: "Kayıtlı", enroll: "Kayıt Ol", continue: "Devam Et", preview: "Önizle",
    free: "Ücretsiz", duration: "Süre", lessons: "Ders", students: "Öğrenci",
    rating: "Puan", instructor: "Eğitmen", level: "Seviye", certificate: "Sertifika",
    noCoursesFound: "Kurs bulunamadı", loadMore: "Daha fazla yükle",
    detailOverview: "Genel Bakış", detailCurriculum: "Müfredat",
    detailInstructor: "Eğitmen", detailReviews: "Yorumlar", detailEnroll: "Kursa Kayıt Ol",
    myCoursesContinue: "Devam Eden", myCoursesCompleted: "Tamamlanan", myCoursesAll: "Tümü",
    skillProfile: "Beceri Profilim",
  },
  live: {
    title: "Canlı Dersler", subtitle: "Anlık ve programlı canlı oturumlar",
    statusRunning: "CANLI", statusScheduled: "Planlandı", statusEnded: "Sona Erdi",
    joinBtn: "Derse Katıl", scheduleBtn: "Planla", endedLabel: "Sona erdi",
    noSessions: "Aktif oturum bulunamadı", demoNote: "Demo verileri gösteriliyor",
    participantsLabel: "Katılımcı", durationLabel: "Süre",
  },
  whiteboard: {
    labels: {
      actionsTitle: "Hızlı Eylemler",
      quickActions: {
        pdf: "PDF Yükle", presentation: "Sunum Ekle", shareScreen: "Ekran Paylaş",
        cameraOn: "Kamera", cameraOff: "Kamera Kapat", quiz: "Quiz Yayınla", downloadPng: "PNG İndir",
      },
      viewRole: { instructor: "Eğitmen görünümü", student: "Öğrenci görünümü" },
      background: "Zemin", thickness: "Kalınlık", color: "Renk",
      pages: "Sayfa", newPage: "Yeni Sayfa", undo: "Geri Al", redo: "İleri Al",
      clear: "Temizle", close: "Kapat", privateMsg: "Özel Mesaj",
      privateTo: "Öğrenci", noMsg: "Mesaj yok.", send: "Gönder",
    },
  },
  profile: {
    title: "Profilim", subtitle: "Hesap bilgilerinizi yönetin",
    personalInfo: "Kişisel Bilgiler", security: "Güvenlik", preferences: "Tercihler",
    displayName: "Görünen Ad", displayNamePh: "Adınız",
    emailLabel: "E-posta", currentPassword: "Mevcut Şifre", newPassword: "Yeni Şifre",
    changePhoto: "Fotoğrafı Değiştir", saveChanges: "Değişiklikleri Kaydet",
    saving: "Kaydediliyor...", successSaved: "Başarıyla kaydedildi", errorSave: "Kaydetme başarısız",
    language: "Dil", theme: "Tema", notifications: "Bildirimler",
    darkTheme: "Koyu", lightTheme: "Açık", systemTheme: "Sistem",
  },
  notifications: {
    title: "Bildirimler", subtitle: "Tüm sistem bildirimleri",
    markAllRead: "Tümünü okundu işaretle", clearAll: "Tümünü temizle",
    noNotifications: "Bildirim bulunmuyor",
    filterAll: "Tümü", filterUnread: "Okunmadı", filterSystem: "Sistem",
    typeLesson: "Ders", typeCertificate: "Sertifika", typeAlarm: "Alarm", typeSystem: "Sistem",
  },
  leaderboard: {
    title: "Liderlik Tablosu", subtitle: "Öğrenme yarışmasında öne çık",
    rankLabel: "Sıra", studentLabel: "Öğrenci", xpLabel: "XP",
    badgesLabel: "Rozet", streakLabel: "Seri", completedLabel: "Tamamlanan",
    filterWeek: "Bu Hafta", filterMonth: "Bu Ay", filterAll: "Tüm Zamanlar",
    yourRank: "Sıralamanız", topPerformers: "En İyi Performanslar",
  },
  progress: {
    title: "İlerleme Durumum", subtitle: "Öğrenme yolculuğunuzu takip edin",
    overallProgress: "Genel İlerleme", coursesInProgress: "Devam Eden Kurslar",
    completedCourses: "Tamamlanan Kurslar", totalXP: "Toplam XP",
    currentStreak: "Mevcut Seri", weeklyGoal: "Haftalık Hedef",
    achievements: "Başarılar", badges: "Rozetler",
    noProgress: "Henüz ilerleme yok", startLearning: "Öğrenmeye Başla",
  },
  reportCards: {
    title: "Karne & Raporlar", subtitle: "Dönemsel akademik değerlendirmeler",
    period: "Dönem", overallGrade: "Genel Not", attendance: "Devam",
    performance: "Performans", comments: "Yorumlar", downloadPDF: "PDF İndir",
    noReports: "Rapor bulunamadı",
  },
  certificates: {
    title: "Sertifikalarım", subtitle: "Dijital yeterlilik belgelerim",
    issuedOn: "Veriliş tarihi", expiresOn: "Geçerlilik", verifyBtn: "Doğrula",
    downloadBtn: "İndir", shareBtn: "Paylaş", renewBtn: "Yenile",
    noCertificates: "Sertifika bulunamadı",
    verifyTitle: "Sertifika Doğrulama", verifyDesc: "Sertifika kodunu girerek doğrulayın",
    verifySubmit: "Sertifikayı Doğrula", verifyPh: "Sertifika kodu",
    verifySuccess: "Sertifika geçerli", verifyFail: "Sertifika geçersiz veya bulunamadı",
  },
  exams: {
    title: "Sınavlar", subtitle: "Sınav ve quiz geçmişiniz",
    startExam: "Sınava Başla", reviewExam: "İncele", retakeExam: "Tekrar Al",
    timeLeft: "Kalan Süre", questionsCount: "Soru sayısı", passScore: "Geçme puanı",
    status: { pending: "Bekliyor", passed: "Geçti", failed: "Kaldı", inProgress: "Devam Ediyor" },
    resultsTitle: "Sınav Sonuçları", yourScore: "Puanınız", correctAnswers: "Doğru Cevaplar",
    adaptiveTitle: "Uyarlamalı Sınav", adaptiveDesc: "Seviyenize göre otomatik ayarlanan sorular",
    difficulty: { easy: "Kolay", medium: "Orta", hard: "Zor" },
  },
  ai: {
    title: "AI Mentor", subtitle: "Kişiselleştirilmiş öğrenme desteği, anında hazır.",
    online: "Çevrimiçi", placeholder: "Bir soru sor… (Shift+Enter yeni satır, Enter gönder)",
    sendBtn: "Sor",
    chips: ["Bu konuyu açıkla", "Örnek ver", "Sınav sorusu yaz", "Özet çıkar", "Ne öğrendim?"],
    sources: "Kaynaklar", confidence: "Güven skoru", lowConfidence: "Düşük güven — lütfen doğrulayın",
    disclaimer: "Ghost Mentor yapay zeka desteklidir — kritik kararlar için lütfen eğitmeninize danışın.",
    clearChat: "Sohbeti temizle",
    contentTitle: "İçerik İşleyici", contentDesc: "PDF, sunum ve belgeleri analiz et",
    tabs: { chat: "Mentor Chat", content: "İçerik İşleyici" },
  },
  booking: {
    title: "Ders Rezervasyonu", subtitle: "Öğretmeninizle birebir seans planlayın",
    selectDate: "Tarih Seçin", selectTime: "Saat Seçin", selectInstructor: "Eğitmen Seçin",
    duration: "Süre", notes: "Notlar", notesPh: "Seans notlarınızı girin...",
    submit: "Rezervasyon Yap", submitting: "Rezervasyon yapılıyor...",
    success: "Rezervasyonunuz başarıyla oluşturuldu",
    cancelBtn: "İptal Et", rescheduleBtn: "Yeniden Planla",
    upcomingSessions: "Yaklaşan Seanslar", pastSessions: "Geçmiş Seanslar",
    noSessions: "Seans bulunamadı", availableSlots: "Müsait saatler",
  },
  payments: {
    title: "Ödemeler", subtitle: "Abonelik ve ödeme geçmişi",
    currentPlan: "Mevcut Plan", upgradePlan: "Planı Yükselt", manageBilling: "Faturayı Yönet",
    invoices: "Faturalar", paymentMethod: "Ödeme Yöntemi",
    successTitle: "Ödeme Başarılı!", successDesc: "Planınız aktifleştirildi.",
    successBtn: "Kurslarıma Git",
    cancelTitle: "Ödeme İptal Edildi", cancelDesc: "Ödeme işlemi iptal edildi.",
    cancelBtn: "Tekrar Dene",
    amount: "Tutar", date: "Tarih", status: "Durum", invoice: "Fatura",
  },
  guardian: {
    title: "Veli Paneli", subtitle: "Çocuğunuzun öğrenim takibi",
    childrenLabel: "Öğrencilerim", addChild: "Öğrenci Ekle",
    progressLabel: "İlerleme", attendanceLabel: "Devam", gradesLabel: "Notlar",
    messagesLabel: "Mesajlar", reportLabel: "Rapor Al", noChildren: "Kayıtlı öğrenci bulunamadı",
  },
  learningPlans: {
    title: "Öğrenme Planları", subtitle: "Kişiselleştirilmiş eğitim yollarınız",
    createPlan: "Plan Oluştur", myPlans: "Planlarım", recommended: "Önerilen",
    duration: "Süre", modules: "Modül", startPlan: "Plana Başla",
    progress: "İlerleme", completed: "Tamamlandı", noPlans: "Plan bulunamadı",
  },
  instructor: {
    title: "Eğitmen Merkezi", subtitle: "Öğretme deneyiminizi yönetin",
    analytics: "Analitik", courseBuilder: "Kurs Oluşturucu", earnings: "Kazançlarım",
    insights: "Öğrenci Analizi", aiStudio: "AI Stüdyo", aiQueue: "AI Kuyruğu",
    volunteer: "Gönüllü Program",
    studentsLabel: "Öğrenciler", coursesLabel: "Kurslar",
    revenueLabel: "Gelir", ratingLabel: "Puan",
  },
  admin: {
    title: "Yönetim Paneli", subtitle: "Platform yönetimi ve izleme",
    users: "Kullanıcılar", content: "İçerik", security: "Güvenlik", payments: "Ödemeler",
    reports: "Raporlar", settings: "Ayarlar", monitoring: "İzleme",
    email: "E-posta", sso: "SSO", lti: "LTI", connectors: "Entegrasyonlar",
    departments: "Departmanlar", automation: "Otomasyon", aiAgents: "AI Ajanlar",
    approvals: "Onaylar", volunteer: "Gönüllü", alarms: "Alarmlar",
    observability: "Gözlemlenebilirlik", proctoring: "Sınav Gözetimi", tools: "Araçlar",
    totalUsers: "Toplam Kullanıcı", activeToday: "Bugün Aktif",
    revenue: "Gelir", uptime: "Çalışma Süresi",
  },
  errors: {
    notFoundTitle: "Sayfa bulunamadı",
    notFoundDesc: "Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.",
    notFoundHome: "Ana sayfa", notFoundCatalog: "Kurslara göz at",
    serverError: "Sunucu hatası oluştu. Lütfen tekrar deneyin.",
    unauthorized: "Bu sayfayı görüntüleme yetkiniz yok.",
    forbidden: "Erişim engellendi.",
    networkError: "Bağlantı hatası. İnternet bağlantınızı kontrol edin.",
  },
  roadmap: {
    title: "Öğrenme Haritam", subtitle: "Kariyer yolculuğunuzu planlayın",
    milestones: "Kilometre Taşları", upcoming: "Yaklaşan", completed: "Tamamlandı",
    inProgress: "Devam Ediyor", noMilestones: "Kilometre taşı bulunamadı",
  },
  peerReview: {
    title: "Akran Değerlendirmesi", subtitle: "Birlikte öğrenin, birlikte değerlendirin",
    submitWork: "Çalışma Gönder", reviewPeers: "Akranları Değerlendir", myReviews: "Değerlendirmelerim",
    criteria: "Kriter", score: "Puan", feedback: "Geri Bildirim",
    feedbackPh: "Değerlendirmenizi yazın...", submitReview: "Değerlendirmeyi Gönder",
    noReviews: "Değerlendirme bulunamadı",
  },
  languageLab: {
    title: "Dil Laboratuvarı", subtitle: "Yabancı dil pratiği yapın",
    practiceBtn: "Pratik Yap", vocabulary: "Kelime", grammar: "Gramer",
    listening: "Dinleme", speaking: "Konuşma", writing: "Yazma",
    levelBeginner: "Başlangıç", levelIntermediate: "Orta", levelAdvanced: "İleri",
    streak: "Seri", xpEarned: "Kazanılan XP",
  },
  mathLab: {
    title: "Matematik Laboratuvarı", subtitle: "Hesap ve grafik araçları",
    calculate: "Hesapla", graph: "Grafik", matrix: "Matris", statistics: "İstatistik",
    expression: "İfade", expressionPh: "Matematiksel ifade girin...",
    solveBtn: "Çöz", result: "Sonuç", history: "Geçmiş", noHistory: "Geçmiş yok",
  },
  adaptiveQuiz: {
    title: "Uyarlamalı Quiz", subtitle: "Seviyenize göre ayarlanan sorular",
    startBtn: "Sınava Başla", continueBtn: "Devam Et", nextBtn: "Sonraki",
    questionLabel: "Soru", difficulty: "Zorluk", submitAnswer: "Cevapla",
    correctAnswer: "Doğru!", wrongAnswer: "Yanlış", explanation: "Açıklama",
    quizComplete: "Quiz Tamamlandı!", yourScore: "Puanınız", retryBtn: "Tekrar Dene",
    selectCourse: "Kurs seçin", selectDifficulty: "Zorluk seçin", questionsCount: "Soru sayısı",
  },
  analytics: {
    title: "Analitik Merkezi", subtitle: "Platform performansını gerçek zamanlı izle",
    liveData: "Canlı Veri", lastUpdated: "Son güncelleme", previousPeriod: "önceki dönem",
    totalEnrollments: "Toplam Kayıt", completionRate: "Tamamlanma Oranı", totalRevenue: "Toplam Gelir",
    activeUsers: "Aktif Kullanıcı", npsScore: "NPS Skoru", avgSession: "Ort. Seans Süresi",
    enrollmentTrend: "Kayıt & Tamamlanma Trendi", completionTrend: "Zaman içindeki öğrenci aktivitesi",
    dailyRevenue: "Günlük Gelir", dailyRevenueDesc: "₺ cinsinden dönemsel gelir dağılımı",
    userActivity: "Aktif Kullanıcılar", userActivityDesc: "Günlük benzersiz oturum sayısı",
    topCourses: "En İyi Kurslar", categoryDist: "Kategori Dağılımı",
    retention: "Kohort Tutma Analizi", retentionDesc: "Haftalık öğrenci tutma oranı",
    cohortLabel: "Kohort", weekLabel: "Hf.",
    courseTitle: "Kurs Adı", enrollments: "Kayıt", completions: "Tamamlanma", revenue: "Gelir",
    demoData: "Demo verisi gösteriliyor", minutesSuffix: "dk",
    day7: "7 Gün", day30: "30 Gün", day90: "90 Gün",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ENGLISH  🇬🇧
// ─────────────────────────────────────────────────────────────────────────────
const en: I18nStrings = {
  common: {
    save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", add: "Add",
    search: "Search", filter: "Filter", loading: "Loading...", error: "Error",
    success: "Success", confirm: "Confirm", close: "Close", back: "Back",
    next: "Next", previous: "Previous", refresh: "Refresh", submit: "Submit",
    reset: "Reset", download: "Download", upload: "Upload", copy: "Copy",
    copied: "Copied", send: "Send", view: "View", create: "Create",
    update: "Update", remove: "Remove", enable: "Enable", disable: "Disable",
    all: "All", none: "None", yes: "Yes", no: "No", ok: "OK",
    retry: "Retry", noData: "No data found", noResults: "No results",
    demoMode: "Demo mode", loginRequired: "Login required",
  },
  roles: {
    admin: "Administrator", headInstructor: "Head Instructor",
    instructor: "Instructor", student: "Student", guardian: "Guardian",
  },
  nav: {
    brandSub: "Global Learning Grid", login: "Sign in", logout: "Sign out",
    roleLabel: "Role", langLabel: "Lang",
    search: "Search (⌘K / Ctrl+K)", darkMode: "Dark mode", lightMode: "Light mode",
    aiMentor: "Ghost-Mentor AI", notifications: "Notifications",
    security: "Security alerts", myCourses: "My Courses",
    profile: "Profile", back: "Back", forward: "Forward", home: "Home",
    dashboard: "Admin Dashboard", alarmsTip: "Security alarm",
  },
  login: {
    heroPill: "Multi-role access · SSO ready",
    heroTitle1: "One screen for", heroTitle2: "all Atlasio roles",
    heroDesc: "Unified login for admin, instructor, student and guardian. MFA-ready, zero-trust friendly.",
    formTitle: "Sign in", formSub: "Atlasio identity hub",
    email: "Email", emailPh: "email@domain.com",
    password: "Password", passwordPh: "At least 8 characters",
    loading: "Signing in...", submit: "Sign in",
    noAccount: "Don't have an account?", register: "Sign up", forgotPassword: "Forgot password",
    roleButtons: [
      { key: "admin", label: "Admin" }, { key: "instructor", label: "Instructor" },
      { key: "student", label: "Student" }, { key: "guardian", label: "Guardian" },
    ],
  },
  register: {
    heroPill: "Start for free", heroTitle: "Welcome to Atlasio.",
    heroDesc: "Thousands of courses, live classes and a personalized learning journey await you.",
    stat1Label: "Active students", stat1Value: "12K+",
    stat2Label: "Courses", stat2Value: "380+",
    stat3Label: "Average rating", stat3Value: "4.8★",
    formTitle: "Create account", formSub: "Free, ready in minutes.",
    name: "Full Name", namePh: "Your name (optional)",
    email: "Email", emailPh: "email@domain.com",
    password: "Password", passwordPh: "At least 8 characters",
    passwordHint: "At least 8 characters",
    confirmPassword: "Confirm Password", confirmPh: "Re-enter password",
    submit: "Sign up", loading: "Creating account...",
    haveAccount: "Already have an account?", loginLink: "Sign in",
    errorMismatch: "Passwords don't match", errorWeak: "Password too weak",
  },
  auth: {
    forgotTitle: "Forgot your password?", forgotSub: "Reset password",
    forgotDesc: "Enter your email address and we'll send you a reset link.",
    forgotSubmit: "Send reset link", forgotLoading: "Sending...",
    forgotSuccess: "Link sent to your email address.", forgotPill: "Reset your password",
    resetTitle: "Set new password", resetSub: "Password reset",
    newPassword: "New Password", newPasswordPh: "At least 8 characters",
    resetSubmit: "Update password", resetLoading: "Updating...", resetSuccess: "Password updated successfully.",
    verifyTitle: "Verify your email", verifySub: "Almost done!",
    verifyDesc: "Click the link sent to your email address to verify your account.",
    verifySuccess: "Email address successfully verified.", verifyLoading: "Verifying...",
    backToLogin: "Back to login", rememberPassword: "I remember my password",
  },
  home: {
    pill: "Atlasio 2026 • Global Learning Grid", activePill: "Right now", activeCount: "students active",
    title1: "World-Class", title2: "Remote Learning Platform",
    slogan: "The Digital Education Platform That Turns Knowledge Into Value",
    desc: "Live classes, smart whiteboard, AI mentor and certificates — all in one screen for educators, students and institutions.",
    ctaStart: "Start for Free", ctaDemo: "▶ Watch Live Demo", ctaCatalog: "Course Catalog",
    trustedBy: "Trusted by:", universities: "42 Universities",
    companies: "180 Companies", countries: "64 Countries",
    statsTitle: "Platform Statistics", statsHeading: "Atlasio by the Numbers",
    featuresTitle: "Features", featuresHeading: "Everything in One Platform",
    featuresDesc: "From individual to enterprise — every tool you need under one roof.",
    pricingTitle: "Pricing", pricingHeading: "A Plan for Every Need",
    pricingDesc: "Flexible plans that scale with your requirements.",
    ctaHeading: "Start learning today", ctaDesc: "14-day free trial. No credit card required.",
    ctaRegister: "Create Account", ctaBrowse: "Browse Courses",
    testimonialTitle: "User Reviews", testimonialHeading: "Thousands of satisfied users",
    freePlan: "Free", proPlan: "Pro", enterprisePlan: "Enterprise",
    monthSuffix: "/mo", customPrice: "Custom pricing",
    planCtaFree: "Get Started", planCtaPro: "Go Pro", planCtaEnterprise: "Contact Us",
    planDescFree: "Perfect to get started", planDescPro: "For individual students and instructors",
    planDescEnterprise: "For companies and universities", highlighted: "Most Popular",
  },
  dashboard: {
    deniedTitle: "This panel is for admins and head instructors only.",
    deniedDesc: (role) => `Selected role: ${role}. Switch role from the top bar to access.`,
    welcomeBack: "Welcome back",
    quickActions: "Quick Actions", recentActivity: "Recent Activity",
    upcomingLive: "Upcoming Live Classes", myMaterials: "My Materials",
    uploadAssignment: "Upload Assignment", pendingApprovals: "Pending Approvals",
  },
  courses: {
    catalogTitle: "Course Catalog", catalogDesc: "Professional courses and certificate programs",
    searchPh: "Search courses or instructors...", filterAll: "All", filterFree: "Free", filterPremium: "Premium",
    sortNewest: "Newest", sortOldest: "Oldest", sortPopular: "Most Popular", sortRating: "Top Rated",
    enrolled: "Enrolled", enroll: "Enroll", continue: "Continue", preview: "Preview",
    free: "Free", duration: "Duration", lessons: "Lessons", students: "Students",
    rating: "Rating", instructor: "Instructor", level: "Level", certificate: "Certificate",
    noCoursesFound: "No courses found", loadMore: "Load more",
    detailOverview: "Overview", detailCurriculum: "Curriculum",
    detailInstructor: "Instructor", detailReviews: "Reviews", detailEnroll: "Enroll in Course",
    myCoursesContinue: "In Progress", myCoursesCompleted: "Completed", myCoursesAll: "All",
    skillProfile: "My Skill Profile",
  },
  live: {
    title: "Live Classes", subtitle: "Real-time and scheduled live sessions",
    statusRunning: "LIVE", statusScheduled: "Scheduled", statusEnded: "Ended",
    joinBtn: "Join Class", scheduleBtn: "Schedule", endedLabel: "Ended",
    noSessions: "No active sessions found", demoNote: "Showing demo data",
    participantsLabel: "Participants", durationLabel: "Duration",
  },
  whiteboard: {
    labels: {
      actionsTitle: "Quick Actions",
      quickActions: {
        pdf: "Upload PDF", presentation: "Add Deck", shareScreen: "Share Screen",
        cameraOn: "Camera", cameraOff: "Stop Camera", quiz: "Publish Quiz", downloadPng: "Export PNG",
      },
      viewRole: { instructor: "Instructor view", student: "Student view" },
      background: "Background", thickness: "Thickness", color: "Color",
      pages: "Page", newPage: "New Page", undo: "Undo", redo: "Redo",
      clear: "Clear", close: "Close", privateMsg: "Private Message",
      privateTo: "Student", noMsg: "No messages.", send: "Send",
    },
  },
  profile: {
    title: "My Profile", subtitle: "Manage your account information",
    personalInfo: "Personal Info", security: "Security", preferences: "Preferences",
    displayName: "Display Name", displayNamePh: "Your name",
    emailLabel: "Email", currentPassword: "Current Password", newPassword: "New Password",
    changePhoto: "Change Photo", saveChanges: "Save Changes",
    saving: "Saving...", successSaved: "Saved successfully", errorSave: "Failed to save",
    language: "Language", theme: "Theme", notifications: "Notifications",
    darkTheme: "Dark", lightTheme: "Light", systemTheme: "System",
  },
  notifications: {
    title: "Notifications", subtitle: "All system notifications",
    markAllRead: "Mark all as read", clearAll: "Clear all",
    noNotifications: "No notifications",
    filterAll: "All", filterUnread: "Unread", filterSystem: "System",
    typeLesson: "Lesson", typeCertificate: "Certificate", typeAlarm: "Alarm", typeSystem: "System",
  },
  leaderboard: {
    title: "Leaderboard", subtitle: "Rise to the top of the learning competition",
    rankLabel: "Rank", studentLabel: "Student", xpLabel: "XP",
    badgesLabel: "Badges", streakLabel: "Streak", completedLabel: "Completed",
    filterWeek: "This Week", filterMonth: "This Month", filterAll: "All Time",
    yourRank: "Your Rank", topPerformers: "Top Performers",
  },
  progress: {
    title: "My Progress", subtitle: "Track your learning journey",
    overallProgress: "Overall Progress", coursesInProgress: "Courses In Progress",
    completedCourses: "Completed Courses", totalXP: "Total XP",
    currentStreak: "Current Streak", weeklyGoal: "Weekly Goal",
    achievements: "Achievements", badges: "Badges",
    noProgress: "No progress yet", startLearning: "Start Learning",
  },
  reportCards: {
    title: "Report Cards", subtitle: "Periodic academic assessments",
    period: "Period", overallGrade: "Overall Grade", attendance: "Attendance",
    performance: "Performance", comments: "Comments", downloadPDF: "Download PDF",
    noReports: "No reports found",
  },
  certificates: {
    title: "My Certificates", subtitle: "My digital credentials",
    issuedOn: "Issued on", expiresOn: "Valid until", verifyBtn: "Verify",
    downloadBtn: "Download", shareBtn: "Share", renewBtn: "Renew",
    noCertificates: "No certificates found",
    verifyTitle: "Certificate Verification", verifyDesc: "Enter certificate code to verify",
    verifySubmit: "Verify Certificate", verifyPh: "Certificate code",
    verifySuccess: "Certificate is valid", verifyFail: "Certificate not found or invalid",
  },
  exams: {
    title: "Exams", subtitle: "Your exam and quiz history",
    startExam: "Start Exam", reviewExam: "Review", retakeExam: "Retake",
    timeLeft: "Time left", questionsCount: "Questions", passScore: "Pass score",
    status: { pending: "Pending", passed: "Passed", failed: "Failed", inProgress: "In Progress" },
    resultsTitle: "Exam Results", yourScore: "Your Score", correctAnswers: "Correct Answers",
    adaptiveTitle: "Adaptive Exam", adaptiveDesc: "Questions automatically adjusted to your level",
    difficulty: { easy: "Easy", medium: "Medium", hard: "Hard" },
  },
  ai: {
    title: "AI Mentor", subtitle: "Personalised learning support, instantly available.",
    online: "Online", placeholder: "Ask a question… (Shift+Enter new line, Enter to send)",
    sendBtn: "Ask",
    chips: ["Explain this topic", "Give an example", "Write exam question", "Summarise", "What did I learn?"],
    sources: "Sources", confidence: "Confidence score", lowConfidence: "Low confidence — please verify",
    disclaimer: "Ghost Mentor is AI-powered — for critical decisions please consult your instructor.",
    clearChat: "Clear chat",
    contentTitle: "Content Processor", contentDesc: "Analyse PDFs, presentations and documents",
    tabs: { chat: "Mentor Chat", content: "Content Processor" },
  },
  booking: {
    title: "Session Booking", subtitle: "Schedule one-on-one sessions with your instructor",
    selectDate: "Select Date", selectTime: "Select Time", selectInstructor: "Select Instructor",
    duration: "Duration", notes: "Notes", notesPh: "Enter session notes...",
    submit: "Book Session", submitting: "Booking...",
    success: "Session booked successfully",
    cancelBtn: "Cancel", rescheduleBtn: "Reschedule",
    upcomingSessions: "Upcoming Sessions", pastSessions: "Past Sessions",
    noSessions: "No sessions found", availableSlots: "Available slots",
  },
  payments: {
    title: "Payments", subtitle: "Subscription and payment history",
    currentPlan: "Current Plan", upgradePlan: "Upgrade Plan", manageBilling: "Manage Billing",
    invoices: "Invoices", paymentMethod: "Payment Method",
    successTitle: "Payment Successful!", successDesc: "Your plan has been activated.",
    successBtn: "Go to My Courses",
    cancelTitle: "Payment Cancelled", cancelDesc: "Payment process was cancelled.",
    cancelBtn: "Try Again",
    amount: "Amount", date: "Date", status: "Status", invoice: "Invoice",
  },
  guardian: {
    title: "Guardian Panel", subtitle: "Track your child's learning",
    childrenLabel: "My Students", addChild: "Add Student",
    progressLabel: "Progress", attendanceLabel: "Attendance", gradesLabel: "Grades",
    messagesLabel: "Messages", reportLabel: "Get Report", noChildren: "No registered students found",
  },
  learningPlans: {
    title: "Learning Plans", subtitle: "Your personalised learning paths",
    createPlan: "Create Plan", myPlans: "My Plans", recommended: "Recommended",
    duration: "Duration", modules: "Modules", startPlan: "Start Plan",
    progress: "Progress", completed: "Completed", noPlans: "No plans found",
  },
  instructor: {
    title: "Instructor Hub", subtitle: "Manage your teaching experience",
    analytics: "Analytics", courseBuilder: "Course Builder", earnings: "My Earnings",
    insights: "Student Insights", aiStudio: "AI Studio", aiQueue: "AI Queue",
    volunteer: "Volunteer Program",
    studentsLabel: "Students", coursesLabel: "Courses",
    revenueLabel: "Revenue", ratingLabel: "Rating",
  },
  admin: {
    title: "Admin Dashboard", subtitle: "Platform management and monitoring",
    users: "Users", content: "Content", security: "Security", payments: "Payments",
    reports: "Reports", settings: "Settings", monitoring: "Monitoring",
    email: "Email", sso: "SSO", lti: "LTI", connectors: "Connectors",
    departments: "Departments", automation: "Automation", aiAgents: "AI Agents",
    approvals: "Approvals", volunteer: "Volunteer", alarms: "Alarms",
    observability: "Observability", proctoring: "Proctoring", tools: "Tools",
    totalUsers: "Total Users", activeToday: "Active Today",
    revenue: "Revenue", uptime: "Uptime",
  },
  errors: {
    notFoundTitle: "Page not found",
    notFoundDesc: "The page you're looking for may have moved, been deleted, or never existed.",
    notFoundHome: "Home page", notFoundCatalog: "Browse courses",
    serverError: "A server error occurred. Please try again.",
    unauthorized: "You don't have permission to view this page.",
    forbidden: "Access denied.",
    networkError: "Connection error. Check your internet connection.",
  },
  roadmap: {
    title: "My Learning Roadmap", subtitle: "Plan your career journey",
    milestones: "Milestones", upcoming: "Upcoming", completed: "Completed",
    inProgress: "In Progress", noMilestones: "No milestones found",
  },
  peerReview: {
    title: "Peer Review", subtitle: "Learn together, evaluate together",
    submitWork: "Submit Work", reviewPeers: "Review Peers", myReviews: "My Reviews",
    criteria: "Criteria", score: "Score", feedback: "Feedback",
    feedbackPh: "Write your evaluation...", submitReview: "Submit Review",
    noReviews: "No reviews found",
  },
  languageLab: {
    title: "Language Lab", subtitle: "Practice your foreign language",
    practiceBtn: "Practice", vocabulary: "Vocabulary", grammar: "Grammar",
    listening: "Listening", speaking: "Speaking", writing: "Writing",
    levelBeginner: "Beginner", levelIntermediate: "Intermediate", levelAdvanced: "Advanced",
    streak: "Streak", xpEarned: "XP Earned",
  },
  mathLab: {
    title: "Math Lab", subtitle: "Calculation and graphing tools",
    calculate: "Calculate", graph: "Graph", matrix: "Matrix", statistics: "Statistics",
    expression: "Expression", expressionPh: "Enter mathematical expression...",
    solveBtn: "Solve", result: "Result", history: "History", noHistory: "No history",
  },
  adaptiveQuiz: {
    title: "Adaptive Quiz", subtitle: "Questions adjusted to your level",
    startBtn: "Start Exam", continueBtn: "Continue", nextBtn: "Next",
    questionLabel: "Question", difficulty: "Difficulty", submitAnswer: "Submit Answer",
    correctAnswer: "Correct!", wrongAnswer: "Incorrect", explanation: "Explanation",
    quizComplete: "Quiz Complete!", yourScore: "Your Score", retryBtn: "Try Again",
    selectCourse: "Select course", selectDifficulty: "Select difficulty", questionsCount: "Number of questions",
  },
  analytics: {
    title: "Analytics Hub", subtitle: "Monitor platform performance in real time",
    liveData: "Live Data", lastUpdated: "Last updated", previousPeriod: "vs previous period",
    totalEnrollments: "Total Enrollments", completionRate: "Completion Rate", totalRevenue: "Total Revenue",
    activeUsers: "Active Users", npsScore: "NPS Score", avgSession: "Avg. Session Time",
    enrollmentTrend: "Enrollment & Completion Trend", completionTrend: "Student activity over time",
    dailyRevenue: "Daily Revenue", dailyRevenueDesc: "Period revenue distribution",
    userActivity: "Active Users", userActivityDesc: "Daily unique sessions",
    topCourses: "Top Courses", categoryDist: "Category Breakdown",
    retention: "Cohort Retention Analysis", retentionDesc: "Weekly student retention rate",
    cohortLabel: "Cohort", weekLabel: "Wk.",
    courseTitle: "Course Name", enrollments: "Enrollments", completions: "Completions", revenue: "Revenue",
    demoData: "Showing demo data", minutesSuffix: "min",
    day7: "7 Days", day30: "30 Days", day90: "90 Days",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GERMAN  🇩🇪
// ─────────────────────────────────────────────────────────────────────────────
const de: I18nStrings = {
  common: {
    save: "Speichern", cancel: "Abbrechen", delete: "Löschen", edit: "Bearbeiten", add: "Hinzufügen",
    search: "Suchen", filter: "Filtern", loading: "Wird geladen...", error: "Fehler",
    success: "Erfolgreich", confirm: "Bestätigen", close: "Schließen", back: "Zurück",
    next: "Weiter", previous: "Vorherige", refresh: "Aktualisieren", submit: "Absenden",
    reset: "Zurücksetzen", download: "Herunterladen", upload: "Hochladen", copy: "Kopieren",
    copied: "Kopiert", send: "Senden", view: "Anzeigen", create: "Erstellen",
    update: "Aktualisieren", remove: "Entfernen", enable: "Aktivieren", disable: "Deaktivieren",
    all: "Alle", none: "Keine", yes: "Ja", no: "Nein", ok: "OK",
    retry: "Erneut versuchen", noData: "Keine Daten gefunden", noResults: "Keine Ergebnisse",
    demoMode: "Demo-Modus", loginRequired: "Anmeldung erforderlich",
  },
  roles: {
    admin: "Administrator", headInstructor: "Leitender Dozent",
    instructor: "Dozent", student: "Student", guardian: "Erziehungsberechtigter",
  },
  nav: {
    brandSub: "Globales Lernnetz", login: "Anmelden", logout: "Abmelden",
    roleLabel: "Rolle", langLabel: "Sprache",
    search: "Suchen (⌘K / Ctrl+K)", darkMode: "Dunkelmodus", lightMode: "Hellmodus",
    aiMentor: "Ghost-Mentor KI", notifications: "Benachrichtigungen",
    security: "Sicherheitsalarme", myCourses: "Meine Kurse",
    profile: "Profil", back: "Zurück", forward: "Vorwärts", home: "Startseite",
    dashboard: "Admin-Dashboard", alarmsTip: "Sicherheitsalarm",
  },
  login: {
    heroPill: "Multi-Rollen-Zugriff · SSO bereit",
    heroTitle1: "Ein Bildschirm für", heroTitle2: "alle Atlasio-Rollen",
    heroDesc: "Einheitlicher Login für Admin, Dozent, Schüler und Eltern. MFA-tauglich, Zero-Trust-freundlich.",
    formTitle: "Anmelden", formSub: "Atlasio Identity Hub",
    email: "E-Mail", emailPh: "email@domain.com",
    password: "Passwort", passwordPh: "Mindestens 8 Zeichen",
    loading: "Anmeldung läuft...", submit: "Anmelden",
    noAccount: "Noch kein Konto?", register: "Registrieren", forgotPassword: "Passwort vergessen",
    roleButtons: [
      { key: "admin", label: "Admin" }, { key: "instructor", label: "Dozent" },
      { key: "student", label: "Student" }, { key: "guardian", label: "Eltern" },
    ],
  },
  register: {
    heroPill: "Kostenlos starten", heroTitle: "Willkommen bei Atlasio.",
    heroDesc: "Tausende Kurse, Live-Unterricht und eine personalisierte Lernreise erwarten dich.",
    stat1Label: "Aktive Studenten", stat1Value: "12K+",
    stat2Label: "Kurse", stat2Value: "380+",
    stat3Label: "Durchschnittliche Bewertung", stat3Value: "4,8★",
    formTitle: "Konto erstellen", formSub: "Kostenlos, in Minuten bereit.",
    name: "Vollständiger Name", namePh: "Ihr Name (optional)",
    email: "E-Mail", emailPh: "email@domain.com",
    password: "Passwort", passwordPh: "Mindestens 8 Zeichen",
    passwordHint: "Mindestens 8 Zeichen",
    confirmPassword: "Passwort bestätigen", confirmPh: "Passwort wiederholen",
    submit: "Registrieren", loading: "Konto wird erstellt...",
    haveAccount: "Bereits ein Konto?", loginLink: "Anmelden",
    errorMismatch: "Passwörter stimmen nicht überein", errorWeak: "Passwort zu schwach",
  },
  auth: {
    forgotTitle: "Passwort vergessen?", forgotSub: "Passwort zurücksetzen",
    forgotDesc: "Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen.",
    forgotSubmit: "Reset-Link senden", forgotLoading: "Wird gesendet...",
    forgotSuccess: "Link wurde an Ihre E-Mail-Adresse gesendet.", forgotPill: "Passwort zurücksetzen",
    resetTitle: "Neues Passwort festlegen", resetSub: "Passwort zurücksetzen",
    newPassword: "Neues Passwort", newPasswordPh: "Mindestens 8 Zeichen",
    resetSubmit: "Passwort aktualisieren", resetLoading: "Wird aktualisiert...",
    resetSuccess: "Passwort erfolgreich aktualisiert.",
    verifyTitle: "E-Mail verifizieren", verifySub: "Fast geschafft!",
    verifyDesc: "Klicken Sie auf den Link in Ihrer E-Mail, um Ihr Konto zu bestätigen.",
    verifySuccess: "E-Mail-Adresse erfolgreich verifiziert.", verifyLoading: "Wird verifiziert...",
    backToLogin: "Zurück zur Anmeldung", rememberPassword: "Ich erinnere mich an mein Passwort",
  },
  home: {
    pill: "Atlasio 2026 • Globales Lernnetz", activePill: "Gerade jetzt", activeCount: "Schüler aktiv",
    title1: "Weltklasse", title2: "Fernlernplattform",
    slogan: "Die digitale Bildungsplattform, die Wissen in Wert verwandelt",
    desc: "Live-Unterricht, smartes Whiteboard, KI-Mentor und Zertifikate — alles auf einem Bildschirm.",
    ctaStart: "Kostenlos starten", ctaDemo: "▶ Live-Demo ansehen", ctaCatalog: "Kurskatalog",
    trustedBy: "Vertraut von:", universities: "42 Universitäten",
    companies: "180 Unternehmen", countries: "64 Ländern",
    statsTitle: "Plattform-Statistiken", statsHeading: "Atlasio in Zahlen",
    featuresTitle: "Funktionen", featuresHeading: "Alles auf einer Plattform",
    featuresDesc: "Von Einzelpersonen bis zu Unternehmen — jedes Tool unter einem Dach.",
    pricingTitle: "Preise", pricingHeading: "Ein Plan für jeden Bedarf",
    pricingDesc: "Flexible Pläne, die mit Ihren Anforderungen skalieren.",
    ctaHeading: "Beginnen Sie heute zu lernen", ctaDesc: "14 Tage kostenlos. Keine Kreditkarte erforderlich.",
    ctaRegister: "Konto erstellen", ctaBrowse: "Kurse entdecken",
    testimonialTitle: "Nutzerbewertungen", testimonialHeading: "Tausende zufriedene Nutzer",
    freePlan: "Kostenlos", proPlan: "Pro", enterprisePlan: "Enterprise",
    monthSuffix: "/Mo", customPrice: "Individueller Preis",
    planCtaFree: "Jetzt starten", planCtaPro: "Zu Pro wechseln", planCtaEnterprise: "Kontakt aufnehmen",
    planDescFree: "Perfekt zum Starten", planDescPro: "Für einzelne Schüler und Dozenten",
    planDescEnterprise: "Für Unternehmen und Universitäten", highlighted: "Am beliebtesten",
  },
  dashboard: {
    deniedTitle: "Dieses Panel ist nur für Admins und leitende Dozenten.",
    deniedDesc: (role) => `Gewählte Rolle: ${role}. Rolle oben ändern, um Zugriff zu erhalten.`,
    welcomeBack: "Willkommen zurück",
    quickActions: "Schnelle Aktionen", recentActivity: "Letzte Aktivitäten",
    upcomingLive: "Bevorstehende Live-Kurse", myMaterials: "Meine Materialien",
    uploadAssignment: "Aufgabe hochladen", pendingApprovals: "Ausstehende Genehmigungen",
  },
  courses: {
    catalogTitle: "Kurskatalog", catalogDesc: "Professionelle Kurse und Zertifikatsprogramme",
    searchPh: "Kurse oder Dozenten suchen...", filterAll: "Alle", filterFree: "Kostenlos", filterPremium: "Premium",
    sortNewest: "Neueste", sortOldest: "Älteste", sortPopular: "Beliebteste", sortRating: "Bestbewertet",
    enrolled: "Eingeschrieben", enroll: "Einschreiben", continue: "Fortfahren", preview: "Vorschau",
    free: "Kostenlos", duration: "Dauer", lessons: "Lektionen", students: "Studenten",
    rating: "Bewertung", instructor: "Dozent", level: "Niveau", certificate: "Zertifikat",
    noCoursesFound: "Keine Kurse gefunden", loadMore: "Mehr laden",
    detailOverview: "Überblick", detailCurriculum: "Lehrplan",
    detailInstructor: "Dozent", detailReviews: "Bewertungen", detailEnroll: "Zum Kurs anmelden",
    myCoursesContinue: "In Bearbeitung", myCoursesCompleted: "Abgeschlossen", myCoursesAll: "Alle",
    skillProfile: "Mein Fertigkeitsprofil",
  },
  live: {
    title: "Live-Kurse", subtitle: "Echtzeit- und geplante Live-Sitzungen",
    statusRunning: "LIVE", statusScheduled: "Geplant", statusEnded: "Beendet",
    joinBtn: "Kurs beitreten", scheduleBtn: "Planen", endedLabel: "Beendet",
    noSessions: "Keine aktiven Sitzungen", demoNote: "Demo-Daten werden angezeigt",
    participantsLabel: "Teilnehmer", durationLabel: "Dauer",
  },
  whiteboard: {
    labels: {
      actionsTitle: "Schnelle Aktionen",
      quickActions: {
        pdf: "PDF hochladen", presentation: "Präsentation", shareScreen: "Bildschirm teilen",
        cameraOn: "Kamera", cameraOff: "Kamera aus", quiz: "Quiz senden", downloadPng: "PNG exportieren",
      },
      viewRole: { instructor: "Dozentenansicht", student: "Studentenansicht" },
      background: "Hintergrund", thickness: "Stärke", color: "Farbe",
      pages: "Seite", newPage: "Neue Seite", undo: "Rückgängig", redo: "Wiederholen",
      clear: "Leeren", close: "Schließen", privateMsg: "Private Nachricht",
      privateTo: "Student", noMsg: "Keine Nachrichten.", send: "Senden",
    },
  },
  profile: {
    title: "Mein Profil", subtitle: "Kontoinformationen verwalten",
    personalInfo: "Persönliche Daten", security: "Sicherheit", preferences: "Einstellungen",
    displayName: "Anzeigename", displayNamePh: "Ihr Name",
    emailLabel: "E-Mail", currentPassword: "Aktuelles Passwort", newPassword: "Neues Passwort",
    changePhoto: "Foto ändern", saveChanges: "Änderungen speichern",
    saving: "Wird gespeichert...", successSaved: "Erfolgreich gespeichert", errorSave: "Speichern fehlgeschlagen",
    language: "Sprache", theme: "Design", notifications: "Benachrichtigungen",
    darkTheme: "Dunkel", lightTheme: "Hell", systemTheme: "System",
  },
  notifications: {
    title: "Benachrichtigungen", subtitle: "Alle Systembenachrichtigungen",
    markAllRead: "Alle als gelesen markieren", clearAll: "Alle löschen",
    noNotifications: "Keine Benachrichtigungen",
    filterAll: "Alle", filterUnread: "Ungelesen", filterSystem: "System",
    typeLesson: "Lektion", typeCertificate: "Zertifikat", typeAlarm: "Alarm", typeSystem: "System",
  },
  leaderboard: {
    title: "Rangliste", subtitle: "Besteige die Spitze des Lernwettbewerbs",
    rankLabel: "Rang", studentLabel: "Student", xpLabel: "XP",
    badgesLabel: "Abzeichen", streakLabel: "Serie", completedLabel: "Abgeschlossen",
    filterWeek: "Diese Woche", filterMonth: "Diesen Monat", filterAll: "Alle Zeit",
    yourRank: "Ihr Rang", topPerformers: "Top-Performer",
  },
  progress: {
    title: "Mein Fortschritt", subtitle: "Verfolgen Sie Ihre Lernreise",
    overallProgress: "Gesamtfortschritt", coursesInProgress: "Laufende Kurse",
    completedCourses: "Abgeschlossene Kurse", totalXP: "Gesamt-XP",
    currentStreak: "Aktuelle Serie", weeklyGoal: "Wochenziel",
    achievements: "Errungenschaften", badges: "Abzeichen",
    noProgress: "Noch kein Fortschritt", startLearning: "Lernen beginnen",
  },
  reportCards: {
    title: "Zeugnisse & Berichte", subtitle: "Periodische akademische Beurteilungen",
    period: "Zeitraum", overallGrade: "Gesamtnote", attendance: "Anwesenheit",
    performance: "Leistung", comments: "Kommentare", downloadPDF: "PDF herunterladen",
    noReports: "Keine Berichte gefunden",
  },
  certificates: {
    title: "Meine Zertifikate", subtitle: "Meine digitalen Qualifikationsnachweise",
    issuedOn: "Ausgestellt am", expiresOn: "Gültig bis", verifyBtn: "Verifizieren",
    downloadBtn: "Herunterladen", shareBtn: "Teilen", renewBtn: "Erneuern",
    noCertificates: "Keine Zertifikate gefunden",
    verifyTitle: "Zertifikatsverifizierung", verifyDesc: "Zertifikatscode eingeben zum Verifizieren",
    verifySubmit: "Zertifikat verifizieren", verifyPh: "Zertifikatscode",
    verifySuccess: "Zertifikat ist gültig", verifyFail: "Zertifikat nicht gefunden oder ungültig",
  },
  exams: {
    title: "Prüfungen", subtitle: "Ihre Prüfungs- und Quiz-Geschichte",
    startExam: "Prüfung starten", reviewExam: "Überprüfen", retakeExam: "Wiederholen",
    timeLeft: "Verbleibende Zeit", questionsCount: "Fragen", passScore: "Bestehens-Punktzahl",
    status: { pending: "Ausstehend", passed: "Bestanden", failed: "Nicht bestanden", inProgress: "In Bearbeitung" },
    resultsTitle: "Prüfungsergebnisse", yourScore: "Ihre Punktzahl", correctAnswers: "Richtige Antworten",
    adaptiveTitle: "Adaptive Prüfung", adaptiveDesc: "Fragen automatisch an Ihr Niveau angepasst",
    difficulty: { easy: "Einfach", medium: "Mittel", hard: "Schwer" },
  },
  ai: {
    title: "KI-Mentor", subtitle: "Personalisierte Lernunterstützung, sofort verfügbar.",
    online: "Online", placeholder: "Stellen Sie eine Frage… (Umschalt+Enter neue Zeile, Enter senden)",
    sendBtn: "Fragen",
    chips: ["Dieses Thema erklären", "Beispiel geben", "Prüfungsfrage schreiben", "Zusammenfassen", "Was habe ich gelernt?"],
    sources: "Quellen", confidence: "Konfidenz-Score", lowConfidence: "Niedrige Konfidenz — bitte überprüfen",
    disclaimer: "Ghost Mentor wird von KI betrieben — für kritische Entscheidungen wenden Sie sich bitte an Ihren Dozenten.",
    clearChat: "Chat leeren",
    contentTitle: "Inhaltsverarbeitung", contentDesc: "PDFs, Präsentationen und Dokumente analysieren",
    tabs: { chat: "Mentor Chat", content: "Inhaltsverarbeitung" },
  },
  booking: {
    title: "Sitzungsbuchung", subtitle: "Einzelsitzungen mit Ihrem Dozenten planen",
    selectDate: "Datum auswählen", selectTime: "Uhrzeit auswählen", selectInstructor: "Dozenten auswählen",
    duration: "Dauer", notes: "Notizen", notesPh: "Sitzungsnotizen eingeben...",
    submit: "Sitzung buchen", submitting: "Wird gebucht...",
    success: "Sitzung erfolgreich gebucht",
    cancelBtn: "Stornieren", rescheduleBtn: "Umplanen",
    upcomingSessions: "Bevorstehende Sitzungen", pastSessions: "Vergangene Sitzungen",
    noSessions: "Keine Sitzungen gefunden", availableSlots: "Verfügbare Zeitfenster",
  },
  payments: {
    title: "Zahlungen", subtitle: "Abonnement und Zahlungshistorie",
    currentPlan: "Aktueller Plan", upgradePlan: "Plan upgraden", manageBilling: "Abrechnung verwalten",
    invoices: "Rechnungen", paymentMethod: "Zahlungsmethode",
    successTitle: "Zahlung erfolgreich!", successDesc: "Ihr Plan wurde aktiviert.",
    successBtn: "Zu meinen Kursen",
    cancelTitle: "Zahlung abgebrochen", cancelDesc: "Zahlungsvorgang wurde abgebrochen.",
    cancelBtn: "Erneut versuchen",
    amount: "Betrag", date: "Datum", status: "Status", invoice: "Rechnung",
  },
  guardian: {
    title: "Eltern-Panel", subtitle: "Lernen Ihres Kindes verfolgen",
    childrenLabel: "Meine Schüler", addChild: "Schüler hinzufügen",
    progressLabel: "Fortschritt", attendanceLabel: "Anwesenheit", gradesLabel: "Noten",
    messagesLabel: "Nachrichten", reportLabel: "Bericht erhalten", noChildren: "Keine registrierten Schüler",
  },
  learningPlans: {
    title: "Lernpläne", subtitle: "Ihre personalisierten Lernpfade",
    createPlan: "Plan erstellen", myPlans: "Meine Pläne", recommended: "Empfohlen",
    duration: "Dauer", modules: "Module", startPlan: "Plan starten",
    progress: "Fortschritt", completed: "Abgeschlossen", noPlans: "Keine Pläne gefunden",
  },
  instructor: {
    title: "Dozenten-Hub", subtitle: "Ihr Lehrerleben verwalten",
    analytics: "Analytik", courseBuilder: "Kursersteller", earnings: "Meine Einnahmen",
    insights: "Studentenanalyse", aiStudio: "KI-Studio", aiQueue: "KI-Warteschlange",
    volunteer: "Freiwilligen-Programm",
    studentsLabel: "Studenten", coursesLabel: "Kurse",
    revenueLabel: "Einnahmen", ratingLabel: "Bewertung",
  },
  admin: {
    title: "Admin-Dashboard", subtitle: "Plattformverwaltung und Überwachung",
    users: "Benutzer", content: "Inhalte", security: "Sicherheit", payments: "Zahlungen",
    reports: "Berichte", settings: "Einstellungen", monitoring: "Überwachung",
    email: "E-Mail", sso: "SSO", lti: "LTI", connectors: "Integrationen",
    departments: "Abteilungen", automation: "Automatisierung", aiAgents: "KI-Agenten",
    approvals: "Genehmigungen", volunteer: "Freiwillig", alarms: "Alarme",
    observability: "Beobachtbarkeit", proctoring: "Prüfungsaufsicht", tools: "Tools",
    totalUsers: "Gesamtbenutzer", activeToday: "Heute aktiv",
    revenue: "Einnahmen", uptime: "Betriebszeit",
  },
  errors: {
    notFoundTitle: "Seite nicht gefunden",
    notFoundDesc: "Die gesuchte Seite wurde möglicherweise verschoben, gelöscht oder existierte nie.",
    notFoundHome: "Startseite", notFoundCatalog: "Kurse entdecken",
    serverError: "Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    unauthorized: "Sie haben keine Berechtigung, diese Seite anzuzeigen.",
    forbidden: "Zugriff verweigert.",
    networkError: "Verbindungsfehler. Überprüfen Sie Ihre Internetverbindung.",
  },
  roadmap: {
    title: "Meine Lernroadmap", subtitle: "Planen Sie Ihre Karrierereise",
    milestones: "Meilensteine", upcoming: "Bevorstehend", completed: "Abgeschlossen",
    inProgress: "In Bearbeitung", noMilestones: "Keine Meilensteine gefunden",
  },
  peerReview: {
    title: "Peer-Review", subtitle: "Gemeinsam lernen, gemeinsam bewerten",
    submitWork: "Arbeit einreichen", reviewPeers: "Kommilitonen bewerten", myReviews: "Meine Bewertungen",
    criteria: "Kriterien", score: "Punktzahl", feedback: "Feedback",
    feedbackPh: "Schreiben Sie Ihre Bewertung...", submitReview: "Bewertung einreichen",
    noReviews: "Keine Bewertungen gefunden",
  },
  languageLab: {
    title: "Sprachlabor", subtitle: "Fremdsprache üben",
    practiceBtn: "Üben", vocabulary: "Vokabular", grammar: "Grammatik",
    listening: "Hören", speaking: "Sprechen", writing: "Schreiben",
    levelBeginner: "Anfänger", levelIntermediate: "Mittelstufe", levelAdvanced: "Fortgeschritten",
    streak: "Serie", xpEarned: "Verdiente XP",
  },
  mathLab: {
    title: "Mathematik-Labor", subtitle: "Rechen- und Grafikwerkzeuge",
    calculate: "Berechnen", graph: "Diagramm", matrix: "Matrix", statistics: "Statistik",
    expression: "Ausdruck", expressionPh: "Mathematischen Ausdruck eingeben...",
    solveBtn: "Lösen", result: "Ergebnis", history: "Verlauf", noHistory: "Kein Verlauf",
  },
  adaptiveQuiz: {
    title: "Adaptives Quiz", subtitle: "Fragen an Ihr Niveau angepasst",
    startBtn: "Prüfung starten", continueBtn: "Fortfahren", nextBtn: "Nächste",
    questionLabel: "Frage", difficulty: "Schwierigkeit", submitAnswer: "Antwort absenden",
    correctAnswer: "Richtig!", wrongAnswer: "Falsch", explanation: "Erklärung",
    quizComplete: "Quiz abgeschlossen!", yourScore: "Ihre Punktzahl", retryBtn: "Erneut versuchen",
    selectCourse: "Kurs auswählen", selectDifficulty: "Schwierigkeit auswählen", questionsCount: "Anzahl der Fragen",
  },
  analytics: {
    title: "Analyse-Hub", subtitle: "Plattformleistung in Echtzeit überwachen",
    liveData: "Live-Daten", lastUpdated: "Zuletzt aktualisiert", previousPeriod: "vs. Vorperiode",
    totalEnrollments: "Einschreibungen gesamt", completionRate: "Abschlussrate", totalRevenue: "Gesamtumsatz",
    activeUsers: "Aktive Nutzer", npsScore: "NPS-Wert", avgSession: "Ø Sitzungsdauer",
    enrollmentTrend: "Einschreibung & Abschluss-Trend", completionTrend: "Studentenaktivität im Zeitverlauf",
    dailyRevenue: "Täglicher Umsatz", dailyRevenueDesc: "Periodenverteilung",
    userActivity: "Aktive Nutzer", userActivityDesc: "Tägliche eindeutige Sitzungen",
    topCourses: "Top-Kurse", categoryDist: "Kategorieverteilung",
    retention: "Kohortenanalyse", retentionDesc: "Wöchentliche Bindungsrate",
    cohortLabel: "Kohorte", weekLabel: "Wo.",
    courseTitle: "Kursname", enrollments: "Einschreibungen", completions: "Abschlüsse", revenue: "Umsatz",
    demoData: "Demo-Daten werden angezeigt", minutesSuffix: "Min.",
    day7: "7 Tage", day30: "30 Tage", day90: "90 Tage",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ARABIC  🇸🇦  (RTL)
// ─────────────────────────────────────────────────────────────────────────────
const ar: I18nStrings = {
  common: {
    save: "حفظ", cancel: "إلغاء", delete: "حذف", edit: "تعديل", add: "إضافة",
    search: "بحث", filter: "تصفية", loading: "جارٍ التحميل...", error: "خطأ",
    success: "نجاح", confirm: "تأكيد", close: "إغلاق", back: "رجوع",
    next: "التالي", previous: "السابق", refresh: "تحديث", submit: "إرسال",
    reset: "إعادة تعيين", download: "تنزيل", upload: "رفع", copy: "نسخ",
    copied: "تم النسخ", send: "إرسال", view: "عرض", create: "إنشاء",
    update: "تحديث", remove: "إزالة", enable: "تفعيل", disable: "تعطيل",
    all: "الكل", none: "لا شيء", yes: "نعم", no: "لا", ok: "موافق",
    retry: "إعادة المحاولة", noData: "لا توجد بيانات", noResults: "لا توجد نتائج",
    demoMode: "وضع تجريبي", loginRequired: "يجب تسجيل الدخول",
  },
  roles: {
    admin: "مشرف", headInstructor: "رئيس المعلمين",
    instructor: "معلم", student: "طالب", guardian: "ولي أمر",
  },
  nav: {
    brandSub: "شبكة التعلم العالمية", login: "تسجيل الدخول", logout: "تسجيل الخروج",
    roleLabel: "الدور", langLabel: "اللغة",
    search: "بحث (⌘K / Ctrl+K)", darkMode: "الوضع الداكن", lightMode: "الوضع الفاتح",
    aiMentor: "الذكاء الاصطناعي", notifications: "الإشعارات",
    security: "تنبيهات الأمان", myCourses: "دوراتي",
    profile: "الملف الشخصي", back: "رجوع", forward: "تقدم", home: "الرئيسية",
    dashboard: "لوحة الإدارة", alarmsTip: "تنبيه أمني",
  },
  login: {
    heroPill: "وصول متعدد الأدوار · جاهز SSO",
    heroTitle1: "من شاشة واحدة", heroTitle2: "لجميع أدوار أطلسيو",
    heroDesc: "تسجيل موحد للمدير والمعلم والطالب وولي الأمر. يدعم MFA ونهج الثقة الصفرية.",
    formTitle: "تسجيل الدخول", formSub: "مركز هوية أطلسيو",
    email: "البريد الإلكتروني", emailPh: "email@domain.com",
    password: "كلمة المرور", passwordPh: "8 أحرف على الأقل",
    loading: "جارٍ تسجيل الدخول...", submit: "تسجيل الدخول",
    noAccount: "ليس لديك حساب؟", register: "إنشاء حساب", forgotPassword: "نسيت كلمة المرور",
    roleButtons: [
      { key: "admin", label: "مشرف" }, { key: "instructor", label: "معلم" },
      { key: "student", label: "طالب" }, { key: "guardian", label: "ولي أمر" },
    ],
  },
  register: {
    heroPill: "ابدأ مجاناً", heroTitle: "مرحباً بك في أطلسيو.",
    heroDesc: "آلاف الدورات والدروس المباشرة ورحلة تعليمية مخصصة تنتظرك.",
    stat1Label: "طلاب نشطون", stat1Value: "12K+",
    stat2Label: "الدورات", stat2Value: "380+",
    stat3Label: "متوسط التقييم", stat3Value: "4.8★",
    formTitle: "إنشاء حساب", formSub: "مجاني، جاهز في دقائق.",
    name: "الاسم الكامل", namePh: "اسمك (اختياري)",
    email: "البريد الإلكتروني", emailPh: "email@domain.com",
    password: "كلمة المرور", passwordPh: "8 أحرف على الأقل",
    passwordHint: "8 أحرف على الأقل",
    confirmPassword: "تأكيد كلمة المرور", confirmPh: "أعد إدخال كلمة المرور",
    submit: "إنشاء حساب", loading: "جارٍ إنشاء الحساب...",
    haveAccount: "هل لديك حساب بالفعل؟", loginLink: "تسجيل الدخول",
    errorMismatch: "كلمات المرور غير متطابقة", errorWeak: "كلمة المرور ضعيفة جداً",
  },
  auth: {
    forgotTitle: "نسيت كلمة المرور؟", forgotSub: "إعادة تعيين كلمة المرور",
    forgotDesc: "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.",
    forgotSubmit: "إرسال رابط الإعادة", forgotLoading: "جارٍ الإرسال...",
    forgotSuccess: "تم إرسال الرابط إلى بريدك الإلكتروني.", forgotPill: "إعادة تعيين كلمة المرور",
    resetTitle: "تعيين كلمة مرور جديدة", resetSub: "إعادة تعيين كلمة المرور",
    newPassword: "كلمة المرور الجديدة", newPasswordPh: "8 أحرف على الأقل",
    resetSubmit: "تحديث كلمة المرور", resetLoading: "جارٍ التحديث...",
    resetSuccess: "تم تحديث كلمة المرور بنجاح.",
    verifyTitle: "تحقق من بريدك الإلكتروني", verifySub: "اقتربت من النهاية!",
    verifyDesc: "انقر على الرابط المرسل إلى بريدك الإلكتروني لتأكيد حسابك.",
    verifySuccess: "تم التحقق من البريد الإلكتروني بنجاح.", verifyLoading: "جارٍ التحقق...",
    backToLogin: "العودة لتسجيل الدخول", rememberPassword: "أتذكر كلمة مروري",
  },
  home: {
    pill: "أطلسيو 2026 • شبكة التعلم العالمية", activePill: "الآن", activeCount: "طالب نشط",
    title1: "منصة تعليم عن بُعد", title2: "بمعايير عالمية",
    slogan: "المنصة التعليمية الرقمية التي تحوّل المعرفة إلى قيمة",
    desc: "دروس مباشرة، سبورة ذكية، مرشد بالذكاء الاصطناعي وشهادات — كل شيء في شاشة واحدة.",
    ctaStart: "ابدأ مجاناً", ctaDemo: "▶ شاهد العرض التجريبي", ctaCatalog: "كتالوج الدورات",
    trustedBy: "موثوق من:", universities: "42 جامعة",
    companies: "180 شركة", countries: "64 دولة",
    statsTitle: "إحصائيات المنصة", statsHeading: "أطلسيو بالأرقام",
    featuresTitle: "الميزات", featuresHeading: "كل شيء في منصة واحدة",
    featuresDesc: "من الأفراد إلى المؤسسات — كل الأدوات التي تحتاجها تحت سقف واحد.",
    pricingTitle: "الأسعار", pricingHeading: "خطة لكل احتياج",
    pricingDesc: "خطط مرنة تتوسع مع متطلباتك.",
    ctaHeading: "ابدأ التعلم اليوم", ctaDesc: "14 يوماً مجاناً. لا يلزم بطاقة ائتمانية.",
    ctaRegister: "إنشاء حساب", ctaBrowse: "تصفح الدورات",
    testimonialTitle: "آراء المستخدمين", testimonialHeading: "آلاف المستخدمين السعداء",
    freePlan: "مجاني", proPlan: "Pro", enterprisePlan: "مؤسسي",
    monthSuffix: "/شهر", customPrice: "سعر مخصص",
    planCtaFree: "ابدأ الآن", planCtaPro: "الترقية إلى Pro", planCtaEnterprise: "تواصل معنا",
    planDescFree: "مثالي للبداية", planDescPro: "للطلاب والمعلمين الأفراد",
    planDescEnterprise: "للشركات والجامعات", highlighted: "الأكثر شيوعاً",
  },
  dashboard: {
    deniedTitle: "هذه اللوحة للمشرفين ورؤساء المعلمين فقط.",
    deniedDesc: (role) => `الدور المحدد: ${role}. غيّر الدور من الشريط العلوي للوصول.`,
    welcomeBack: "مرحباً بعودتك",
    quickActions: "إجراءات سريعة", recentActivity: "النشاط الأخير",
    upcomingLive: "الدروس المباشرة القادمة", myMaterials: "موادي",
    uploadAssignment: "رفع الواجب", pendingApprovals: "الموافقات المعلقة",
  },
  courses: {
    catalogTitle: "كتالوج الدورات", catalogDesc: "دورات احترافية وبرامج شهادات",
    searchPh: "البحث عن دورات أو معلمين...", filterAll: "الكل", filterFree: "مجاني", filterPremium: "مميز",
    sortNewest: "الأحدث", sortOldest: "الأقدم", sortPopular: "الأكثر شعبية", sortRating: "الأعلى تقييماً",
    enrolled: "مسجّل", enroll: "التسجيل", continue: "متابعة", preview: "معاينة",
    free: "مجاني", duration: "المدة", lessons: "الدروس", students: "الطلاب",
    rating: "التقييم", instructor: "المعلم", level: "المستوى", certificate: "شهادة",
    noCoursesFound: "لا توجد دورات", loadMore: "تحميل المزيد",
    detailOverview: "نظرة عامة", detailCurriculum: "المنهج",
    detailInstructor: "المعلم", detailReviews: "التقييمات", detailEnroll: "التسجيل في الدورة",
    myCoursesContinue: "قيد التنفيذ", myCoursesCompleted: "مكتملة", myCoursesAll: "الكل",
    skillProfile: "ملف مهاراتي",
  },
  live: {
    title: "الدروس المباشرة", subtitle: "جلسات مباشرة فورية ومجدولة",
    statusRunning: "مباشر", statusScheduled: "مجدول", statusEnded: "انتهى",
    joinBtn: "انضم للدرس", scheduleBtn: "جدولة", endedLabel: "انتهى",
    noSessions: "لا توجد جلسات نشطة", demoNote: "عرض بيانات تجريبية",
    participantsLabel: "المشاركون", durationLabel: "المدة",
  },
  whiteboard: {
    labels: {
      actionsTitle: "إجراءات سريعة",
      quickActions: {
        pdf: "رفع PDF", presentation: "إضافة عرض", shareScreen: "مشاركة الشاشة",
        cameraOn: "الكاميرا", cameraOff: "إيقاف الكاميرا", quiz: "نشر الاختبار", downloadPng: "تصدير PNG",
      },
      viewRole: { instructor: "عرض المعلم", student: "عرض الطالب" },
      background: "الخلفية", thickness: "السُمك", color: "اللون",
      pages: "صفحة", newPage: "صفحة جديدة", undo: "تراجع", redo: "إعادة",
      clear: "مسح", close: "إغلاق", privateMsg: "رسالة خاصة",
      privateTo: "طالب", noMsg: "لا توجد رسائل.", send: "إرسال",
    },
  },
  profile: {
    title: "ملفي الشخصي", subtitle: "إدارة معلومات حسابك",
    personalInfo: "المعلومات الشخصية", security: "الأمان", preferences: "التفضيلات",
    displayName: "الاسم المعروض", displayNamePh: "اسمك",
    emailLabel: "البريد الإلكتروني", currentPassword: "كلمة المرور الحالية", newPassword: "كلمة المرور الجديدة",
    changePhoto: "تغيير الصورة", saveChanges: "حفظ التغييرات",
    saving: "جارٍ الحفظ...", successSaved: "تم الحفظ بنجاح", errorSave: "فشل الحفظ",
    language: "اللغة", theme: "المظهر", notifications: "الإشعارات",
    darkTheme: "داكن", lightTheme: "فاتح", systemTheme: "النظام",
  },
  notifications: {
    title: "الإشعارات", subtitle: "جميع إشعارات النظام",
    markAllRead: "تحديد الكل كمقروء", clearAll: "مسح الكل",
    noNotifications: "لا توجد إشعارات",
    filterAll: "الكل", filterUnread: "غير مقروء", filterSystem: "النظام",
    typeLesson: "درس", typeCertificate: "شهادة", typeAlarm: "تنبيه", typeSystem: "نظام",
  },
  leaderboard: {
    title: "لوحة المتصدرين", subtitle: "تصدّر منافسة التعلم",
    rankLabel: "الترتيب", studentLabel: "الطالب", xpLabel: "نقاط XP",
    badgesLabel: "الشارات", streakLabel: "التسلسل", completedLabel: "مكتمل",
    filterWeek: "هذا الأسبوع", filterMonth: "هذا الشهر", filterAll: "كل الأوقات",
    yourRank: "ترتيبك", topPerformers: "أفضل الأداء",
  },
  progress: {
    title: "تقدمي", subtitle: "تتبع رحلتك التعليمية",
    overallProgress: "التقدم الإجمالي", coursesInProgress: "الدورات الجارية",
    completedCourses: "الدورات المكتملة", totalXP: "إجمالي XP",
    currentStreak: "التسلسل الحالي", weeklyGoal: "الهدف الأسبوعي",
    achievements: "الإنجازات", badges: "الشارات",
    noProgress: "لا يوجد تقدم بعد", startLearning: "ابدأ التعلم",
  },
  reportCards: {
    title: "بطاقات التقارير", subtitle: "التقييمات الأكاديمية الدورية",
    period: "الفترة", overallGrade: "الدرجة الإجمالية", attendance: "الحضور",
    performance: "الأداء", comments: "التعليقات", downloadPDF: "تنزيل PDF",
    noReports: "لا توجد تقارير",
  },
  certificates: {
    title: "شهاداتي", subtitle: "بياناتي الرقمية",
    issuedOn: "تاريخ الإصدار", expiresOn: "صالح حتى", verifyBtn: "التحقق",
    downloadBtn: "تنزيل", shareBtn: "مشاركة", renewBtn: "تجديد",
    noCertificates: "لا توجد شهادات",
    verifyTitle: "التحقق من الشهادة", verifyDesc: "أدخل رمز الشهادة للتحقق",
    verifySubmit: "التحقق من الشهادة", verifyPh: "رمز الشهادة",
    verifySuccess: "الشهادة صالحة", verifyFail: "الشهادة غير موجودة أو غير صالحة",
  },
  exams: {
    title: "الامتحانات", subtitle: "سجل امتحاناتك واختباراتك",
    startExam: "بدء الامتحان", reviewExam: "مراجعة", retakeExam: "إعادة",
    timeLeft: "الوقت المتبقي", questionsCount: "الأسئلة", passScore: "درجة النجاح",
    status: { pending: "معلق", passed: "ناجح", failed: "راسب", inProgress: "جارٍ" },
    resultsTitle: "نتائج الامتحان", yourScore: "درجتك", correctAnswers: "الإجابات الصحيحة",
    adaptiveTitle: "امتحان تكيّفي", adaptiveDesc: "أسئلة تتكيف تلقائياً مع مستواك",
    difficulty: { easy: "سهل", medium: "متوسط", hard: "صعب" },
  },
  ai: {
    title: "المرشد الذكي", subtitle: "دعم تعليمي مخصص، متاح فوراً.",
    online: "متصل", placeholder: "اطرح سؤالاً… (Shift+Enter سطر جديد، Enter إرسال)",
    sendBtn: "اسأل",
    chips: ["اشرح هذا الموضوع", "أعطِ مثالاً", "اكتب سؤال امتحان", "لخّص", "ماذا تعلمت؟"],
    sources: "المصادر", confidence: "نسبة الثقة", lowConfidence: "ثقة منخفضة — يرجى التحقق",
    disclaimer: "Ghost Mentor مدعوم بالذكاء الاصطناعي — للقرارات الحرجة يرجى استشارة معلمك.",
    clearChat: "مسح المحادثة",
    contentTitle: "معالج المحتوى", contentDesc: "تحليل ملفات PDF والعروض والمستندات",
    tabs: { chat: "محادثة المرشد", content: "معالج المحتوى" },
  },
  booking: {
    title: "حجز جلسة", subtitle: "جدولة جلسات فردية مع معلمك",
    selectDate: "اختر التاريخ", selectTime: "اختر الوقت", selectInstructor: "اختر المعلم",
    duration: "المدة", notes: "ملاحظات", notesPh: "أدخل ملاحظات الجلسة...",
    submit: "احجز الجلسة", submitting: "جارٍ الحجز...",
    success: "تم حجز الجلسة بنجاح",
    cancelBtn: "إلغاء", rescheduleBtn: "إعادة الجدولة",
    upcomingSessions: "الجلسات القادمة", pastSessions: "الجلسات السابقة",
    noSessions: "لا توجد جلسات", availableSlots: "المواعيد المتاحة",
  },
  payments: {
    title: "المدفوعات", subtitle: "الاشتراك وسجل الدفع",
    currentPlan: "الخطة الحالية", upgradePlan: "ترقية الخطة", manageBilling: "إدارة الفواتير",
    invoices: "الفواتير", paymentMethod: "طريقة الدفع",
    successTitle: "تمت الدفع بنجاح!", successDesc: "تم تفعيل خطتك.",
    successBtn: "الذهاب لدوراتي",
    cancelTitle: "تم إلغاء الدفع", cancelDesc: "تم إلغاء عملية الدفع.",
    cancelBtn: "حاول مجدداً",
    amount: "المبلغ", date: "التاريخ", status: "الحالة", invoice: "فاتورة",
  },
  guardian: {
    title: "لوحة ولي الأمر", subtitle: "تتبع تعلم طفلك",
    childrenLabel: "طلابي", addChild: "إضافة طالب",
    progressLabel: "التقدم", attendanceLabel: "الحضور", gradesLabel: "الدرجات",
    messagesLabel: "الرسائل", reportLabel: "الحصول على تقرير", noChildren: "لا يوجد طلاب مسجلون",
  },
  learningPlans: {
    title: "خطط التعلم", subtitle: "مساراتك التعليمية المخصصة",
    createPlan: "إنشاء خطة", myPlans: "خططي", recommended: "موصى به",
    duration: "المدة", modules: "الوحدات", startPlan: "بدء الخطة",
    progress: "التقدم", completed: "مكتمل", noPlans: "لا توجد خطط",
  },
  instructor: {
    title: "مركز المعلم", subtitle: "إدارة تجربتك التعليمية",
    analytics: "التحليلات", courseBuilder: "منشئ الدورات", earnings: "أرباحي",
    insights: "تحليل الطلاب", aiStudio: "استوديو الذكاء الاصطناعي", aiQueue: "قائمة انتظار الذكاء الاصطناعي",
    volunteer: "برنامج التطوع",
    studentsLabel: "الطلاب", coursesLabel: "الدورات",
    revenueLabel: "الإيرادات", ratingLabel: "التقييم",
  },
  admin: {
    title: "لوحة الإدارة", subtitle: "إدارة المنصة ومراقبتها",
    users: "المستخدمون", content: "المحتوى", security: "الأمان", payments: "المدفوعات",
    reports: "التقارير", settings: "الإعدادات", monitoring: "المراقبة",
    email: "البريد الإلكتروني", sso: "SSO", lti: "LTI", connectors: "التكاملات",
    departments: "الأقسام", automation: "الأتمتة", aiAgents: "وكلاء الذكاء الاصطناعي",
    approvals: "الموافقات", volunteer: "تطوع", alarms: "التنبيهات",
    observability: "الملاحظة", proctoring: "الإشراف على الامتحانات", tools: "الأدوات",
    totalUsers: "إجمالي المستخدمين", activeToday: "نشط اليوم",
    revenue: "الإيرادات", uptime: "وقت التشغيل",
  },
  errors: {
    notFoundTitle: "الصفحة غير موجودة",
    notFoundDesc: "الصفحة التي تبحث عنها ربما تم نقلها أو حذفها أو لم تكن موجودة.",
    notFoundHome: "الصفحة الرئيسية", notFoundCatalog: "تصفح الدورات",
    serverError: "حدث خطأ في الخادم. يرجى المحاولة مرة أخرى.",
    unauthorized: "ليس لديك إذن لعرض هذه الصفحة.",
    forbidden: "تم رفض الوصول.",
    networkError: "خطأ في الاتصال. تحقق من اتصالك بالإنترنت.",
  },
  roadmap: {
    title: "خارطة طريق تعلمي", subtitle: "خطط لرحلتك المهنية",
    milestones: "المعالم", upcoming: "القادمة", completed: "مكتملة",
    inProgress: "جارٍ", noMilestones: "لا توجد معالم",
  },
  peerReview: {
    title: "مراجعة الأقران", subtitle: "تعلموا معاً، قيّموا معاً",
    submitWork: "تقديم العمل", reviewPeers: "مراجعة الأقران", myReviews: "مراجعاتي",
    criteria: "المعايير", score: "الدرجة", feedback: "التغذية الراجعة",
    feedbackPh: "اكتب تقييمك...", submitReview: "إرسال المراجعة",
    noReviews: "لا توجد مراجعات",
  },
  languageLab: {
    title: "مختبر اللغة", subtitle: "تدرب على لغة أجنبية",
    practiceBtn: "تدرب", vocabulary: "المفردات", grammar: "القواعد",
    listening: "الاستماع", speaking: "التحدث", writing: "الكتابة",
    levelBeginner: "مبتدئ", levelIntermediate: "متوسط", levelAdvanced: "متقدم",
    streak: "التسلسل", xpEarned: "نقاط XP المكتسبة",
  },
  mathLab: {
    title: "مختبر الرياضيات", subtitle: "أدوات الحساب والرسم البياني",
    calculate: "احسب", graph: "رسم بياني", matrix: "مصفوفة", statistics: "إحصاء",
    expression: "التعبير", expressionPh: "أدخل التعبير الرياضي...",
    solveBtn: "احلل", result: "النتيجة", history: "السجل", noHistory: "لا يوجد سجل",
  },
  adaptiveQuiz: {
    title: "اختبار تكيّفي", subtitle: "أسئلة تتكيف مع مستواك",
    startBtn: "ابدأ الامتحان", continueBtn: "متابعة", nextBtn: "التالي",
    questionLabel: "سؤال", difficulty: "الصعوبة", submitAnswer: "إرسال الإجابة",
    correctAnswer: "صحيح!", wrongAnswer: "خطأ", explanation: "الشرح",
    quizComplete: "اكتمل الاختبار!", yourScore: "درجتك", retryBtn: "حاول مجدداً",
    selectCourse: "اختر الدورة", selectDifficulty: "اختر الصعوبة", questionsCount: "عدد الأسئلة",
  },
  analytics: {
    title: "مركز التحليلات", subtitle: "مراقبة أداء المنصة في الوقت الفعلي",
    liveData: "بيانات مباشرة", lastUpdated: "آخر تحديث", previousPeriod: "مقابل الفترة السابقة",
    totalEnrollments: "إجمالي التسجيلات", completionRate: "معدل الإتمام", totalRevenue: "إجمالي الإيرادات",
    activeUsers: "المستخدمون النشطون", npsScore: "درجة NPS", avgSession: "متوسط مدة الجلسة",
    enrollmentTrend: "اتجاه التسجيل والإتمام", completionTrend: "نشاط الطلاب عبر الزمن",
    dailyRevenue: "الإيرادات اليومية", dailyRevenueDesc: "توزيع الإيرادات الدورية",
    userActivity: "المستخدمون النشطون", userActivityDesc: "الجلسات الفريدة اليومية",
    topCourses: "أفضل الدورات", categoryDist: "توزيع الفئات",
    retention: "تحليل الاحتفاظ بالمجموعات", retentionDesc: "معدل الاحتفاظ الأسبوعي",
    cohortLabel: "مجموعة", weekLabel: "أسبوع",
    courseTitle: "اسم الدورة", enrollments: "التسجيلات", completions: "الإتمامات", revenue: "الإيرادات",
    demoData: "عرض بيانات تجريبية", minutesSuffix: "دقيقة",
    day7: "7 أيام", day30: "30 يومًا", day90: "90 يومًا",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// RUSSIAN  🇷🇺
// ─────────────────────────────────────────────────────────────────────────────
const ru: I18nStrings = {
  common: {
    save: "Сохранить", cancel: "Отмена", delete: "Удалить", edit: "Редактировать", add: "Добавить",
    search: "Поиск", filter: "Фильтр", loading: "Загрузка...", error: "Ошибка",
    success: "Успешно", confirm: "Подтвердить", close: "Закрыть", back: "Назад",
    next: "Далее", previous: "Назад", refresh: "Обновить", submit: "Отправить",
    reset: "Сбросить", download: "Скачать", upload: "Загрузить", copy: "Копировать",
    copied: "Скопировано", send: "Отправить", view: "Просмотр", create: "Создать",
    update: "Обновить", remove: "Удалить", enable: "Включить", disable: "Отключить",
    all: "Все", none: "Нет", yes: "Да", no: "Нет", ok: "ОК",
    retry: "Повторить", noData: "Данные не найдены", noResults: "Нет результатов",
    demoMode: "Демо-режим", loginRequired: "Требуется вход",
  },
  roles: {
    admin: "Администратор", headInstructor: "Главный преподаватель",
    instructor: "Преподаватель", student: "Студент", guardian: "Родитель",
  },
  nav: {
    brandSub: "Глобальная сеть обучения", login: "Войти", logout: "Выйти",
    roleLabel: "Роль", langLabel: "Язык",
    search: "Поиск (⌘K / Ctrl+K)", darkMode: "Тёмная тема", lightMode: "Светлая тема",
    aiMentor: "Ghost-Mentor AI", notifications: "Уведомления",
    security: "Оповещения безопасности", myCourses: "Мои курсы",
    profile: "Профиль", back: "Назад", forward: "Вперёд", home: "Главная",
    dashboard: "Панель управления", alarmsTip: "Сигнал тревоги",
  },
  login: {
    heroPill: "Мультиролевой доступ · Поддержка SSO",
    heroTitle1: "Один экран для", heroTitle2: "всех ролей Atlasio",
    heroDesc: "Единый вход для администраторов, преподавателей, студентов и родителей. Поддержка MFA и zero-trust.",
    formTitle: "Вход", formSub: "Центр аутентификации Atlasio",
    email: "Эл. почта", emailPh: "email@domain.com",
    password: "Пароль", passwordPh: "Минимум 8 символов",
    loading: "Выполняется вход...", submit: "Войти",
    noAccount: "Нет аккаунта?", register: "Зарегистрироваться", forgotPassword: "Забыли пароль?",
    roleButtons: [
      { key: "admin", label: "Администратор" }, { key: "instructor", label: "Преподаватель" },
      { key: "student", label: "Студент" }, { key: "guardian", label: "Родитель" },
    ],
  },
  register: {
    heroPill: "Начать бесплатно", heroTitle: "Добро пожаловать в Atlasio.",
    heroDesc: "Тысячи курсов, живые занятия и персональный путь обучения ждут вас.",
    stat1Label: "Активных студентов", stat1Value: "12K+",
    stat2Label: "Курсов", stat2Value: "380+",
    stat3Label: "Средний рейтинг", stat3Value: "4.8★",
    formTitle: "Создать аккаунт", formSub: "Бесплатно, готово за минуты.",
    name: "Полное имя", namePh: "Ваше имя (необязательно)",
    email: "Эл. почта", emailPh: "email@domain.com",
    password: "Пароль", passwordPh: "Минимум 8 символов",
    passwordHint: "Минимум 8 символов",
    confirmPassword: "Подтверждение пароля", confirmPh: "Повторите пароль",
    submit: "Зарегистрироваться", loading: "Создание аккаунта...",
    haveAccount: "Уже есть аккаунт?", loginLink: "Войти",
    errorMismatch: "Пароли не совпадают", errorWeak: "Слишком слабый пароль",
  },
  auth: {
    forgotTitle: "Забыли пароль?", forgotSub: "Сброс пароля",
    forgotDesc: "Введите адрес эл. почты — мы отправим ссылку для сброса.",
    forgotSubmit: "Отправить ссылку", forgotLoading: "Отправка...",
    forgotSuccess: "Ссылка отправлена на вашу почту.", forgotPill: "Сбросьте пароль",
    resetTitle: "Новый пароль", resetSub: "Сброс пароля",
    newPassword: "Новый пароль", newPasswordPh: "Минимум 8 символов",
    resetSubmit: "Обновить пароль", resetLoading: "Обновление...", resetSuccess: "Пароль успешно обновлён.",
    verifyTitle: "Подтвердите эл. почту", verifySub: "Почти готово!",
    verifyDesc: "Нажмите на ссылку, отправленную на вашу эл. почту, для подтверждения аккаунта.",
    verifySuccess: "Адрес эл. почты успешно подтверждён.", verifyLoading: "Проверка...",
    backToLogin: "Вернуться к входу", rememberPassword: "Я вспомнил пароль",
  },
  home: {
    pill: "Atlasio 2026 • Global Learning Grid", activePill: "Сейчас", activeCount: "студентов онлайн",
    title1: "Образование мирового", title2: "класса — онлайн",
    slogan: "Цифровая платформа, превращающая знания в ценность",
    desc: "Живые уроки, умная доска, AI-ментор и сертификаты — всё в одном экране для преподавателей, студентов и организаций.",
    ctaStart: "Начать бесплатно", ctaDemo: "▶ Смотреть демо", ctaCatalog: "Каталог курсов",
    trustedBy: "Доверяют:", universities: "42 университета",
    companies: "180 компаний", countries: "64 страны",
    statsTitle: "Статистика платформы", statsHeading: "Atlasio в цифрах",
    featuresTitle: "Возможности", featuresHeading: "Всё в одной платформе",
    featuresDesc: "От индивидуального до корпоративного — все решения под одной крышей.",
    pricingTitle: "Тарифы", pricingHeading: "Выберите свой план",
    pricingDesc: "Гибкие тарифы, масштабируемые под ваши нужды.",
    ctaHeading: "Начните учиться сегодня", ctaDesc: "14 дней бесплатно. Без кредитной карты.",
    ctaRegister: "Создать аккаунт", ctaBrowse: "Просмотреть курсы",
    testimonialTitle: "Отзывы", testimonialHeading: "Тысячи довольных пользователей",
    freePlan: "Бесплатно", proPlan: "Pro", enterprisePlan: "Корпоративный",
    monthSuffix: "/мес", customPrice: "Индивидуальная цена",
    planCtaFree: "Начать", planCtaPro: "Перейти на Pro", planCtaEnterprise: "Связаться с нами",
    planDescFree: "Идеально для старта", planDescPro: "Для студентов и преподавателей",
    planDescEnterprise: "Для компаний и университетов", highlighted: "Самый популярный",
  },
  dashboard: {
    deniedTitle: "Эта панель только для администраторов и главных преподавателей.",
    deniedDesc: (role) => `Текущая роль: ${role}. Смените роль в верхней панели для доступа.`,
    welcomeBack: "С возвращением",
    quickActions: "Быстрые действия", recentActivity: "Последние действия",
    upcomingLive: "Предстоящие прямые эфиры", myMaterials: "Мои материалы",
    uploadAssignment: "Загрузить задание", pendingApprovals: "Ожидают одобрения",
  },
  courses: {
    catalogTitle: "Каталог курсов", catalogDesc: "Профессиональные курсы и сертификационные программы",
    searchPh: "Найти курс или преподавателя...", filterAll: "Все", filterFree: "Бесплатные", filterPremium: "Премиум",
    sortNewest: "Новейшие", sortOldest: "Старейшие", sortPopular: "Популярные", sortRating: "Высший рейтинг",
    enrolled: "Записан", enroll: "Записаться", continue: "Продолжить", preview: "Предпросмотр",
    free: "Бесплатно", duration: "Длительность", lessons: "Урок", students: "Студент",
    rating: "Рейтинг", instructor: "Преподаватель", level: "Уровень", certificate: "Сертификат",
    noCoursesFound: "Курсы не найдены", loadMore: "Загрузить ещё",
    detailOverview: "Обзор", detailCurriculum: "Программа",
    detailInstructor: "Преподаватель", detailReviews: "Отзывы", detailEnroll: "Записаться на курс",
    myCoursesContinue: "В процессе", myCoursesCompleted: "Завершённые", myCoursesAll: "Все",
    skillProfile: "Мой профиль навыков",
  },
  live: {
    title: "Прямые трансляции", subtitle: "Занятия в реальном времени и по расписанию",
    statusRunning: "В ЭФИРЕ", statusScheduled: "Запланировано", statusEnded: "Завершено",
    joinBtn: "Войти на урок", scheduleBtn: "Запланировать", endedLabel: "Завершено",
    noSessions: "Активных сеансов не найдено", demoNote: "Отображаются демо-данные",
    participantsLabel: "Участников", durationLabel: "Длительность",
  },
  whiteboard: {
    labels: {
      actionsTitle: "Быстрые действия",
      quickActions: {
        pdf: "Загрузить PDF", presentation: "Добавить презентацию", shareScreen: "Поделиться экраном",
        cameraOn: "Камера вкл.", cameraOff: "Камера выкл.", quiz: "Запустить тест", downloadPng: "Скачать PNG",
      },
      viewRole: { instructor: "Вид преподавателя", student: "Вид студента" },
      background: "Фон", thickness: "Толщина", color: "Цвет",
      pages: "Страница", newPage: "Новая страница", undo: "Отменить", redo: "Повторить",
      clear: "Очистить", close: "Закрыть", privateMsg: "Личное сообщение",
      privateTo: "Студент", noMsg: "Сообщений нет.", send: "Отправить",
    },
  },
  profile: {
    title: "Мой профиль", subtitle: "Управление данными аккаунта",
    personalInfo: "Личные данные", security: "Безопасность", preferences: "Настройки",
    displayName: "Отображаемое имя", displayNamePh: "Ваше имя",
    emailLabel: "Эл. почта", currentPassword: "Текущий пароль", newPassword: "Новый пароль",
    changePhoto: "Изменить фото", saveChanges: "Сохранить изменения",
    saving: "Сохранение...", successSaved: "Успешно сохранено", errorSave: "Ошибка сохранения",
    language: "Язык", theme: "Тема", notifications: "Уведомления",
    darkTheme: "Тёмная", lightTheme: "Светлая", systemTheme: "Системная",
  },
  notifications: {
    title: "Уведомления", subtitle: "Все системные уведомления",
    markAllRead: "Отметить все как прочитанные", clearAll: "Очистить все",
    noNotifications: "Уведомлений нет",
    filterAll: "Все", filterUnread: "Непрочитанные", filterSystem: "Система",
    typeLesson: "Урок", typeCertificate: "Сертификат", typeAlarm: "Сигнал", typeSystem: "Система",
  },
  leaderboard: {
    title: "Таблица лидеров", subtitle: "Выделяйтесь в учёбе",
    rankLabel: "Место", studentLabel: "Студент", xpLabel: "XP",
    badgesLabel: "Значки", streakLabel: "Серия", completedLabel: "Завершено",
    filterWeek: "Эта неделя", filterMonth: "Этот месяц", filterAll: "За всё время",
    yourRank: "Ваше место", topPerformers: "Лучшие результаты",
  },
  progress: {
    title: "Мой прогресс", subtitle: "Следите за своим учебным путём",
    overallProgress: "Общий прогресс", coursesInProgress: "Курсы в процессе",
    completedCourses: "Завершённые курсы", totalXP: "Итого XP",
    currentStreak: "Текущая серия", weeklyGoal: "Еженедельная цель",
    achievements: "Достижения", badges: "Значки",
    noProgress: "Прогресса пока нет", startLearning: "Начать обучение",
  },
  reportCards: {
    title: "Табели и отчёты", subtitle: "Периодическая академическая оценка",
    period: "Период", overallGrade: "Общая оценка", attendance: "Посещаемость",
    performance: "Успеваемость", comments: "Комментарии", downloadPDF: "Скачать PDF",
    noReports: "Отчёты не найдены",
  },
  certificates: {
    title: "Мои сертификаты", subtitle: "Цифровые документы о квалификации",
    issuedOn: "Дата выдачи", expiresOn: "Срок действия", verifyBtn: "Проверить",
    downloadBtn: "Скачать", shareBtn: "Поделиться", renewBtn: "Продлить",
    noCertificates: "Сертификаты не найдены",
    verifyTitle: "Проверка сертификата", verifyDesc: "Введите код сертификата для проверки",
    verifySubmit: "Проверить сертификат", verifyPh: "Код сертификата",
    verifySuccess: "Сертификат действителен", verifyFail: "Сертификат недействителен или не найден",
  },
  exams: {
    title: "Экзамены", subtitle: "История экзаменов и тестов",
    startExam: "Начать экзамен", reviewExam: "Просмотр", retakeExam: "Пересдать",
    timeLeft: "Осталось времени", questionsCount: "Количество вопросов", passScore: "Проходной балл",
    status: { pending: "Ожидает", passed: "Сдан", failed: "Не сдан", inProgress: "В процессе" },
    resultsTitle: "Результаты экзамена", yourScore: "Ваш балл", correctAnswers: "Правильные ответы",
    adaptiveTitle: "Адаптивный экзамен", adaptiveDesc: "Вопросы автоматически подстраиваются под ваш уровень",
    difficulty: { easy: "Лёгкий", medium: "Средний", hard: "Сложный" },
  },
  ai: {
    title: "AI Ментор", subtitle: "Персонализированная учебная поддержка — мгновенно.",
    online: "Онлайн", placeholder: "Задайте вопрос… (Shift+Enter — новая строка, Enter — отправить)",
    sendBtn: "Спросить",
    chips: ["Объясни тему", "Приведи пример", "Напиши вопрос к экзамену", "Сделай резюме", "Что я узнал?"],
    sources: "Источники", confidence: "Уверенность", lowConfidence: "Низкая уверенность — проверьте",
    disclaimer: "Ghost Mentor на базе ИИ — для важных решений обращайтесь к преподавателю.",
    clearChat: "Очистить чат",
    contentTitle: "Обработчик контента", contentDesc: "Анализ PDF, презентаций и документов",
    tabs: { chat: "Чат с ментором", content: "Обработчик контента" },
  },
  booking: {
    title: "Запись на занятие", subtitle: "Запланируйте индивидуальный сеанс с преподавателем",
    selectDate: "Выбрать дату", selectTime: "Выбрать время", selectInstructor: "Выбрать преподавателя",
    duration: "Длительность", notes: "Заметки", notesPh: "Введите заметки к сеансу...",
    submit: "Записаться", submitting: "Идёт запись...",
    success: "Запись успешно создана",
    cancelBtn: "Отменить", rescheduleBtn: "Перенести",
    upcomingSessions: "Предстоящие сеансы", pastSessions: "Прошедшие сеансы",
    noSessions: "Сеансы не найдены", availableSlots: "Доступные временные слоты",
  },
  payments: {
    title: "Платежи", subtitle: "Подписка и история оплат",
    currentPlan: "Текущий план", upgradePlan: "Улучшить план", manageBilling: "Управление счётом",
    invoices: "Счета", paymentMethod: "Способ оплаты",
    successTitle: "Оплата прошла!", successDesc: "Ваш план активирован.",
    successBtn: "Перейти к курсам",
    cancelTitle: "Оплата отменена", cancelDesc: "Платёж был отменён. Средства не списаны.",
    cancelBtn: "Попробовать снова",
    amount: "Сумма", date: "Дата", status: "Статус", invoice: "Счёт",
  },
  guardian: {
    title: "Панель родителя", subtitle: "Следите за обучением вашего ребёнка",
    childrenLabel: "Мои ученики", addChild: "Добавить ученика",
    progressLabel: "Прогресс", attendanceLabel: "Посещаемость", gradesLabel: "Оценки",
    messagesLabel: "Сообщения", reportLabel: "Получить отчёт", noChildren: "Учеников не зарегистрировано",
  },
  learningPlans: {
    title: "Учебные планы", subtitle: "Ваши персональные образовательные пути",
    createPlan: "Создать план", myPlans: "Мои планы", recommended: "Рекомендовано",
    duration: "Длительность", modules: "Модуль", startPlan: "Начать план",
    progress: "Прогресс", completed: "Завершено", noPlans: "Планы не найдены",
  },
  instructor: {
    title: "Центр преподавателя", subtitle: "Управляйте своим преподавательским опытом",
    analytics: "Аналитика", courseBuilder: "Конструктор курсов", earnings: "Мои доходы",
    insights: "Анализ студентов", aiStudio: "AI Студия", aiQueue: "Очередь AI",
    volunteer: "Волонтёрская программа",
    studentsLabel: "Студенты", coursesLabel: "Курсы",
    revenueLabel: "Доход", ratingLabel: "Рейтинг",
  },
  admin: {
    title: "Панель администратора", subtitle: "Управление платформой и мониторинг",
    users: "Пользователи", content: "Контент", security: "Безопасность", payments: "Платежи",
    reports: "Отчёты", settings: "Настройки", monitoring: "Мониторинг",
    email: "Эл. почта", sso: "SSO", lti: "LTI", connectors: "Интеграции",
    departments: "Отделы", automation: "Автоматизация", aiAgents: "AI-агенты",
    approvals: "Одобрения", volunteer: "Волонтёры", alarms: "Сигналы",
    observability: "Наблюдаемость", proctoring: "Наблюдение за экзаменами", tools: "Инструменты",
    totalUsers: "Всего пользователей", activeToday: "Активны сегодня",
    revenue: "Доход", uptime: "Время работы",
  },
  errors: {
    notFoundTitle: "Страница не найдена",
    notFoundDesc: "Страница, которую вы ищете, могла быть перемещена, удалена или не существовать.",
    notFoundHome: "Главная страница", notFoundCatalog: "Просмотр курсов",
    serverError: "Произошла ошибка сервера. Повторите попытку.",
    unauthorized: "У вас нет прав для просмотра этой страницы.",
    forbidden: "Доступ запрещён.",
    networkError: "Ошибка соединения. Проверьте интернет-подключение.",
  },
  roadmap: {
    title: "Моя карта обучения", subtitle: "Планируйте свой карьерный путь",
    milestones: "Вехи", upcoming: "Предстоящие", completed: "Завершённые",
    inProgress: "В процессе", noMilestones: "Вехи не найдены",
  },
  peerReview: {
    title: "Взаимная проверка", subtitle: "Учитесь вместе, оценивайте вместе",
    submitWork: "Отправить работу", reviewPeers: "Проверить сокурсников", myReviews: "Мои проверки",
    criteria: "Критерий", score: "Балл", feedback: "Обратная связь",
    feedbackPh: "Напишите свою оценку...", submitReview: "Отправить проверку",
    noReviews: "Проверки не найдены",
  },
  languageLab: {
    title: "Языковая лаборатория", subtitle: "Практикуйте иностранный язык",
    practiceBtn: "Практиковаться", vocabulary: "Словарный запас", grammar: "Грамматика",
    listening: "Аудирование", speaking: "Разговорная речь", writing: "Письмо",
    levelBeginner: "Начальный", levelIntermediate: "Средний", levelAdvanced: "Продвинутый",
    streak: "Серия", xpEarned: "Заработано XP",
  },
  mathLab: {
    title: "Математическая лаборатория", subtitle: "Инструменты вычислений и графики",
    calculate: "Вычислить", graph: "График", matrix: "Матрица", statistics: "Статистика",
    expression: "Выражение", expressionPh: "Введите математическое выражение...",
    solveBtn: "Решить", result: "Результат", history: "История", noHistory: "Истории нет",
  },
  adaptiveQuiz: {
    title: "Адаптивный тест", subtitle: "Вопросы подстраиваются под ваш уровень",
    startBtn: "Начать тест", continueBtn: "Продолжить", nextBtn: "Далее",
    questionLabel: "Вопрос", difficulty: "Сложность", submitAnswer: "Ответить",
    correctAnswer: "Верно!", wrongAnswer: "Неверно", explanation: "Объяснение",
    quizComplete: "Тест завершён!", yourScore: "Ваш результат", retryBtn: "Попробовать снова",
    selectCourse: "Выбрать курс", selectDifficulty: "Выбрать сложность", questionsCount: "Количество вопросов",
  },
  analytics: {
    title: "Центр аналитики", subtitle: "Мониторинг платформы в реальном времени",
    liveData: "Живые данные", lastUpdated: "Последнее обновление", previousPeriod: "к прошлому периоду",
    totalEnrollments: "Всего записей", completionRate: "Процент завершения", totalRevenue: "Общий доход",
    activeUsers: "Активные пользователи", npsScore: "NPS-индекс", avgSession: "Ср. время сеанса",
    enrollmentTrend: "Тренд записей и завершений", completionTrend: "Активность студентов во времени",
    dailyRevenue: "Ежедневный доход", dailyRevenueDesc: "Распределение дохода за период",
    userActivity: "Активные пользователи", userActivityDesc: "Уникальных сеансов в день",
    topCourses: "Топ курсов", categoryDist: "Распределение по категориям",
    retention: "Анализ удержания когорт", retentionDesc: "Еженедельный показатель удержания",
    cohortLabel: "Когорта", weekLabel: "Нед.",
    courseTitle: "Название курса", enrollments: "Записи", completions: "Завершения", revenue: "Доход",
    demoData: "Отображаются демо-данные", minutesSuffix: "мин",
    day7: "7 дней", day30: "30 дней", day90: "90 дней",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
export const strings: Record<LangKey, I18nStrings> = { tr, en, de, ar, ru, kk: en };
