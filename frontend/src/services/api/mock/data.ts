/**
 * Typed mock dataset — mirrors mock-data.js but with full TypeScript types.
 * This is the single source of truth for the mock API layer.
 * When the real backend is connected, this file is no longer imported.
 */

import type {
  BookingItem,
  CompanionAlertItem,
  CompanionDashboardData,
  ElderEarningsData,
  ElderListing,
  Provider,
  Session,
  UserProfile,
} from "../types";

// ─── Portrait URLs ─────────────────────────────────────────────────────────

const PORTRAITS = {
  siti: "https://randomuser.me/api/portraits/women/79.jpg",
  fatimah: "https://randomuser.me/api/portraits/women/65.jpg",
  hassan: "https://randomuser.me/api/portraits/men/78.jpg",
  chen: "https://randomuser.me/api/portraits/women/72.jpg",
  mei: "https://randomuser.me/api/portraits/women/69.jpg",
  raju: "https://randomuser.me/api/portraits/men/83.jpg",
  amir: "https://randomuser.me/api/portraits/men/32.jpg",
  nadia: "https://randomuser.me/api/portraits/women/44.jpg",
};

// ─── Demo accounts ─────────────────────────────────────────────────────────

export interface DemoAccount {
  userId: string;
  email: string;
  password: string;
  name: string;
  initials: string;
  role: "elder" | "requestor" | "companion";
  locale: "en";
  portrait: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    userId: "user-siti",
    email: "siti@gingergig.my",
    password: "demo",
    name: "Makcik Siti",
    initials: "SH",
    role: "elder",
    locale: "en",
    portrait: PORTRAITS.siti,
  },
  {
    userId: "user-amir",
    email: "amir@gingergig.my",
    password: "demo",
    name: "Amir Razak",
    initials: "AR",
    role: "requestor",
    locale: "en",
    portrait: PORTRAITS.amir,
  },
  {
    userId: "user-faiz",
    email: "faiz@gingergig.my",
    password: "demo",
    name: "Faiz Hassan",
    initials: "FH",
    role: "companion",
    locale: "en",
    portrait: PORTRAITS.amir,
  },
];

// ─── Mock sessions (returned after login) ─────────────────────────────────

export function makeMockSession(account: DemoAccount): Session {
  return {
    accessToken: `mock-token-${account.userId}`,
    tokenType: "bearer",
    expiresIn: 86400,
    userId: account.userId,
  };
}

export function makeMockProfile(account: DemoAccount): UserProfile {
  return {
    id: account.userId,
    name: account.name,
    role: account.role,
    locale: account.locale,
  };
}

// ─── Providers (search results) ────────────────────────────────────────────

