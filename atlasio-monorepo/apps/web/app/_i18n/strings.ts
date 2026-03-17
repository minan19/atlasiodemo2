export type LangKey = "tr" | "en" | "de" | "ar";

export type I18nStrings = {
  nav: {
    brandSub: string;
    login: string;
    roleLabel: string;
    langLabel: string;
  };
  login: {
    heroPill: string;
    heroTitle1: string;
    heroTitle2: string;
    heroDesc: string;
    formTitle: string;
    formSub: string;
    email: string;
    emailPh: string;
    password: string;
    passwordPh: string;
    loading: string;
    submit: string;
    roleButtons: { key: string; label: string }[];
  };
  whiteboard: {
    labels: {
      actionsTitle: string;
      quickActions: {
        pdf: string;
        presentation: string;
        shareScreen: string;
        cameraOn: string;
        cameraOff: string;
        quiz: string;
        downloadPng: string;
      };
      viewRole: { instructor: string; student: string };
      background: string;
      thickness: string;
      color: string;
      pages: string;
      newPage: string;
      undo: string;
      redo: string;
      clear: string;
      close: string;
      privateMsg: string;
      privateTo: string;
      noMsg: string;
      send: string;
    };
  };
  dashboard: {
    deniedTitle: string;
    deniedDesc: (role: string) => string;
  };
};

