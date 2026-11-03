import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listFollowedItems, getEmailSubscriptionForUser } from "@/lib/queries/me";
import { listSavedEventsForUser } from "@/lib/queries/events";
import { EventListingGrid } from "@/app/components/EventListingGrid";
import { UnfollowButton } from "./UnfollowButton";
import { NotificationPrefsForm } from "./NotificationPrefsForm";
import { DeleteAccountButton } from "./DeleteAccountButton";
import { ME_COPY } from "@/app/lib/copy/me";
import { LISTING_COPY } from "@/app/lib/copy/listing";

export const metadata: Metadata = { title: ME_COPY.title, robots: { index: false } };
export const instant = false;

export default async function MePage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [followed, savedEventsList, emailSubscription] = await Promise.all([
    listFollowedItems(user.id),
    listSavedEventsForUser(user.id),
    getEmailSubscriptionForUser(user.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <h1 className="text-2xl font-bold">{ME_COPY.title}</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{ME_COPY.followedTitle}</h2>
        {followed.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{ME_COPY.followedEmpty}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {followed.map((item) => (
              <li key={`${item.targetType}-${item.targetId}`} className="flex items-center justify-between py-2">
                <a href={item.href} className="text-sm font-medium hover:text-[var(--accent)]">
                  {item.nameHe}
                </a>
                <UnfollowButton targetType={item.targetType} targetId={item.targetId} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{ME_COPY.savedTitle}</h2>
        <EventListingGrid events={savedEventsList} emptyTitle={ME_COPY.savedEmpty} emptyBody={LISTING_COPY.emptyBody} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{ME_COPY.prefsTitle}</h2>
        <NotificationPrefsForm
          initialAlertsFrequency={emailSubscription?.alertsFrequency ?? "instant"}
          initialNewsletterFrequency={emailSubscription?.newsletterFrequency ?? "weekly"}
        />
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-lg font-bold">{ME_COPY.dangerZoneTitle}</h2>
        <p className="text-sm text-[var(--text-muted)]">{ME_COPY.dangerZoneBody}</p>
        <DeleteAccountButton />
      </section>
    </div>
  );
}
