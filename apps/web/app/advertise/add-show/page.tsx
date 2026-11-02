import type { Metadata } from "next";
import { ADD_SHOW_COPY } from "@/app/lib/copy/add-show";
import { AddShowForm } from "./AddShowForm";

export const metadata: Metadata = { title: ADD_SHOW_COPY.title };

export default function AddShowPage() {
  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-extrabold">{ADD_SHOW_COPY.title}</h1>
        <p className="mt-2 text-[var(--text-muted)]">{ADD_SHOW_COPY.intro}</p>
      </div>
      <AddShowForm />
    </div>
  );
}
