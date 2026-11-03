import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listGenresForOnboarding } from "@/lib/queries/genres";
import { listRegions } from "@/lib/queries/regions";
import { listArtistsForOnboarding } from "@/lib/queries/artists";
import { OnboardingWizard } from "./OnboardingWizard";

export const instant = false;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { next } = await searchParams;
  const [genres, regions, artists] = await Promise.all([
    listGenresForOnboarding(),
    listRegions(),
    listArtistsForOnboarding(),
  ]);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <OnboardingWizard genres={genres} regions={regions} artists={artists} next={next ?? "/"} />
    </div>
  );
}
