"use client";

import { useState } from "react";
import { NEWSLETTER_COPY } from "@/app/lib/copy/site";
import { subscribeNewsletter } from "@/app/lib/actions/newsletter";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    await subscribeNewsletter(email);
    setStatus("done");
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center sm:p-10">
      <h2 className="text-xl font-bold">{NEWSLETTER_COPY.title}</h2>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{NEWSLETTER_COPY.body}</p>
      {status === "done" ? (
        <p className="mt-4 text-sm font-medium">{NEWSLETTER_COPY.confirmSent}</p>
      ) : (
        <form onSubmit={handleSubmit} className="mx-auto mt-4 flex max-w-sm flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="newsletter-email">
            {NEWSLETTER_COPY.emailPlaceholder}
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={NEWSLETTER_COPY.emailPlaceholder}
            className="flex-1 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--background)] disabled:opacity-60"
          >
            {NEWSLETTER_COPY.submit}
          </button>
        </form>
      )}
    </section>
  );
}
