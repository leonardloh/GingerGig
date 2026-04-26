// i18n.jsx — translation strings for Ginger Gig
// 4 languages: Bahasa Malaysia (ms), English (en), Mandarin (zh), Tamil (ta)

const I18N = {
  // ─── Common ───
  appName: {
    ms: "Ginger Gig",
    en: "Ginger Gig",
    zh: "Ginger Gig",
    ta: "Ginger Gig",
  },
  tagline: {
    ms: "Pasaran komuniti untuk warga emas",
    en: "A neighborhood marketplace for retirees",
    zh: "邻里间的银发经济市场",
    ta: "ஓய்வுபெற்றவர்களுக்கான சமூக சந்தை",
  },
  continue: { ms: "Teruskan", en: "Continue", zh: "继续", ta: "தொடரவும்" },
  back: { ms: "Kembali", en: "Back", zh: "返回", ta: "பின்செல்" },
  cancel: { ms: "Batal", en: "Cancel", zh: "取消", ta: "ரத்து" },
  search: { ms: "Cari", en: "Search", zh: "搜索", ta: "தேடு" },
  done: { ms: "Selesai", en: "Done", zh: "完成", ta: "முடிந்தது" },
  perMonth: { ms: "sebulan", en: "this month", zh: "本月", ta: "இந்த மாதம்" },
  aiGenerated: {
    ms: "Dijana oleh AI",
    en: "AI Generated",
    zh: "AI 生成",
    ta: "AI உருவாக்கியது",
  },

  // ─── SCREEN 1: Language ───
  welcome: {
    ms: "Selamat Datang",
    en: "Selamat Datang",
    zh: "Selamat Datang",
    ta: "Selamat Datang",
  },
  chooseLanguage: {
    ms: "Pilih bahasa anda",
    en: "Choose your language",
    zh: "选择您的语言",
    ta: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்",
  },
  setupWithFamily: {
    ms: "Sediakan dengan ahli keluarga",
    en: "Set up with a family member",
    zh: "由家人协助设置",
    ta: "குடும்ப உறுப்பினருடன் அமைக்கவும்",
  },

  // ─── SCREEN 2: Voice-to-profile ───
  v_title: {
    ms: "Beritahu kami apa yang anda boleh buat",
    en: "Tell us what you can do",
    zh: "告诉我们您能做什么",
    ta: "உங்களால் என்ன செய்ய முடியும் என்று சொல்லுங்கள்",
  },
  v_subtitle: {
    ms: "Bercakap secara semula jadi. Kami akan uruskan selebihnya.",
    en: "Just speak naturally. We'll handle the rest.",
    zh: "请自然地说话,其余交给我们处理。",
    ta: "இயல்பாகப் பேசுங்கள். மீதியை நாங்கள் கவனித்துக் கொள்வோம்.",
  },
  v_guideline_title: {
    ms: "Apa yang perlu disebut",
    en: "What to say",
    zh: "可以说些什么",
    ta: "என்ன சொல்ல வேண்டும்",
  },
  v_guideline_subtitle: {
    ms: "Sebut perkara ini jika sesuai. Tidak perlu ikut susunan.",
    en: "Mention these if you can. No need to follow the order.",
    zh: "可以的话请提到这些内容，不必按顺序。",
    ta: "முடிந்தால் இவற்றைச் சொல்லுங்கள். வரிசையாக சொல்ல வேண்டிய அவசியம் இல்லை.",
  },
  v_guideline_items: {
    ms: [
      "Perkhidmatan yang anda tawarkan dan pengalaman anda.",
      "Jenis kerja: memasak, kraf, jaga haiwan, bantuan rumah, atau lain-lain.",
      "Harga dan unit, contohnya RM15 setiap hidangan atau RM30 sejam.",
      "Berapa ramai pelanggan boleh dilayan.",
      "Hari dan masa anda tersedia.",
      "Kawasan perkhidmatan dan jarak perjalanan.",
      "Maklumat penting seperti halal, vegetarian, atau keperluan khas.",
    ],
    en: [
      "The service you offer and your experience.",
      "Type of work: cooking, crafts, pet sitting, household help, or other.",
      "Price and unit, like RM15 per meal or RM30 per hour.",
      "How many customers you can serve.",
      "Days and times you are available.",
      "Service area and how far you can travel.",
      "Important details like halal, vegetarian, or special requirements.",
    ],
    zh: [
      "您提供的服务和经验。",
      "服务类型：烹饪、手工艺、宠物照顾、家务帮忙或其他。",
      "价格和单位，例如每份 RM15 或每小时 RM30。",
      "您一次可以服务多少位顾客。",
      "您可接单的日期和时间。",
      "服务地区和可出行距离。",
      "重要资料，例如 halal、素食或特别要求。",
    ],
    ta: [
      "நீங்கள் வழங்கும் சேவை மற்றும் உங்கள் அனுபவம்.",
      "வேலை வகை: சமையல், கைவினை, செல்லப்பிராணி பராமரிப்பு, வீட்டு உதவி, அல்லது மற்றவை.",
      "விலை மற்றும் அலகு, உதாரணமாக ஒரு உணவுக்கு RM15 அல்லது ஒரு மணிக்கு RM30.",
      "எத்தனை வாடிக்கையாளர்களுக்கு சேவை செய்ய முடியும்.",
      "நீங்கள் கிடைக்கும் நாட்கள் மற்றும் நேரம்.",
      "சேவை பகுதி மற்றும் எவ்வளவு தூரம் செல்ல முடியும்.",
      "ஹலால், சைவம், அல்லது சிறப்பு தேவைகள் போன்ற முக்கிய விவரங்கள்.",
    ],
  },
  v_tap: {
    ms: "Ketuk untuk mula bercakap",
    en: "Tap to start speaking",
    zh: "点击开始说话",
    ta: "பேச தொடங்க தட்டவும்",
  },
  v_stop: {
    ms: "Ketuk untuk berhenti",
    en: "Tap to stop",
    zh: "点击停止",
    ta: "நிறுத்த தட்டவும்",
  },
  v_example: {
    ms: "Contoh: \u201CSaya pandai masak rendang, nasi lemak, lauk Melayu kampung\u2026\u201D",
    en: "Example: \u201CI can cook traditional Malay food — rendang, nasi lemak, kampung dishes\u2026\u201D",
    zh: "例如:“我会做传统马来菜 — 仁当、椰浆饭、乡村菜⋯”",
    ta: "உதாரணம்: \u201Cநான் பாரம்பரிய மலாய் உணவு சமைப்பேன் — ரெண்டாங், நாசி லெமாக்⋯\u201D",
  },
  v_processing: {
    ms: "Menjana penyenaraian anda\u2026",
    en: "Generating your listing\u2026",
    zh: "正在为您生成列表⋯",
    ta: "உங்கள் பட்டியலை உருவாக்குகிறோம்⋯",
  },
  v_step1: {
    ms: "Mendengar suara anda\u2026",
    en: "Listening to your voice\u2026",
    zh: "正在聆听您的声音⋯",
    ta: "உங்கள் குரலைக் கேட்கிறோம்⋯",
  },
  v_step1_typed: {
    ms: "Membaca perkataan anda\u2026",
    en: "Reading what you wrote\u2026",
    zh: "正在阅读您输入的内容⋯",
    ta: "நீங்கள் எழுதியதைப் படிக்கிறோம்⋯",
  },
  v_step2: {
    ms: "Memahami kemahiran anda\u2026",
    en: "Understanding your skills\u2026",
    zh: "理解您的技能⋯",
    ta: "உங்கள் திறமைகளை புரிந்துகொள்கிறோம்⋯",
  },
  v_step3: {
    ms: "Mencipta penyenaraian anda\u2026",
    en: "Creating your listing\u2026",
    zh: "正在创建您的列表⋯",
    ta: "உங்கள் பட்டியலை உருவாக்குகிறோம்⋯",
  },
  v_looksGood: {
    ms: "Ini nampak bagus!",
    en: "This looks good!",
    zh: "看起来不错!",
    ta: "இது நன்றாக இருக்கிறது!",
  },
  bookingConfirmed: {
    ms: "Tempahan disahkan",
    en: "Booking confirmed",
    zh: "预订已确认",
    ta: "முன்பதிவு உறுதி செய்யப்பட்டது",
  },
  confirmedNote: {
    ms: "Pelanggan telah dimaklumkan. Kami akan hantar peringatan.",
    en: "The customer has been notified. We'll send a reminder before the booking.",
    zh: "客户已收到通知。我们会在预订前发送提醒。",
    ta: "வாடிக்கையாளருக்கு அறிவிக்கப்பட்டது. நினைவூட்டல் அனுப்பப்படும்.",
  },
  v_tryAgain: {
    ms: "Cuba sekali lagi",
    en: "Let me try again",
    zh: "再试一次",
    ta: "மீண்டும் முயற்சிக்கவும்",
  },
  v_orType: {
    ms: "atau taip sahaja",
    en: "or type instead",
    zh: "或改为输入文字",
    ta: "அல்லது தட்டச்சு செய்யவும்",
  },
  v_editListing: {
    ms: "Edit penyenaraian",
    en: "Edit listing",
    zh: "编辑列表",
    ta: "பட்டியலைத் திருத்து",
  },
  v_doneEditing: {
    ms: "Simpan",
    en: "Save changes",
    zh: "保存更改",
    ta: "சேமி",
  },
  v_cancelEdit: {
    ms: "Batal",
    en: "Cancel",
    zh: "取消",
    ta: "ரத்து செய்",
  },
  v_discardChanges: {
    ms: "Buang perubahan?",
    en: "Discard changes?",
    zh: "放弃更改吗？",
    ta: "மாற்றங்களை விட்டுவிடவா?",
  },
  v_keepEditing: {
    ms: "Teruskan edit",
    en: "Keep editing",
    zh: "继续编辑",
    ta: "தொடர்ந்து திருத்து",
  },
  v_discardYes: {
    ms: "Ya, buang",
    en: "Yes, discard",
    zh: "是，放弃",
    ta: "ஆம், விட்டுவிடு",
  },
  v_serviceTitle: {
    ms: "Tajuk perkhidmatan",
    en: "Service title",
    zh: "服务标题",
    ta: "சேவை தலைப்பு",
  },
  v_description: {
    ms: "Penerangan",
    en: "Description",
    zh: "描述",
    ta: "விவரம்",
  },
  v_useVoice: {
    ms: "Gunakan suara",
    en: "Use voice instead",
    zh: "改用语音",
    ta: "குரலைப் பயன்படுத்தவும்",
  },
  v_typePlaceholder: {
    ms: "Tulis apa yang anda boleh buat\u2026",
    en: "Type what you can do\u2026",
    zh: "输入您能做的事⋯",
    ta: "உங்களால் என்ன செய்ய முடியும் என்று எழுதவும்⋯",
  },
  v_generate: {
    ms: "Jana penyenaraian",
    en: "Generate listing",
    zh: "生成列表",
    ta: "பட்டியலை உருவாக்கவும்",
  },
  v_suggestedPrice: {
    ms: "Harga dicadangkan",
    en: "Suggested price",
    zh: "建议价格",
    ta: "பரிந்துரைக்கப்பட்ட விலை",
  },
  v_availability: {
    ms: "Ketersediaan",
    en: "Availability",
    zh: "可预订时间",
    ta: "கிடைக்கும் நேரம்",
  },
  v_capacity: {
    ms: "Kapasiti",
    en: "Capacity",
    zh: "可服务人数",
    ta: "திறன்",
  },

  // ─── Dashboard earnings & bookings ───
  hello: { ms: "Helo", en: "Hello", zh: "您好,", ta: "வணக்கம்," },
  todayEarnings: {
    ms: "Pendapatan hari ini",
    en: "Earned today",
    zh: "今日收入",
    ta: "இன்றைய வருமானம்",
  },
  lastBooking: {
    ms: "Tempahan terakhir",
    en: "Most recent booking",
    zh: "最近的订单",
    ta: "சமீபத்திய பதிவு",
  },
  totalToday: {
    ms: "tempahan disiapkan hari ini",
    en: "bookings completed today",
    zh: "今日已完成订单",
    ta: "இன்று முடிக்கப்பட்ட பதிவுகள்",
  },
  needsAction: {
    ms: "Perlukan tindakan",
    en: "Needs your attention",
    zh: "需要回应",
    ta: "உங்கள் பதில் தேவை",
  },
  confirmedHeader: {
    ms: "Disahkan",
    en: "Confirmed",
    zh: "已确认",
    ta: "உறுதிப்படுத்தப்பட்டது",
  },
  completedHeader: {
    ms: "Selesai",
    en: "Recently completed",
    zh: "最近完成",
    ta: "சமீபத்தில் முடிந்தது",
  },
  thisMonth: {
    ms: "Pendapatan bulan ini",
    en: "This month",
    zh: "本月收入",
    ta: "இந்த மாதம்",
  },
  moreThanLast: {
    ms: "lebih daripada bulan lepas",
    en: "more than last month",
    zh: "比上个月多",
    ta: "கடந்த மாதத்தை விட அதிகம்",
  },
  yourListings: {
    ms: "Penyenaraian anda",
    en: "Your listings",
    zh: "您的服务",
    ta: "உங்கள் பட்டியல்கள்",
  },
  upcomingBookings: {
    ms: "Tempahan akan datang",
    en: "Upcoming bookings",
    zh: "即将到来的预订",
    ta: "வரவிருக்கும் முன்பதிவுகள்",
  },
  active: { ms: "Aktif", en: "Active", zh: "已开放", ta: "செயலில்" },
  paused: {
    ms: "Dijeda",
    en: "Paused",
    zh: "已暂停",
    ta: "இடைநிறுத்தப்பட்டது",
  },
  accept: { ms: "Terima", en: "Accept", zh: "接受", ta: "ஏற்கவும்" },
  decline: { ms: "Tolak", en: "Decline", zh: "拒绝", ta: "மறுக்கவும்" },
  bookings: {
    ms: "tempahan",
    en: "bookings",
    zh: "次预订",
    ta: "முன்பதிவுகள்",
  },
  learnAboutISaraan: {
    ms: "Ketahui tentang i-Saraan",
    en: "Learn about i-Saraan",
    zh: "了解 i-Saraan",
    ta: "i-Saraan பற்றி அறிய",
  },
  nudge_save: {
    ms: "Anda peroleh RM680 bulan ini! Mahu simpan RM50 untuk tabung ubat-ubatan?",
    en: "You earned RM680 this month! Would you like to set aside RM50 for your medication fund?",
    zh: "您本月赚了 RM680!想要拨出 RM50 作为药费储蓄吗?",
    ta: "இந்த மாதம் RM680 சம்பாதித்தீர்கள்! மருந்து நிதிக்கு RM50 ஒதுக்கி வைக்க விரும்புகிறீர்களா?",
  },

  // ─── SCREEN 4: Requestor home ───
  greetEvening: {
    ms: "Selamat petang",
    en: "Good evening",
    zh: "晚上好",
    ta: "மாலை வணக்கம்",
  },
  needToday: {
    ms: "Apa yang anda perlukan hari ini?",
    en: "What do you need today?",
    zh: "您今天需要什么?",
    ta: "இன்று உங்களுக்கு என்ன தேவை?",
  },
  searchPlaceholder: {
    ms: "Cari layanan atau bercakap\u2026",
    en: "Search services or speak\u2026",
    zh: "搜索服务或语音输入⋯",
    ta: "சேவைகளைத் தேடவும் அல்லது பேசவும்⋯",
  },
  cat_cooking: {
    ms: "Masakan rumah",
    en: "Home cooking",
    zh: "家常菜",
    ta: "வீட்டு சமையல்",
  },
  cat_crafts: {
    ms: "Kraf tradisional",
    en: "Traditional crafts",
    zh: "传统手工",
    ta: "பாரம்பரிய கைவினை",
  },
  cat_pet: {
    ms: "Jagaan haiwan",
    en: "Pet sitting",
    zh: "宠物照看",
    ta: "செல்லப்பிராணி பராமரிப்பு",
  },
  cat_household: {
    ms: "Bantuan rumah",
    en: "Household help",
    zh: "家务帮手",
    ta: "வீட்டு உதவி",
  },
  popularNearYou: {
    ms: "Popular berdekatan anda",
    en: "Popular near you",
    zh: "附近热门",
    ta: "உங்களுக்கு அருகில் பிரபலமானவை",
  },
  recentlyBooked: {
    ms: "Tempahan terkini",
    en: "Recently booked",
    zh: "最近预订",
    ta: "சமீபத்தில் முன்பதிவு",
  },
  away: { ms: "jauh", en: "away", zh: "外", ta: "தொலைவில்" },
  speakInstead: {
    ms: "Guna suara",
    en: "Speak instead",
    zh: "改用语音",
    ta: "பேசி உள்ளிடுங்கள்",
  },
  matchFilterHalal: { ms: "Halal", en: "Halal", zh: "清真", ta: "ஹலால்" },
  matchFilterWeekdays: {
    ms: "Hari bekerja",
    en: "Weekdays",
    zh: "工作日",
    ta: "வார நாட்கள்",
  },
  matchFilterBudget: {
    ms: "Bawah RM50/hidangan",
    en: "Under RM50/meal",
    zh: "每餐低于 RM50",
    ta: "ஒரு உணவுக்கு RM50-க்கு குறைவு",
  },
  matchFilterDistance: {
    ms: "Kurang 2 km",
    en: "< 2 km",
    zh: "< 2 公里",
    ta: "< 2 கி.மீ.",
  },
  whyThisMatch: {
    ms: "Sebab padanan ini",
    en: "Why this match",
    zh: "匹配原因",
    ta: "ஏன் இந்த பொருத்தம்",
  },
  from: { ms: "Dari", en: "From", zh: "起价", ta: "இருந்து" },
  favourite: {
    ms: "Kegemaran",
    en: "Favourite",
    zh: "收藏",
    ta: "விருப்பம்",
  },
  favourited: {
    ms: "Disimpan",
    en: "Favourited",
    zh: "已收藏",
    ta: "சேமிக்கப்பட்டது",
  },
  savedToFavourites: {
    ms: "Disimpan ke kegemaran",
    en: "Saved to favourites",
    zh: "已保存到收藏",
    ta: "விருப்பங்களில் சேமிக்கப்பட்டது",
  },
  age: { ms: "Umur", en: "Age", zh: "年龄", ta: "வயது" },
  stars: { ms: "bintang", en: "stars", zh: "星", ta: "நட்சத்திரங்கள்" },
  whatDoYouNeed: {
    ms: "Apa yang anda perlukan?",
    en: "What do you need?",
    zh: "您需要什么？",
    ta: "உங்களுக்கு என்ன தேவை?",
  },
  tellOwnWords: {
    ms: "Beritahu dengan kata anda sendiri",
    en: "Tell us in your own words",
    zh: "用您自己的话告诉我们",
    ta: "உங்கள் சொற்களில் சொல்லுங்கள்",
  },
  talk: { ms: "Bercakap", en: "Talk", zh: "说话", ta: "பேசு" },
  type: { ms: "Taip", en: "Type", zh: "输入", ta: "தட்டு" },
  tapTellLookingFor: {
    ms: "Ketuk dan beritahu apa yang anda cari",
    en: "Tap and tell us what you're looking for",
    zh: "点击并告诉我们您要找什么",
    ta: "தட்டி நீங்கள் தேடுவது என்ன என்று சொல்லுங்கள்",
  },
  listeningTapStop: {
    ms: "Mendengar... {time} · ketuk untuk berhenti",
    en: "Listening... {time} · tap to stop",
    zh: "正在聆听... {time} · 点击停止",
    ta: "கேட்கிறது... {time} · நிறுத்த தட்டவும்",
  },
  gotItReviewSearch: {
    ms: "Baik. Semak dan cari di bawah.",
    en: "Got it. Review and search below.",
    zh: "收到。请检查并继续搜索。",
    ta: "சரி. பார்த்து கீழே தேடுங்கள்.",
  },
  sampleSearch: {
    ms: "Atau cuba contoh: \"{sample}\"",
    en: "Or try a sample: \"{sample}\"",
    zh: "或试试示例：\"{sample}\"",
    ta: "அல்லது எடுத்துக்காட்டை முயற்சிக்கவும்: \"{sample}\"",
  },
  searchHintDetailed: {
    ms: "Nyatakan dengan jelas - jenis makanan, diet, kawasan, masa.",
    en: "Be as specific as you like - meal type, dietary, area, timing.",
    zh: "尽量具体说明：餐食类型、饮食偏好、区域和时间。",
    ta: "விரிவாக எழுதுங்கள் - உணவு வகை, உணவுப் பழக்கம், பகுதி, நேரம்.",
  },
  findMatches: {
    ms: "Cari padanan",
    en: "Find matches",
    zh: "查找匹配",
    ta: "பொருத்தங்களை காண்க",
  },

  // ─── SCREEN 5: Search results ───
  matchesFound: {
    ms: "padanan dijumpai",
    en: "matches found",
    zh: "个匹配结果",
    ta: "பொருத்தங்கள் கண்டுபிடிக்கப்பட்டன",
  },
  match: { ms: "padanan", en: "match", zh: "匹配", ta: "பொருத்தம்" },
  bookNow: {
    ms: "Tempah sekarang",
    en: "Book now",
    zh: "立即预订",
    ta: "இப்போதே முன்பதிவு",
  },

  // ─── SCREEN 6: Provider detail ───
  verified: {
    ms: "Disahkan",
    en: "Verified",
    zh: "已认证",
    ta: "சரிபார்க்கப்பட்டது",
  },
  reviews: { ms: "Ulasan", en: "Reviews", zh: "评价", ta: "மதிப்புரைகள்" },
  menu: { ms: "Menu", en: "Menu", zh: "菜单", ta: "மெனு" },
  bookThis: {
    ms: "Tempah perkhidmatan ini",
    en: "Book this service",
    zh: "预订此服务",
    ta: "இந்த சேவையை முன்பதிவு செய்க",
  },

  // ─── SCREEN 7: Companion ───
  mumActivity: {
    ms: "Aktiviti Mak",
    en: "Mum's activity",
    zh: "妈妈的活动",
    ta: "அம்மாவின் செயல்பாடு",
  },
  alerts: { ms: "Notifikasi", en: "Alerts", zh: "提醒", ta: "எச்சரிக்கைகள்" },
  timeline: { ms: "Garis masa", en: "Timeline", zh: "时间线", ta: "காலவரிசை" },

  // ─── Login screen ───
  loginSubtitle: {
    ms: "Log masuk ke akaun Ginger Gig anda",
    en: "Sign in to your Ginger Gig account",
    zh: "登入您的 Ginger Gig 账户",
    ta: "உங்கள் Ginger Gig கணக்கில் உள்நுழையவும்",
  },
  email: { ms: "E-mel", en: "Email", zh: "电子邮件", ta: "மின்னஞ்சல்" },
  password: { ms: "Kata laluan", en: "Password", zh: "密码", ta: "கடவுச்சொல்" },
  signIn: { ms: "Log masuk", en: "Sign in", zh: "登入", ta: "உள்நுழை" },
  noAccount: {
    ms: "Tiada akaun?",
    en: "Don't have an account?",
    zh: "还没有账户？",
    ta: "கணக்கு இல்லையா?",
  },
  createAccount: {
    ms: "Cipta akaun",
    en: "Create account",
    zh: "创建账户",
    ta: "கணக்கு உருவாக்கு",
  },
  orTryDemo: {
    ms: "atau cuba akaun demo",
    en: "or try a demo account",
    zh: "或使用示范账户",
    ta: "அல்லது டெமோ கணக்கை முயற்சிக்கவும்",
  },
  loginError: {
    ms: "E-mel atau kata laluan salah. Cuba salah satu akaun demo di bawah.",
    en: "Email or password is incorrect. Use one of the demo accounts below.",
    zh: "电子邮件或密码不正确。请使用下方的示范账户。",
    ta: "மின்னஞ்சல் அல்லது கடவுச்சொல் தவறானது. கீழே உள்ள டெமோ கணக்கை பயன்படுத்தவும்.",
  },

  // ─── Tabs ───
  tab_home: { ms: "Laman Utama", en: "Home", zh: "首页", ta: "முகப்பு" },
  tab_listings: {
    ms: "Penyenaraian",
    en: "Listings",
    zh: "我的服务",
    ta: "பட்டியல்கள்",
  },
  tab_earnings: {
    ms: "Pendapatan",
    en: "Earnings",
    zh: "收入",
    ta: "வருமானம்",
  },
  tab_profile: { ms: "Profil", en: "Profile", zh: "个人", ta: "சுயவிவரம்" },
  tab_search: { ms: "Cari", en: "Search", zh: "搜索", ta: "தேடல்" },
  tab_bookings: {
    ms: "Tempahan",
    en: "Bookings",
    zh: "预订",
    ta: "முன்பதிவுகள்",
  },
  tab_dashboard: {
    ms: "Papan pemuka",
    en: "Dashboard",
    zh: "概览",
    ta: "டாஷ்போர்டு",
  },
  tab_alerts: {
    ms: "Notifikasi",
    en: "Alerts",
    zh: "提醒",
    ta: "அறிவிப்புகள்",
  },
};

const LANGUAGES = [
  { code: "en", name: "English",          native: "English",          short: "EN"      },
  { code: "ms", name: "Bahasa Malaysia",  native: "Bahasa Malaysia",  short: "BM"      },
  { code: "zh", name: "Mandarin",         native: "中文",              short: "中文"    },
  { code: "ta", name: "Tamil",            native: "தமிழ்",            short: "தமிழ்"  },
];

function makeT(lang) {
  return function t(key) {
    const e = I18N[key];
    if (!e) return key;
    return e[lang] || e.en || key;
  };
}


export { I18N, LANGUAGES, makeT };

// Convenience list of language codes in canonical order
export const LANG_CODES = LANGUAGES.map((l) => l.code);
