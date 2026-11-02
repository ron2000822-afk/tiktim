import type { Metadata } from "next";
import Link from "next/link";
import { listPromotions } from "@/lib/queries/admin-promotions";
import { ADMIN_COPY } from "../../copy";
import { PromotionActiveToggle } from "./PromotionActiveToggle";

export const metadata: Metadata = { title: ADMIN_COPY.promotions.title };
export const instant = false;

export default async function PromotionsPage() {
  const promotions = await listPromotions();
  const slotLabels = ADMIN_COPY.promotions.slotLabels as Record<string, string>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ADMIN_COPY.promotions.title}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{ADMIN_COPY.promotions.intro}</p>
        </div>
        <Link
          href="/admin/promotions/new"
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
        >
          {ADMIN_COPY.promotions.addNew}
        </Link>
      </div>

      {promotions.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{ADMIN_COPY.promotions.empty}</p>
      ) : (
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
              <th className="py-2 text-start">{ADMIN_COPY.promotions.columns.slot}</th>
              <th className="py-2 text-start">{ADMIN_COPY.promotions.columns.event}</th>
              <th className="py-2 text-start">{ADMIN_COPY.promotions.columns.genre}</th>
              <th className="py-2 text-start">{ADMIN_COPY.promotions.columns.dates}</th>
              <th className="py-2 text-start">{ADMIN_COPY.promotions.columns.advertiser}</th>
              <th className="py-2 text-start">{ADMIN_COPY.promotions.columns.price}</th>
              <th className="py-2 text-start">{ADMIN_COPY.promotions.columns.active}</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)]">
                <td className="py-2">{slotLabels[p.slot] ?? p.slot}</td>
                <td className="py-2">{p.eventTitle}</td>
                <td className="py-2">{p.genreNameHe ?? "—"}</td>
                <td className="py-2">
                  {new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(p.startsAt)} –{" "}
                  {new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(p.endsAt)}
                </td>
                <td className="py-2">{p.advertiser}</td>
                <td className="py-2">{p.price ?? "—"}</td>
                <td className="py-2">
                  <PromotionActiveToggle promotionId={p.id} isActive={p.isActive} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
