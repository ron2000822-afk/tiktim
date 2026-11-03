import { Link, Section, Text } from "@react-email/components";
import { formatHebrewDayDate, formatPriceFrom } from "@tiktim/shared";

export type EmailEventSummary = {
  title: string;
  venueName: string;
  cityNameHe: string;
  startsAt: Date;
  minPrice: string | null;
  url: string;
};

export function EventSummary({ event }: { event: EmailEventSummary }) {
  const priceLabel = formatPriceFrom(event.minPrice);

  return (
    <Section style={{ border: "1px solid #e4e4e7", borderRadius: "12px", padding: "16px", margin: "12px 0" }}>
      <Text style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 4px" }}>{event.title}</Text>
      <Text style={{ fontSize: "14px", color: "#52525b", margin: "0 0 4px" }}>
        {event.venueName}, {event.cityNameHe}
      </Text>
      <Text style={{ fontSize: "14px", color: "#52525b", margin: "0 0 8px" }}>
        {formatHebrewDayDate(event.startsAt)}
        {priceLabel ? ` · ${priceLabel}` : ""}
      </Text>
      <Link href={event.url} style={{ fontSize: "14px", color: "#111111", fontWeight: "bold" }}>
        לפרטים ולרכישה
      </Link>
    </Section>
  );
}
