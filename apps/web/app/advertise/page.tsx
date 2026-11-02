import type { Metadata } from "next";
import Link from "next/link";
import { ADVERTISE_COPY } from "@/app/lib/copy/legal";
import { ADD_SHOW_COPY } from "@/app/lib/copy/add-show";
import { AdvertiseForm } from "./AdvertiseForm";

export const metadata: Metadata = { title: ADVERTISE_COPY.title };

export default function AdvertisePage() {
  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-extrabold">{ADVERTISE_COPY.title}</h1>
        <p className="mt-2 text-[var(--text-muted)]">{ADVERTISE_COPY.intro}</p>
      </div>
      <Link
        href="/advertise/add-show"
        className="block rounded-[var(--radius-card)] border border-[var(--accent)] p-4 text-[var(--accent)] hover:bg-[var(--surface)]"
      >
        {ADD_SHOW_COPY.title} ←
      </Link>
      <AdvertiseForm />
    </div>
  );
}
