export const ONBOARDING_COPY = {
  stepLabel: (step: number, total: number) => `שלב ${step} מ-${total}`,
  skip: "דלגו",
  back: "הקודם",
  next: "הבא",
  finish: "סיימו",
  genres: {
    title: "אילו סוגי הופעות מעניינים אתכם?",
    body: "נבחר לכם הופעות לפי הטעם שלכם. אפשר לשנות בכל שלב.",
  },
  region: {
    title: "איפה אתם גרים?",
    body: "נעדיף לכם הופעות קרובות אליכם.",
    placeholder: "בחרו אזור",
  },
  artists: {
    title: "אילו אמנים אתם אוהבים?",
    body: "נעקוב בשבילכם ונעדכן אתכם על הופעות חדשות.",
    searchPlaceholder: "חיפוש אמן...",
    noResults: "לא נמצאו אמנים.",
  },
};