export const strings: Record<LangKey, I18nStrings> = {
  tr: {
    nav: { brandSub: "Global Öğrenme Ağı", login: "Giriş", roleLabel: "Rol", langLabel: "Dil" },
    login: {
      heroPill: "Çok rollü erişim · SSO hazır",
      heroTitle1: "Tek ekrandan",
      heroTitle2: "tüm Atlasio rol girişleri",
      heroDesc: "Admin, eğitmen, öğrenci ve veli oturumları için birleşik giriş. MFA / token saklama uyumlu, zero-trust ilkesiyle tasarlandı.",
      formTitle: "Giriş",
      formSub: "Atlasio kimlik doğrulama merkezi",
      email: "E-posta",
      emailPh: "email",
      password: "Parola",
      passwordPh: "password",
      loading: "Giriş yapılıyor...",
      submit: "Giriş yap",
      roleButtons: [
        { key: "admin", label: "Admin" },
        { key: "instructor", label: "Eğitmen" },
        { key: "student", label: "Öğrenci" },
        { key: "guardian", label: "Veli" },
      ],
    },
    whiteboard: {
      labels: {
        actionsTitle: "Hızlı Eylemler",
      quickActions: {
        pdf: "PDF Yükle",
        presentation: "Sunum Ekle",
        shareScreen: "Ekran Paylaş",
        cameraOn: "Kamera",
        cameraOff: "Kamera Kapat",
        quiz: "Quiz Yayınla",
        downloadPng: "PNG İndir",
      },
        viewRole: { instructor: "Eğitmen görünümü", student: "Öğrenci görünümü" },
        background: "Zemin",
        thickness: "Kalınlık",
        color: "Renk",
        pages: "Sayfa",
        newPage: "Yeni Sayfa",
        undo: "Undo",
        redo: "Redo",
        clear: "Temizle",
        close: "Kapat",
        privateMsg: "Özel Mesaj",
        privateTo: "Öğrenci",
        noMsg: "Mesaj yok.",
        send: "Gönder",
      },
    },
    dashboard: {
      deniedTitle: "Bu panel yalnızca yönetici ve baş eğitmen içindir.",
      deniedDesc: (role) => `Seçili rol: ${role}. Rolünü üst barda değiştirerek erişebilirsin.`,
    },
  },
  en: {
    nav: { brandSub: "Global Learning Grid", login: "Sign in", roleLabel: "Role", langLabel: "Lang" },
    login: {
      heroPill: "Multi-role access · SSO ready",
      heroTitle1: "One screen for",
      heroTitle2: "all Atlasio roles",
      heroDesc: "Unified login for admin, instructor, student and guardian. MFA-ready, zero-trust friendly.",
      formTitle: "Sign in",
      formSub: "Atlasio identity hub",
      email: "Email",
      emailPh: "email",
      password: "Password",
      passwordPh: "password",
      loading: "Signing in...",
      submit: "Sign in",
      roleButtons: [
        { key: "admin", label: "Admin" },
        { key: "instructor", label: "Instructor" },
        { key: "student", label: "Student" },
        { key: "guardian", label: "Guardian" },
      ],
    },
    whiteboard: {
      labels: {
        actionsTitle: "Quick Actions",
      quickActions: {
        pdf: "Upload PDF",
        presentation: "Add Deck",
        shareScreen: "Share Screen",
        cameraOn: "Camera",
        cameraOff: "Stop Camera",
        quiz: "Publish Quiz",
        downloadPng: "Export PNG",
      },
        viewRole: { instructor: "Instructor view", student: "Student view" },
        background: "Background",
        thickness: "Thickness",
        color: "Color",
        pages: "Page",
        newPage: "New Page",
        undo: "Undo",
        redo: "Redo",
        clear: "Clear",
        close: "Close",
        privateMsg: "Private Message",
        privateTo: "Student",
        noMsg: "No messages.",
        send: "Send",
      },
    },
    dashboard: {
      deniedTitle: "This panel is for admins and head instructors only.",
      deniedDesc: (role) => `Selected role: ${role}. Switch role from the top bar to access.`,
    },
  },
  de: {
    nav: { brandSub: "Globales Lernnetz", login: "Anmelden", roleLabel: "Rolle", langLabel: "Sprache" },
    login: {
      heroPill: "Multi-Role Zugriff · SSO bereit",
      heroTitle1: "Ein Bildschirm für",
      heroTitle2: "alle Atlasio-Rollen",
      heroDesc: "Vereinigter Login für Admin, Dozent, Schüler und Eltern. MFA-tauglich, Zero-Trust freundlich.",
      formTitle: "Anmelden",
      formSub: "Atlasio Identity Hub",
      email: "E-Mail",
      emailPh: "email",
      password: "Passwort",
      passwordPh: "passwort",
      loading: "Anmeldung...",
      submit: "Anmelden",
      roleButtons: [
        { key: "admin", label: "Admin" },
        { key: "instructor", label: "Dozent" },
        { key: "student", label: "Student" },
        { key: "guardian", label: "Eltern" },
      ],
    },
    whiteboard: {
      labels: {
        actionsTitle: "Schnelle Aktionen",
      quickActions: {
        pdf: "PDF hochladen",
        presentation: "Präsentation",
        shareScreen: "Bildschirm teilen",
        cameraOn: "Kamera",
        cameraOff: "Kamera aus",
        quiz: "Quiz senden",
        downloadPng: "PNG export",
      },
        viewRole: { instructor: "Dozentenansicht", student: "Studentenansicht" },
        background: "Hintergrund",
        thickness: "Dicke",
        color: "Farbe",
        pages: "Seite",
        newPage: "Neue Seite",
        undo: "Undo",
        redo: "Redo",
        clear: "Leeren",
        close: "Schließen",
        privateMsg: "Private Nachricht",
        privateTo: "Student",
        noMsg: "Keine Nachrichten.",
        send: "Senden",
      },
    },
    dashboard: {
      deniedTitle: "Dieses Panel ist nur für Admins und Leitende Dozenten.",
      deniedDesc: (role) => `Gewählte Rolle: ${role}. Rolle oben ändern, um Zugriff zu erhalten.`,
    },
  },
  ar: {
    nav: { brandSub: "شبكة التعلم العالمية", login: "تسجيل الدخول", roleLabel: "الدور", langLabel: "اللغة" },
    login: {
      heroPill: "وصول متعدد الأدوار · جاهز SSO",
      heroTitle1: "من شاشة واحدة",
      heroTitle2: "لجميع أدوار أطلسيو",
      heroDesc: "تسجيل موحد للمدير والمعلم والطالب والوصي. يدعم MFA ونهج الثقة الصفرية.",
      formTitle: "تسجيل الدخول",
      formSub: "مركز هوية أطلسيو",
      email: "البريد الإلكتروني",
      emailPh: "email",
      password: "كلمة المرور",
      passwordPh: "password",
      loading: "جاري تسجيل الدخول...",
      submit: "تسجيل الدخول",
      roleButtons: [
        { key: "admin", label: "مشرف" },
        { key: "instructor", label: "معلم" },
        { key: "student", label: "طالب" },
        { key: "guardian", label: "ولي أمر" },
      ],
    },
    whiteboard: {
      labels: {
        actionsTitle: "إجراءات سريعة",
      quickActions: {
        pdf: "رفع PDF",
        presentation: "إضافة عرض",
        shareScreen: "مشاركة الشاشة",
        cameraOn: "الكاميرا",
        cameraOff: "إيقاف الكاميرا",
        quiz: "نشر الاختبار",
        downloadPng: "تصدير PNG",
      },
        viewRole: { instructor: "عرض المعلم", student: "عرض الطالب" },
        background: "الخلفية",
        thickness: "السُمك",
        color: "اللون",
        pages: "صفحة",
        newPage: "صفحة جديدة",
        undo: "تراجع",
        redo: "إعادة",
        clear: "مسح",
        close: "إغلاق",
        privateMsg: "رسالة خاصة",
        privateTo: "طالب",
        noMsg: "لا توجد رسائل.",
        send: "إرسال",
      },
    },
    dashboard: {
      deniedTitle: "هذه اللوحة للمشرفين ورؤساء المعلمين فقط.",
      deniedDesc: (role) => `الدور المحدد: ${role}. غيّر الدور من الشريط العلوي للوصول.`,
    },
  },
};
