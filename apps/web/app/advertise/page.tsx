import type { Metadata } from "next";
import { ADVERTISE_COPY } from "@/app/lib/copy/legal";
import { AdvertiseForm } from "./AdvertiseForm";

export const metadata: Metadata = { title: ADVERTISE_COPY.title };

export default function AdvertisePage() {
  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-extrabold">{ADVERTISE_COPY.title}</h1>
        <p className="mt-2 text-[var(--text-muted)]">{ADVERTISE_COPY.intro}</p>
      </div>
      <AdvertiseForm />
    </div>
  );
}
