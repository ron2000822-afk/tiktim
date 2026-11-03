import { Body, Container, Head, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

const FONT_STACK = "Arial, Tahoma, sans-serif";

export function EmailLayout({
  previewText,
  unsubscribeUrl,
  children,
}: {
  previewText: string;
  unsubscribeUrl?: string;
  children: ReactNode;
}) {
  return (
    <Html lang="he" dir="rtl">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: FONT_STACK, direction: "rtl", textAlign: "right" }}>
        <Container style={{ backgroundColor: "#ffffff", margin: "0 auto", padding: "24px", maxWidth: "480px" }}>
          <Text style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 16px" }}>טיקטים</Text>
          {children}
          <Hr style={{ margin: "24px 0", borderColor: "#e4e4e7" }} />
          <Text style={{ fontSize: "12px", color: "#71717a" }}>
            טיקטים אינו מוכר כרטיסים. אנו עשויים לקבל עמלה מרכישות שמתבצעות באתרי המוכרים.
          </Text>
          {unsubscribeUrl && (
            <Section>
              <Link href={unsubscribeUrl} style={{ fontSize: "12px", color: "#71717a" }}>
                להסרה מרשימת התפוצה
              </Link>
            </Section>
          )}
        </Container>
      </Body>
    </Html>
  );
}
