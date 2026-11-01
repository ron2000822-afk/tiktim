// Realistic demo data: real Israeli cities and venues, fictional artists and
// events. Artists/events are intentionally fictional (see CLAUDE.md "Data
// rules") — we never want seed data implying a real musician has a real,
// made-up tour date attached to their name.

export const CITIES = [
  { slug: "tel-aviv-yafo", nameHe: "תל אביב-יפו", nameEn: "Tel Aviv-Yafo", region: "tel-aviv", lat: 32.0853, lng: 34.7818 },
  { slug: "ramat-gan", nameHe: "רמת גן", nameEn: "Ramat Gan", region: "gush-dan", lat: 32.0684, lng: 34.8248 },
  { slug: "givatayim", nameHe: "גבעתיים", nameEn: "Givatayim", region: "gush-dan", lat: 32.0722, lng: 34.8092 },
  { slug: "bnei-brak", nameHe: "בני ברק", nameEn: "Bnei Brak", region: "gush-dan", lat: 32.0807, lng: 34.8338 },
  { slug: "holon", nameHe: "חולון", nameEn: "Holon", region: "gush-dan", lat: 32.0167, lng: 34.7792 },
  { slug: "bat-yam", nameHe: "בת ים", nameEn: "Bat Yam", region: "gush-dan", lat: 32.0171, lng: 34.7497 },
  { slug: "rishon-lezion", nameHe: "ראשון לציון", nameEn: "Rishon LeZion", region: "gush-dan", lat: 31.973, lng: 34.7925 },
  { slug: "petah-tikva", nameHe: "פתח תקווה", nameEn: "Petah Tikva", region: "gush-dan", lat: 32.0917, lng: 34.8872 },
  { slug: "or-yehuda", nameHe: "אור יהודה", nameEn: "Or Yehuda", region: "gush-dan", lat: 32.0333, lng: 34.85 },
  { slug: "kiryat-ono", nameHe: "קריית אונו", nameEn: "Kiryat Ono", region: "gush-dan", lat: 32.0625, lng: 34.8556 },
  { slug: "herzliya", nameHe: "הרצליה", nameEn: "Herzliya", region: "sharon", lat: 32.1624, lng: 34.8447 },
  { slug: "raanana", nameHe: "רעננה", nameEn: "Ra'anana", region: "sharon", lat: 32.1847, lng: 34.8706 },
  { slug: "kfar-saba", nameHe: "כפר סבא", nameEn: "Kfar Saba", region: "sharon", lat: 32.175, lng: 34.907 },
  { slug: "hod-hasharon", nameHe: "הוד השרון", nameEn: "Hod HaSharon", region: "sharon", lat: 32.15, lng: 34.8886 },
  { slug: "netanya", nameHe: "נתניה", nameEn: "Netanya", region: "sharon", lat: 32.3328, lng: 34.86 },
  { slug: "ramat-hasharon", nameHe: "רמת השרון", nameEn: "Ramat HaSharon", region: "sharon", lat: 32.1467, lng: 34.8392 },
  { slug: "jerusalem", nameHe: "ירושלים", nameEn: "Jerusalem", region: "jerusalem", lat: 31.7683, lng: 35.2137 },
  { slug: "mevaseret-zion", nameHe: "מבשרת ציון", nameEn: "Mevaseret Zion", region: "jerusalem", lat: 31.8028, lng: 35.15 },
  { slug: "beit-shemesh", nameHe: "בית שמש", nameEn: "Beit Shemesh", region: "jerusalem", lat: 31.7456, lng: 34.9889 },
  { slug: "modiin", nameHe: "מודיעין-מכבים-רעות", nameEn: "Modiin", region: "shfela", lat: 31.8928, lng: 35.01 },
  { slug: "rehovot", nameHe: "רחובות", nameEn: "Rehovot", region: "shfela", lat: 31.8928, lng: 34.8113 },
  { slug: "nes-ziona", nameHe: "נס ציונה", nameEn: "Nes Ziona", region: "shfela", lat: 31.9292, lng: 34.7986 },
  { slug: "yavne", nameHe: "יבנה", nameEn: "Yavne", region: "shfela", lat: 31.8783, lng: 34.7392 },
  { slug: "ashdod", nameHe: "אשדוד", nameEn: "Ashdod", region: "south", lat: 31.8014, lng: 34.6435 },
  { slug: "ashkelon", nameHe: "אשקלון", nameEn: "Ashkelon", region: "south", lat: 31.6688, lng: 34.5742 },
  { slug: "beer-sheva", nameHe: "באר שבע", nameEn: "Beer Sheva", region: "south", lat: 31.2518, lng: 34.7913 },
  { slug: "kiryat-gat", nameHe: "קריית גת", nameEn: "Kiryat Gat", region: "south", lat: 31.61, lng: 34.7642 },
  { slug: "caesarea", nameHe: "קיסריה", nameEn: "Caesarea", region: "haifa", lat: 32.5, lng: 34.9 },
  { slug: "haifa", nameHe: "חיפה", nameEn: "Haifa", region: "haifa", lat: 32.794, lng: 34.9896 },
  { slug: "kiryat-ata", nameHe: "קריית אתא", nameEn: "Kiryat Ata", region: "haifa", lat: 32.8044, lng: 35.1058 },
  { slug: "kiryat-bialik", nameHe: "קריית ביאליק", nameEn: "Kiryat Bialik", region: "haifa", lat: 32.8339, lng: 35.0817 },
  { slug: "kiryat-motzkin", nameHe: "קריית מוצקין", nameEn: "Kiryat Motzkin", region: "haifa", lat: 32.8378, lng: 35.0789 },
  { slug: "akko", nameHe: "עכו", nameEn: "Akko", region: "north", lat: 32.9281, lng: 35.0819 },
  { slug: "nahariya", nameHe: "נהריה", nameEn: "Nahariya", region: "north", lat: 33.0075, lng: 35.095 },
  { slug: "safed", nameHe: "צפת", nameEn: "Safed", region: "north", lat: 32.9646, lng: 35.495 },
  { slug: "tiberias", nameHe: "טבריה", nameEn: "Tiberias", region: "north", lat: 32.7922, lng: 35.5312 },
  { slug: "karmiel", nameHe: "כרמיאל", nameEn: "Karmiel", region: "north", lat: 32.9186, lng: 35.295 },
  { slug: "afula", nameHe: "עפולה", nameEn: "Afula", region: "north", lat: 32.6078, lng: 35.2897 },
  { slug: "nazareth", nameHe: "נצרת", nameEn: "Nazareth", region: "north", lat: 32.7021, lng: 35.2978 },
  { slug: "eilat", nameHe: "אילת", nameEn: "Eilat", region: "eilat", lat: 29.5577, lng: 34.9519 },
] as const;

