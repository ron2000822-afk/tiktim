import type { Metadata } from "next";
import { LegalSections } from "@/app/components/LegalSections";
import { TERMS_COPY } from "@/app/lib/copy/legal";

export const metadata: Metadata = { title: TERMS_COPY.title };

export default function TermsPage() {
  return <LegalSections title={TERMS_COPY.title} updated={TERMS_COPY.updated} sections={TERMS_COPY.sections} />;
}
