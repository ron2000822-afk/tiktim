export const ARTIST_PAGE_COPY = {
  followers: (count: number) => `${count} עוקבים`,
  upcomingDates: "תאריכים קרובים",
  pastDates: "הופעות עבר",
  noUpcoming: "אין כרגע הופעות קרובות של האמן הזה.",
  international: "אמן בינלאומי",
};

export const VENUE_PAGE_COPY = {
  upcomingEvents: "הופעות קרובות",
  noUpcoming: "אין כרגע הופעות קרובות באולם הזה.",
  waze: "וייז",
  googleMaps: "Google Maps",
  capacity: (n: number) => `קיבולת: ${n.toLocaleString("he-IL")}`,
};