type VenueSeed = {
  slug: string;
  name: string;
  nameEn: string;
  city: string;
  type: "club" | "hall" | "theater" | "amphitheater" | "arena" | "stadium" | "outdoor" | "bar" | "other";
  capacity: number;
  outdoor?: boolean;
};

// Well-known real venues.
const NAMED_VENUES: VenueSeed[] = [
  { slug: "menora-mivtachim-arena", name: "היכל מנורה מבטחים", nameEn: "Menora Mivtachim Arena", city: "tel-aviv-yafo", type: "arena", capacity: 11000 },
  { slug: "heichal-hatarbut-tel-aviv", name: "היכל התרבות תל אביב", nameEn: "Tel Aviv Culture Hall", city: "tel-aviv-yafo", type: "hall", capacity: 2900 },
  { slug: "barby", name: "בארבי", nameEn: "Barby", city: "tel-aviv-yafo", type: "club", capacity: 500 },
  { slug: "hangar-11", name: "האנגר 11", nameEn: "Hangar 11", city: "tel-aviv-yafo", type: "club", capacity: 1200 },
  { slug: "reading-3", name: "רידינג 3", nameEn: "Reading 3", city: "tel-aviv-yafo", type: "club", capacity: 1000 },
  { slug: "the-block", name: "הבלוק", nameEn: "The Block", city: "tel-aviv-yafo", type: "club", capacity: 400 },
  { slug: "park-hayarkon", name: "פארק הירקון", nameEn: "Park HaYarkon", city: "tel-aviv-yafo", type: "outdoor", capacity: 20000, outdoor: true },
  { slug: "bloomfield-stadium", name: "אצטדיון בלומפילד", nameEn: "Bloomfield Stadium", city: "tel-aviv-yafo", type: "stadium", capacity: 29400 },
  { slug: "zappa-herzliya", name: "זאפה הרצליה", nameEn: "Zappa Herzliya", city: "herzliya", type: "hall", capacity: 500 },
  { slug: "zappa-rishon", name: "זאפה ראשון לציון", nameEn: "Zappa Rishon LeZion", city: "rishon-lezion", type: "hall", capacity: 500 },
  { slug: "live-park-rishon", name: "ליב פארק ראשון לציון", nameEn: "LIVE Park Rishon LeZion", city: "rishon-lezion", type: "amphitheater", capacity: 8000 },
  { slug: "binyanei-hauma", name: "בנייני האומה", nameEn: "Jerusalem International Convention Center", city: "jerusalem", type: "hall", capacity: 3000 },
  { slug: "jerusalem-theatre", name: "תיאטרון ירושלים", nameEn: "Jerusalem Theatre", city: "jerusalem", type: "theater", capacity: 750 },
  { slug: "sultans-pool", name: "בריכת הסולטן", nameEn: "Sultan's Pool", city: "jerusalem", type: "amphitheater", capacity: 5000, outdoor: true },
  { slug: "pais-arena-jerusalem", name: "פייס ארנה ירושלים", nameEn: "Pais Arena Jerusalem", city: "jerusalem", type: "arena", capacity: 11600 },
  { slug: "haifa-auditorium", name: "האודיטוריום חיפה", nameEn: "Haifa Auditorium", city: "haifa", type: "hall", capacity: 1500 },
  { slug: "zappa-haifa", name: "זאפה חיפה", nameEn: "Zappa Haifa", city: "haifa", type: "hall", capacity: 450 },
  { slug: "caesarea-amphitheater", name: "האמפיתיאטרון קיסריה", nameEn: "Caesarea Amphitheater", city: "caesarea", type: "amphitheater", capacity: 3400, outdoor: true },
  { slug: "netanya-amphitheater", name: "אמפי נתניה", nameEn: "Netanya Amphitheater", city: "netanya", type: "amphitheater", capacity: 2500, outdoor: true },
  { slug: "heichal-hatarbut-ashdod", name: "היכל התרבות אשדוד", nameEn: "Ashdod Culture Hall", city: "ashdod", type: "hall", capacity: 1200 },
  { slug: "heichal-hatarbut-rishon", name: "היכל התרבות ראשון לציון", nameEn: "Rishon LeZion Culture Hall (Wohl)", city: "rishon-lezion", type: "hall", capacity: 1100 },
  { slug: "ozen-bar", name: "אוזן בר", nameEn: "Ozen Bar", city: "tel-aviv-yafo", type: "bar", capacity: 180 },
  { slug: "levontin-7", name: "לבונטין 7", nameEn: "Levontin 7", city: "tel-aviv-yafo", type: "club", capacity: 220 },
  { slug: "tzavta", name: "צוותא", nameEn: "Tzavta", city: "tel-aviv-yafo", type: "theater", capacity: 300 },
];

