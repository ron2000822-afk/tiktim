import { Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { EventSummary, type EmailEventSummary } from "./EventSummary";

export function SavedEventReminder({
  daysUntil,
  event,
  unsubscribeUrl,
}: {
  daysUntil: 7 | 1;
  event: EmailEventSummary;
  unsubscribeUrl: string;
}) {
  const body = daysUntil === 7 ? "ההופעה השמורה שלכם מתקיימת בעוד שבוע:" : "ההופעה השמורה שלכם מתקיימת מחר:";

  return (
    <EmailLayout previewText={body} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: "16px" }}>{body}</Text>
      <EventSummary event={event} />
    </EmailLayout>
  );
}
