import { Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { EventSummary, type EmailEventSummary } from "./EventSummary";

export function NewShowAlert({
  artistNameHe,
  event,
  unsubscribeUrl,
}: {
  artistNameHe: string;
  event: EmailEventSummary;
  unsubscribeUrl: string;
}) {
  return (
    <EmailLayout previewText={`${artistNameHe}: הופעה חדשה`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: "16px" }}>
        {artistNameHe} שאתם עוקבים אחריו הכריז על הופעה חדשה:
      </Text>
      <EventSummary event={event} />
    </EmailLayout>
  );
}
