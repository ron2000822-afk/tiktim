export const SITE_NAME = "טיקטים";
export const SITE_TAGLINE = "כל ההופעות בישראל, במקום אחד";
export const SITE_DESCRIPTION = "כל ההופעות בישראל, מכל מוכרי הכרטיסים, במקום אחד.";

export const HEADER_COPY = {
  login: "התחברות",
  loginWithGoogle: "התחברות עם Google",
  myAccount: "האזור שלי",
  signOut: "התנתקות",
  navMusic: "מוזיקה",
  navStandup: "סטנדאפ",
  searchPlaceholder: "אמן, אולם או עיר...",
  searchSubmit: "חיפוש",
};

export const AUTH_PROMPT_COPY = {
  followTitle: "התחברו כדי לעקוב",
  followBody: "התחברות עם Google מאפשרת לך לעקוב ולקבל התראות על הופעות חדשות.",
  saveTitle: "התחברו כדי לשמור הופעות",
  saveBody: "הופעות שתשמרו יישארו זמינות בכל המכשירים שלך, ותקבלו תזכורת לפני המופע.",
  cta: "התחברות עם Google",
  cancel: "לא עכשיו",
};

export const FOOTER_COPY = {
  disclosure: "טיקטים אינו מוכר כרטיסים. אנו עשויים לקבל עמלה מרכישות שמתבצעות באתרי המוכרים.",
  links: {
    about: "אודות",
    terms: "תקנון",
    privacy: "פרטיות",
    accessibility: "הצהרת נגישות",
    advertise: "פרסמו אצלנו",
  },
  rightsReserved: `© ${new Date().getFullYear()} ${SITE_NAME}. כל הזכויות שמורות.`,
};

export const STATUS_COPY: Record<string, string> = {
  scheduled: "",
  few_left: "כרטיסים אחרונים",
  sold_out: "אזל",
  postponed: "נדחה",
  cancelled: "בוטל",
  unavailable: "לא זמין כרגע",
  past: "האירוע חלף",
};

export const EVENT_CARD_COPY = {
  save: "שמירת הופעה",
  unsave: "הסרת שמירה",
  sponsored: "ממומן",
  new: "חדש",
  priceFallback: "מחיר לא ידוע",
};

export const RAIL_COPY = {
  seeAll: "הכל",
};

export const QUICK_CHIPS_COPY = {
  today: "היום",
  tomorrow: "מחר",
  weekend: "סופ\"ש",
  thisWeek: "השבוע",
  free: "חינם",
  outdoor: "בחוץ",
};

export const NEWSLETTER_COPY = {
  title: "מה יש בסופ\"ש?",
  body: "ניוזלטר שבועי עם ההופעות הכי שוות, מותאם לטעם שלך.",
  emailPlaceholder: "כתובת מייל",
  submit: "הרשמה",
  confirmSent: "שלחנו לך מייל לאישור ההרשמה.",
  comingSoon: "ההרשמה תהיה זמינה בקרוב.",
};
