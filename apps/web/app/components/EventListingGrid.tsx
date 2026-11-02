import { EventCard } from "@/app/components/EventCard";
import { EmptyState } from "@/app/components/EmptyState";
import type { EventCardData } from "@/lib/queries/events";

export function EventListingGrid({
  events,
  emptyTitle,
  emptyBody,
}: {
  events: EventCardData[];
  emptyTitle: string;
  emptyBody?: string;
}) {
  if (events.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} variant="grid" />
      ))}
    </div>
  );
}
