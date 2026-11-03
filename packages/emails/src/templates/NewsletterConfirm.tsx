import { Button, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";

export function NewsletterConfirm({ confirmUrl }: { confirmUrl: string }) {
  return (
    <EmailLayout previewText="אשרו את ההרשמה לניוזלטר של טיקטים">
      <Text style={{ fontSize: "16px" }}>היי,</Text>
      <Text style={{ fontSize: "16px" }}>
        קיבלנו בקשת הרשמה לניוזלטר השבועי של טיקטים. לחצו לאישור ההרשמה:
      </Text>
      <Button
        href={confirmUrl}
        style={{ backgroundColor: "#111111", color: "#ffffff", padding: "12px 24px", borderRadius: "999px", fontSize: "14px" }}
      >
        אישור הרשמה
      </Button>
      <Text style={{ fontSize: "12px", color: "#71717a", marginTop: "16px" }}>
        אם לא נרשמתם, אפשר להתעלם מהמייל הזה.
      </Text>
    </EmailLayout>
  );
}
