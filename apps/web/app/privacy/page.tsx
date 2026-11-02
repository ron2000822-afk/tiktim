import type { Metadata } from "next";
import { LegalSections } from "@/app/components/LegalSections";
import { PRIVACY_COPY } from "@/app/lib/copy/legal";

export const metadata: Metadata = { title: PRIVACY_COPY.title, alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return <LegalSections title={PRIVACY_COPY.title} updated={PRIVACY_COPY.updated} sections={PRIVACY_COPY.sections} />;
}
