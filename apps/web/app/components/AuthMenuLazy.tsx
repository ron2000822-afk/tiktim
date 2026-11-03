"use client";

import dynamic from "next/dynamic";

// `ssr: false` is only valid inside a Client Component — this thin wrapper
// exists so Header.tsx (a Server Component) can still defer AuthMenu's
// code (and the Supabase browser client it pulls in) out of the critical
// bundle. See Header.tsx for why.
export const AuthMenuLazy = dynamic(() => import("@/app/components/AuthMenu").then((m) => m.AuthMenu), {
  ssr: false,
  loading: () => <div className="h-8 w-20" aria-hidden="true" />,
});
