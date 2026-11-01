import Link from "next/link";
import { FOOTER_COPY } from "@/app/lib/copy";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm">
        <p>{FOOTER_COPY.disclosure}</p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/about" className="hover:text-[var(--text)]">
            {FOOTER_COPY.links.about}
          </Link>
          <Link href="/terms" className="hover:text-[var(--text)]">
            {FOOTER_COPY.links.terms}
          </Link>
          <Link href="/privacy" className="hover:text-[var(--text)]">
            {FOOTER_COPY.links.privacy}
          </Link>
          <Link href="/accessibility" className="hover:text-[var(--text)]">
            {FOOTER_COPY.links.accessibility}
          </Link>
          <Link href="/advertise" className="hover:text-[var(--text)]">
            {FOOTER_COPY.links.advertise}
          </Link>
        </nav>
        <p>{FOOTER_COPY.rightsReserved}</p>
      </div>
    </footer>
  );
}
