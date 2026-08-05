/**
 * i18n strings — English and Urdu.
 *
 * Rule from `docs/PROJECT_CONTEXT.md`: every user-facing string ships in both
 * locales in the same commit. Urdu is Tier 1, never a later polish pass.
 *
 * `en` is the shape; `ur` must satisfy the same keys, so a missing translation
 * is a type error rather than a runtime fallback nobody notices.
 */

export const en = {
  common: {
    appName: "School Pickup",
    search: "Search",
    save: "Save",
    cancel: "Cancel",
    add: "Add",
    edit: "Edit",
    remove: "Remove",
    revoke: "Revoke",
    confirm: "Confirm",
    back: "Back",
    loading: "Loading…",
    empty: "Nothing here yet",
    today: "Today",
    minutes: "min",
    seconds: "sec",
    online: "Online",
    offline: "Offline",
    all: "All",
    of: "of",
  },
  nav: {
    dashboard: "Dashboard",
    people: "People",
    schools: "Schools",
    classes: "Classes",
    students: "Students",
    guardians: "Guardians",
    staff: "Staff",
    drivers: "Drivers",
    operations: "Operations",
    queue: "Live queue",
    devices: "Classroom displays",
    audio: "Name recordings",
    records: "Records",
    audit: "Audit log",
    announcements: "Announcements",
    analytics: "Analytics",
  },
  auth: {
    signIn: "Sign in",
    phone: "Phone number",
    password: "Password",
    signInCta: "Sign in",
    subtitle: "Administrator access",
  },
  status: {
    SCHEDULED: "Scheduled",
    EN_ROUTE: "On the way",
    NEARBY: "Nearby",
    AT_GATE: "At gate",
    HANDED_OVER: "Handed over",
    CANCELLED: "Cancelled",
    LAPSED: "Lapsed",
  },
  role: {
    parent: "Parent",
    teacher: "Teacher",
    guard: "Guard",
    admin: "Admin",
    driver: "Driver",
  },
  queue: {
    title: "Live queue",
    position: "Position",
    collector: "Collector",
    child: "Child",
    eta: "ETA",
    arrivingNow: "Arriving now",
    childrenOnTrip: "children on this trip",
    noneInQueue: "No one is in the queue right now",
  },
  drivers: {
    title: "Driver registry",
    subtitle:
      "Drivers are vetted and registered by the school. Parents then authorize their own children.",
    registration: "Registration",
    capacity: "Capacity",
    authorizedChildren: "Authorized children",
    addDriver: "Register driver",
  },
  devices: {
    title: "Classroom displays",
    subtitle:
      "A display that goes offline stops announcing silently — there is no other alert.",
    lastSeen: "Last seen",
    pairNew: "Pair a display",
    offlineWarning: "This classroom is not announcing",
  },
  audio: {
    title: "Name recordings",
    subtitle:
      "One clip per person. The same clip is used in both languages — only the surrounding phrases differ.",
    recorded: "Recorded",
    missing: "Not recorded",
    duration: "Duration",
  },
  audit: {
    title: "Audit log",
    flaggedOnly: "Flagged only",
    actor: "Actor",
    action: "Action",
    when: "When",
    flagged: "Flagged for review",
  },
  analytics: {
    title: "Analytics",
    averageWait: "Average wait",
    medianWait: "Median wait",
    onTimeRate: "On-time rate",
    manualRate: "Manual fallback rate",
    waitTrend: "Average wait over time",
    peakMinutes: "Arrivals by minute",
    totalPickups: "Total pickups",
  },
  display: {
    arrivingFor: "arriving for",
    inAboutTwoMinutes: "in about two minutes",
    atGate: "At the gate now",
    waiting: "Waiting for arrivals",
    pairTitle: "Pair this display",
    pairPrompt: "Enter the pairing code from the admin dashboard",
    pairedTo: "Paired to",
  },
} as const;

export type Strings = typeof en;

/** Deep-readonly mirror of `en`. Missing keys are a compile error. */
type DeepMirror<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepMirror<T[K]>;
};

