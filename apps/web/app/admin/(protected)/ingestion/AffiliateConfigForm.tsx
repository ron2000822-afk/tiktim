"use client";

import { useActionState } from "react";
import { setSourceAffiliateConfig } from "./actions";
import { ADMIN_COPY } from "../../copy";

async function submit(_prev: unknown, formData: FormData) {
  return setSourceAffiliateConfig(formData);
}

export function AffiliateConfigForm({
  sourceId,
  affiliateProgram,
  affiliateConfig,
}: {
  sourceId: string;
  affiliateProgram: string | null;
  affiliateConfig: unknown;
}) {
  const [state, formAction, pending] = useActionState(submit, null);
  const copy = ADMIN_COPY.ingestion.affiliate;

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-[var(--accent)]">{affiliateProgram ? affiliateProgram : copy.setUp}</summary>
      <form action={formAction} className="mt-2 w-64 space-y-2">
        <input type="hidden" name="sourceId" value={sourceId} />
        <div>
          <label className="mb-1 block" htmlFor={`program-${sourceId}`}>
            {copy.programLabel}
          </label>
          <input
            id={`program-${sourceId}`}
            name="affiliateProgram"
            defaultValue={affiliateProgram ?? ""}
            className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-2 py-1"
          />
        </div>
        <div>
          <label className="mb-1 block" htmlFor={`config-${sourceId}`}>
            {copy.configLabel}
          </label>
          <textarea
            id={`config-${sourceId}`}
            name="affiliateConfig"
            rows={3}
            defaultValue={affiliateConfig ? JSON.stringify(affiliateConfig, null, 2) : ""}
            dir="ltr"
            className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-2 py-1 font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--accent)] px-3 py-1 font-semibold text-[var(--background)] disabled:opacity-60"
        >
          {copy.save}
        </button>
        {state?.ok === true && <span className="ms-2 text-[var(--status-new)]">{copy.saved}</span>}
        {state?.ok === false && <p className="text-[var(--status-cancelled)]">{state.error}</p>}
      </form>
    </details>
  );
}
