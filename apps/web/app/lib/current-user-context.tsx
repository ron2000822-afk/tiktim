"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

type CurrentUserState = { user: User | null; loading: boolean };

const CurrentUserContext = createContext<CurrentUserState>({ user: null, loading: true });

export function useCurrentUserContext(): CurrentUserState {
  return useContext(CurrentUserContext);
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CurrentUserState>({ user: null, loading: true });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // A dynamic import here, not a static one at module scope, is the
    // point: this component renders `children` immediately via normal SSR
    // + hydration, but the Supabase client code itself (and its actual
    // network auth check) only loads after mount, in its own chunk — one
    // auth check and one subscription for the whole page, instead of one
    // per SaveHeart/FollowButton/AuthMenu instance that used to each call
    // useCurrentUser() independently (dozens of them on the home page).
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => setState({ user: data.user, loading: false }));
      const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
        setState({ user: session?.user ?? null, loading: false });
      });
      unsubscribe = () => subscription.subscription.unsubscribe();
    });

    return () => unsubscribe?.();
  }, []);

  return <CurrentUserContext.Provider value={state}>{children}</CurrentUserContext.Provider>;
}