export const ur: DeepMirror<Strings> = {
  common: {
    appName: "اسکول پک اپ",
    search: "تلاش کریں",
    save: "محفوظ کریں",
    cancel: "منسوخ کریں",
    add: "شامل کریں",
    edit: "ترمیم",
    remove: "ہٹائیں",
    revoke: "منسوخ کریں",
    confirm: "تصدیق کریں",
    back: "واپس",
    loading: "لوڈ ہو رہا ہے…",
    empty: "ابھی کچھ نہیں",
    today: "آج",
    minutes: "منٹ",
    seconds: "سیکنڈ",
    online: "آن لائن",
    offline: "آف لائن",
    all: "تمام",
    of: "میں سے",
  },
  nav: {
    dashboard: "ڈیش بورڈ",
    people: "لوگ",
    schools: "اسکول",
    classes: "کلاسیں",
    students: "طلبہ",
    guardians: "سرپرست",
    staff: "عملہ",
    drivers: "ڈرائیور",
    operations: "آپریشنز",
    queue: "لائیو قطار",
    devices: "کلاس روم ڈسپلے",
    audio: "ناموں کی ریکارڈنگ",
    records: "ریکارڈز",
    audit: "آڈٹ لاگ",
    announcements: "اعلانات",
    analytics: "تجزیات",
  },
  auth: {
    signIn: "سائن ان",
    phone: "فون نمبر",
    password: "پاس ورڈ",
    signInCta: "سائن ان کریں",
    subtitle: "منتظم رسائی",
  },
  status: {
    SCHEDULED: "طے شدہ",
    EN_ROUTE: "راستے میں",
    NEARBY: "قریب",
    AT_GATE: "گیٹ پر",
    HANDED_OVER: "حوالے کر دیا",
    CANCELLED: "منسوخ",
    LAPSED: "وقت گزر گیا",
  },
  role: {
    parent: "والدین",
    teacher: "استاد",
    guard: "گارڈ",
    admin: "منتظم",
    driver: "ڈرائیور",
  },
  queue: {
    title: "لائیو قطار",
    position: "نمبر",
    collector: "لینے والا",
    child: "بچہ",
    eta: "متوقع وقت",
    arrivingNow: "ابھی پہنچ رہے ہیں",
    childrenOnTrip: "بچے اس سفر میں",
    noneInQueue: "اس وقت قطار میں کوئی نہیں",
  },
  drivers: {
    title: "ڈرائیور رجسٹری",
    subtitle:
      "ڈرائیوروں کی جانچ اور رجسٹریشن اسکول کرتا ہے۔ اس کے بعد والدین اپنے بچوں کی اجازت دیتے ہیں۔",
    registration: "رجسٹریشن نمبر",
    capacity: "گنجائش",
    authorizedChildren: "اجازت یافتہ بچے",
    addDriver: "ڈرائیور رجسٹر کریں",
  },
  devices: {
    title: "کلاس روم ڈسپلے",
    subtitle:
      "آف لائن ہونے والا ڈسپلے خاموشی سے اعلان کرنا بند کر دیتا ہے — اس کے علاوہ کوئی اطلاع نہیں ملتی۔",
    lastSeen: "آخری بار دیکھا گیا",
    pairNew: "نیا ڈسپلے جوڑیں",
    offlineWarning: "یہ کلاس روم اعلان نہیں کر رہا",
  },
  audio: {
    title: "ناموں کی ریکارڈنگ",
    subtitle:
      "ہر فرد کے لیے ایک کلپ۔ یہی کلپ دونوں زبانوں میں استعمال ہوتی ہے — صرف ساتھ کے جملے بدلتے ہیں۔",
    recorded: "ریکارڈ شدہ",
    missing: "ریکارڈ نہیں",
    duration: "دورانیہ",
  },
  audit: {
    title: "آڈٹ لاگ",
    flaggedOnly: "صرف نشان زد",
    actor: "کارکن",
    action: "عمل",
    when: "وقت",
    flagged: "جائزے کے لیے نشان زد",
  },
  analytics: {
    title: "تجزیات",
    averageWait: "اوسط انتظار",
    medianWait: "درمیانی انتظار",
    onTimeRate: "وقت پر شرح",
    manualRate: "دستی متبادل شرح",
    waitTrend: "وقت کے ساتھ اوسط انتظار",
    peakMinutes: "فی منٹ آمد",
    totalPickups: "کل پک اپ",
  },
  display: {
    arrivingFor: "لینے آ رہے ہیں",
    inAboutTwoMinutes: "تقریباً دو منٹ میں",
    atGate: "ابھی گیٹ پر",
    waiting: "آمد کا انتظار",
    pairTitle: "یہ ڈسپلے جوڑیں",
    pairPrompt: "ایڈمن ڈیش بورڈ سے پیئرنگ کوڈ درج کریں",
    pairedTo: "منسلک ہے",
  },
};

export const strings = { en, ur } as const;

/** Re-exported from the API types so there is exactly one `Locale` in the package. */
import type { Locale } from "../types/api";
export type { Locale };

export function t(locale: Locale): Strings {
  return (locale === "ur" ? ur : en) as Strings;
}

/** Urdu is right-to-left. Every layout primitive must honour this. */
export function dir(locale: Locale): "ltr" | "rtl" {
  return locale === "ur" ? "rtl" : "ltr";
}