// Smaller/secondary cities get a plausible "Culture Hall" / "Club" venue,
// following the real Israeli convention where most municipalities run a
// היכל תרבות (culture hall).
const NAMED_SLUGS = new Set(NAMED_VENUES.map((v) => v.city));
const GENERATED_VENUE_TEMPLATES: Array<{ suffix: string; nameEn: string; type: VenueSeed["type"]; capacity: number }> = [
  { suffix: "היכל התרבות", nameEn: "Culture Hall", type: "hall", capacity: 900 },
  { suffix: "מועדון הבמה", nameEn: "HaBama Club", type: "club", capacity: 350 },
];

const GENERATED_VENUES: VenueSeed[] = CITIES.filter((c) => !NAMED_SLUGS.has(c.slug))
  .slice(0, 36)
  .map((city, i) => {
    const template = GENERATED_VENUE_TEMPLATES[i % GENERATED_VENUE_TEMPLATES.length];
    return {
      slug: `${template.suffix === "היכל התרבות" ? "culture-hall" : "habama-club"}-${city.slug}`,
      name: `${template.suffix} ${city.nameHe}`,
      nameEn: `${city.nameEn} ${template.nameEn}`,
      city: city.slug,
      type: template.type,
      capacity: template.capacity,
    };
  });

export const VENUES: VenueSeed[] = [...NAMED_VENUES, ...GENERATED_VENUES];

