import { Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { EventSummary, type EmailEventSummary } from "./EventSummary";

export function WeeklyDigest({
  events,
  sponsoredEvent,
  unsubscribeUrl,
}: {
  events: EmailEventSummary[];
  sponsoredEvent?: EmailEventSummary;
  unsubscribeUrl: string;
}) {
  return (
    <EmailLayout previewText="מה יש בסופ״ש?" unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: "20px", fontWeight: "bold" }}>מה יש בסופ״ש?</Text>
      <Text style={{ fontSize: "14px", color: "#52525b" }}>הופעות שנבחרו בשבילכם לפי הטעם שלכם.</Text>

      {sponsoredEvent && (
        <>
          <Text style={{ fontSize: "12px", fontWeight: "bold", color: "#71717a", margin: "16px 0 0" }}>ממומן</Text>
          <EventSummary event={sponsoredEvent} />
        </>
      )}

      {events.map((event, i) => (
        <EventSummary key={i} event={event} />
      ))}
    </EmailLayout>
  );
}
