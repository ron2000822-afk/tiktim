function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text.replace(/[\\,;]/g, (match) => `\\${match}`).replace(/\n/g, "\\n");
}

export function buildEventIcs(options: {
  uid: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string;
  description: string;
  url: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tiktim//Events//HE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${options.uid}@tiktim`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(options.startsAt)}`,
    `DTEND:${formatIcsDate(options.endsAt)}`,
    `SUMMARY:${escapeIcsText(options.title)}`,
    `LOCATION:${escapeIcsText(options.location)}`,
    `DESCRIPTION:${escapeIcsText(options.description)}`,
    `URL:${options.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
