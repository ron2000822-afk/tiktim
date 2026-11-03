"use client";

import { useEffect, useRef } from "react";
import { useCurrentUser } from "@/app/lib/use-current-user";
import { readLocalSavedIds, clearLocalSavedIds } from "@/app/lib/local-saves";
import { mergeLocalSaves } from "@/app/lib/actions/saved-events";

export function MergeLocalSaves() {
  const { user } = useCurrentUser();
  const merged = useRef(false);

  useEffect(() => {
    if (!user || merged.current) return;
    const ids = readLocalSavedIds();
    if (ids.length === 0) return;

    merged.current = true;
    mergeLocalSaves(ids).then(() => clearLocalSavedIds());
  }, [user]);

  return null;
}
