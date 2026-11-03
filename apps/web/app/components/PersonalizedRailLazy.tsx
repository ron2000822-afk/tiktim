"use client";

import dynamic from "next/dynamic";

export const PersonalizedRailLazy = dynamic(
  () => import("@/app/components/PersonalizedRail").then((m) => m.PersonalizedRail),
  { ssr: false },
);