export const FIRST_NAMES: Array<[string, string]> = [
  ["דניאל", "Daniel"],
  ["נועה", "Noa"],
  ["איתי", "Itay"],
  ["מאיה", "Maya"],
  ["עומר", "Omer"],
  ["יובל", "Yuval"],
  ["שירה", "Shira"],
  ["אלון", "Alon"],
  ["רוני", "Roni"],
  ["תמר", "Tamar"],
  ["גיא", "Guy"],
  ["הילה", "Hila"],
  ["אריאל", "Ariel"],
  ["ליאור", "Lior"],
  ["נטע", "Neta"],
  ["אסף", "Asaf"],
  ["קרן", "Keren"],
  ["עידן", "Idan"],
  ["אור", "Or"],
  ["דנה", "Dana"],
  ["רועי", "Roee"],
  ["שחר", "Shachar"],
  ["אביגיל", "Avigail"],
  ["נדב", "Nadav"],
];

export const LAST_NAMES: Array<[string, string]> = [
  ["כהן", "Cohen"],
  ["לוי", "Levy"],
  ["מזרחי", "Mizrahi"],
  ["פרץ", "Peretz"],
  ["ביטון", "Biton"],
  ["אזולאי", "Azoulay"],
  ["דהן", "Dahan"],
  ["אוחיון", "Ohayon"],
  ["גבאי", "Gabay"],
  ["חדד", "Haddad"],
  ["אברהם", "Avraham"],
  ["שרעבי", "Sharabi"],
  ["מלכה", "Malka"],
  ["יוסף", "Yosef"],
  ["אשכנזי", "Ashkenazi"],
  ["גולן", "Golan"],
  ["ברק", "Barak"],
  ["שלו", "Shalev"],
  ["רוזן", "Rosen"],
  ["קדוש", "Kadosh"],
  ["נחום", "Nachum"],
  ["צור", "Tzur"],
  ["עמית", "Amit"],
  ["ורדי", "Vardi"],
];

export const BAND_NAMES: Array<[string, string]> = [
  ["הצללים", "HaTzlalim"],
  ["האלמונים", "HaAlmonim"],
  ["קואליציה", "Coalition"],
  ["אורות העיר", "Urot HaIr"],
  ["רחוב הברזל", "Rechov HaBarzel"],
  ["כוכבים שחורים", "Kochavim Shchorim"],
  ["המסיבה הנודדת", "HaMesiba HaNodedet"],
  ["גבולות", "Gvulot"],
  ["אדמה", "Adama"],
  ["זמן אמת", "Zman Emet"],
  ["נתיב", "Nativ"],
  ["אופק מזרחי", "Ofek Mizrahi"],
  ["ים תיכון", "Yam Tichon"],
  ["מרחב פתוח", "Merchav Patuach"],
  ["תו חם", "Tav Cham"],
  ["חוטים גלויים", "Chutim Gluyim"],
  ["אלפבית", "Alefbet"],
  ["מסע לילה", "Masa Layla"],
  ["קרקע רכה", "Karka Raka"],
  ["שביל החלב", "Shvil HaChalav"],
];

// Foreign touring acts ("הופעות חו"ל בישראל") — fictional, kept in Latin
// script the way Hebrew sites typically render international band names.
export const INTERNATIONAL_ARTISTS = [
  "Electric Horizon",
  "The Northern Static",
  "Velvet Atlas",
  "Neon Pilgrims",
  "Glass Mountain",
  "The Wandering Echo",
  "Solar Drift",
  "Midnight Parade",
];

export const SOURCES = [
  { slug: "seller-a", nameHe: "מוכר א׳" },
  { slug: "seller-b", nameHe: "מוכר ב׳" },
  { slug: "seller-c", nameHe: "מוכר ג׳" },
  { slug: "seller-d", nameHe: "מוכר ד׳" },
];