export const PROVIDERS: Provider[] = [
  {
    id: "siti",
    name: "Makcik Siti",
    age: 64,
    area: "Kepong",
    distance: "500m",
    initials: "SH",
    portrait: PORTRAITS.siti,
    service: "Masakan Melayu Tradisional",
    serviceEn: "Traditional Malay Home Cooking",
    category: "cat_cooking",
    rating: 4.9,
    reviews: 23,
    price: "RM15–20",
    priceUnit: "per meal",
    halal: true,
    tone: "warm",
    description:
      "Home-cooked rendang, nasi lemak, and kampung favourites — recipes I have been making for over 30 years. Cooked fresh every morning.",
    matchScore: 95,
    matchReason:
      "Specialises in Malay cuisine, halal certified, 500m from your area, available weekdays.",
    menu: [
      { name: "Rendang Daging", price: "RM18" },
      { name: "Nasi Lemak Bungkus", price: "RM8" },
      { name: "Ayam Masak Merah", price: "RM15" },
      { name: "Sambal Tumis Udang", price: "RM20" },
      { name: "Kuih Lapis (per box)", price: "RM12" },
    ],
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  },
  {
    id: "chen",
    name: "Ah Ma Chen",
    age: 68,
    area: "Kepong Baru",
    distance: "1.2km",
    initials: "CL",
    portrait: PORTRAITS.chen,
    service: "Hokkien Home-Style Cooking",
    serviceEn: "Hokkien Home-Style Cooking",
    category: "cat_cooking",
    rating: 4.8,
    reviews: 41,
    price: "RM12–25",
    priceUnit: "per meal",
    halal: false,
    tone: "professional",
    description:
      "Authentic Hokkien-style home cooking: bak kut teh, char kway teow, and herbal soups. 40 years in the kitchen.",
    matchScore: 88,
    matchReason: "Hokkien specialty, near your area, highly rated by 41 neighbours.",
    days: ["Tue", "Wed", "Thu", "Sat", "Sun"],
  },
  {
    id: "raju",
    name: "Uncle Raju",
    age: 71,
    area: "Sentul",
    distance: "2.4km",
    initials: "RM",
    portrait: PORTRAITS.raju,
    service: "South Indian Vegetarian",
    serviceEn: "South Indian Vegetarian",
    category: "cat_cooking",
    rating: 4.7,
    reviews: 18,
    price: "RM10–18",
    priceUnit: "per meal",
    halal: false,
    tone: "warm",
    description:
      "Pure vegetarian thali, dosa, and chettinad-style curries. Cooked with love on a banana leaf.",
    matchScore: 76,
    matchReason: "Vegetarian Indian, available daily, 2.4km from you.",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  {
    id: "fatimah",
    name: "Makcik Fatimah",
    age: 59,
    area: "Damansara Damai",
    distance: "800m",
    initials: "FA",
    portrait: PORTRAITS.fatimah,
    service: "Anyaman Mengkuang & Songket",
    serviceEn: "Mengkuang Weaving & Songket Crafts",
    category: "cat_crafts",
    rating: 5.0,
    reviews: 12,
    price: "RM30–200",
    priceUnit: "per piece",
    halal: true,
    tone: "warm",
    description:
      "Hand-woven mengkuang baskets and songket bookmarks. Each piece takes 2–3 days. Made the way my mother taught me.",
    days: ["Mon", "Wed", "Fri"],
  },
  {
    id: "hassan",
    name: "Pak Hassan",
    age: 67,
    area: "TTDI",
    distance: "1.8km",
    initials: "HM",
    portrait: PORTRAITS.hassan,
    service: "Pet Sitting & Dog Walking",
    serviceEn: "Pet Sitting & Dog Walking",
    category: "cat_pet",
    rating: 4.9,
    reviews: 27,
    price: "RM25",
    priceUnit: "per visit",
    halal: false,
    tone: "professional",
    description:
      "Retired veterinary assistant. I look after cats, dogs, and rabbits while you are away. Daily photo updates.",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  {
    id: "mei",
    name: "Aunty Mei",
    age: 62,
    area: "Bangsar",
    distance: "3.1km",
    initials: "ML",
    portrait: PORTRAITS.mei,
    service: "Light Housekeeping",
    serviceEn: "Light Housekeeping",
    category: "cat_household",
    rating: 4.6,
    reviews: 33,
    price: "RM18",
    priceUnit: "per hour",
    halal: false,
    tone: "professional",
    description:
      "Tidying, light cleaning, ironing. I bring my own supplies. Two hours minimum.",
    days: ["Mon", "Tue", "Thu", "Fri"],
  },
];

// ─── Makcik Siti's listings ────────────────────────────────────────────────

export const ELDER_LISTINGS: ElderListing[] = [
  {
    id: "l1",
    title: "Masakan Melayu Tradisional",
    titleEn: "Traditional Malay Cooking",
    category: "cat_cooking",
    price: "RM15–20",
    priceUnit: "per meal",
    rating: 4.9,
    bookings: 23,
    isActive: true,
  },
  {
    id: "l2",
    title: "Kuih-muih Tradisional",
    titleEn: "Traditional Kuih",
    category: "cat_cooking",
    price: "RM12",
    priceUnit: "per box",
    rating: 4.8,
    bookings: 8,
    isActive: true,
  },
];

// ─── Makcik Siti's incoming bookings ──────────────────────────────────────

export const ELDER_BOOKINGS: BookingItem[] = [
  {
    id: "b1",
    requestor: "Amir",
    requestorInitials: "AR",
    portrait: PORTRAITS.amir,
    date: "Tomorrow, 6:30 PM",
    qty: "2 portions",
    item: "Rendang + Nasi Lemak",
    status: "pending",
    price: "RM36",
  },
  {
    id: "b2",
    requestor: "Nadia",
    requestorInitials: "NA",
    portrait: PORTRAITS.nadia,
    date: "Sat, 27 Apr · 12:00 PM",
    qty: "5 portions",
    item: "Ayam Masak Merah",
    status: "confirmed",
    price: "RM75",
  },
  {
    id: "b3",
    requestor: "Lim Family",
    requestorInitials: "LF",
    portrait: null,
    date: "Sun, 28 Apr · 11:00 AM",
    qty: "1 box",
    item: "Kuih Lapis",
    status: "confirmed",
    price: "RM12",
  },
];

// ─── Completed bookings ────────────────────────────────────────────────────

export const ELDER_COMPLETED: BookingItem[] = [
  {
    id: "c1",
    requestor: "Faridah",
    requestorInitials: "FA",
    portrait: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop",
    date: "Today, 1:30 PM",
    qty: "3 portions",
    item: "Nasi Lemak Bungkus",
    status: "completed",
    price: "RM21",
    rating: 5,
  },
  {
    id: "c2",
    requestor: "Ahmad",
    requestorInitials: "AH",
    portrait: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    date: "Today, 12:00 PM",
    qty: "2 portions",
    item: "Rendang Daging",
    status: "completed",
    price: "RM30",
    rating: 5,
  },
  {
    id: "c3",
    requestor: "Mei Ling",
    requestorInitials: "ML",
    portrait: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=200&h=200&fit=crop",
    date: "Yesterday, 6:00 PM",
    qty: "4 portions",
    item: "Ayam Masak Merah",
    status: "completed",
    price: "RM48",
    rating: 4,
  },
];

// ─── Makcik Siti's earnings ────────────────────────────────────────────────

export const ELDER_EARNINGS: ElderEarningsData = {
  monthTotal: 423,
  lifetimeTotal: 2840,
  completedCount: 47,
  weeklyBar: [210, 340, 180, 290, 420, 310, 380, 423],
};

// ─── Companion dashboard (Faiz watching Makcik Siti) ──────────────────────

export const COMPANION_DASHBOARD: CompanionDashboardData = {
  elderName: "Makcik Siti",
  elderStatus: "Active",
  lastActiveText: "8 minutes ago",
  weeklyEarnings: 423,
  bookingsCompleted: 5,
  activeDays: 6,
  timeline: [
    { id: "t1", time: "Today, 4:20 PM", text: "Confirmed booking with Amir for tomorrow" },
    { id: "t2", time: "Today, 9:15 AM", text: "Posted new listing: Kuih Lapis" },
    { id: "t3", time: "Yesterday, 7:00 PM", text: "Completed delivery to Nadia (5 portions)" },
    { id: "t4", time: "Yesterday, 11:30 AM", text: "Earned RM75 from Sat booking" },
    { id: "t5", time: "Mon, 22 Apr", text: "Received 5-star review from Lim family" },
  ],
};

// ─── Companion alerts ──────────────────────────────────────────────────────

export const COMPANION_ALERTS: CompanionAlertItem[] = [
  {
    id: "a1",
    type: "success",
    text: "Mum earned her first RM100 this month — RM680 total!",
  },
  {
    id: "a2",
    type: "info",
    text: "Mum may be eligible for i-Saraan retirement matching. Tap to learn more.",
  },
  {
    id: "a3",
    type: "warning",
    text: "Mum has been active 6 days this week. She might need a rest day.",
  },
];
