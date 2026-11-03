import { Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { EventSummary, type EmailEventSummary } from "./EventSummary";

const STATUS_LABELS: Record<"postponed" | "cancelled" | "few_left", string> = {
  postponed: "נדחתה",
  cancelled: "בוטלה",
  few_left: "נשארו כרטיסים אחרונים",
};

export function StatusChangeNotice({
  status,
  event,
  unsubscribeUrl,
}: {
  status: "postponed" | "cancelled" | "few_left";
  event: EmailEventSummary;
  unsubscribeUrl: string;
}) {
  return (
    <EmailLayout previewText={`עדכון להופעה השמורה שלכם: ${STATUS_LABELS[status]}`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: "16px" }}>עדכון להופעה השמורה שלכם — {STATUS_LABELS[status]}:</Text>
      <EventSummary event={event} />
    </EmailLayout>
  );
}
