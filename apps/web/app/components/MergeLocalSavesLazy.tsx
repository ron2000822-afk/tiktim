"use client";

import dynamic from "next/dynamic";

export const MergeLocalSavesLazy = dynamic(
  () => import("@/app/components/MergeLocalSaves").then((m) => m.MergeLocalSaves),
  { ssr: false },
);
