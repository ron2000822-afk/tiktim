"use server";

import { createClient } from "@/lib/supabase/server";
import { listPersonalizedEventsForUser, type EventCardData } from "@/lib/queries/events";

export async function getPersonalizedEvents(): Promise<EventCardData[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return listPersonalizedEventsForUser(user.id);
}
