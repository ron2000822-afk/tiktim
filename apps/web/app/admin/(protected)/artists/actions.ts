"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@tiktim/db";
import { artistGenres } from "@tiktim/db/schema";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    throw new Error("Not authorized");
  }
}

export async function setArtistGenre(formData: FormData) {
  await assertAdmin();
  const artistId = String(formData.get("artistId"));
  const genreId = String(formData.get("genreId"));

  await db.transaction(async (tx) => {
    await tx.delete(artistGenres).where(eq(artistGenres.artistId, artistId));
    await tx.insert(artistGenres).values({ artistId, genreId, isPrimary: true });
  });

  revalidatePath("/admin/artists");
}
