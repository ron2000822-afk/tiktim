"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/app/lib/use-current-user";
import { getPersonalizedEvents } from "@/app/lib/actions/personalized";
import type { EventCardData } from "@/lib/queries/events";
import { Rail } from "@/app/components/Rail";
import { EventCard } from "@/app/components/EventCard";
import { HOME_COPY } from "@/app/lib/copy/home";

export function PersonalizedRail() {
  const { user, loading } = useCurrentUser();
  const [events, setEvents] = useState<EventCardData[] | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    getPersonalizedEvents().then(setEvents);
  }, [user, loading]);

  if (!user || !events || events.length === 0) return null;

  return (
    <Rail title={HOME_COPY.forYou}>
      {events.map((e) => (
        <EventCard key={e.id} event={e} variant="rail" />
      ))}
    </Rail>
  );
}
