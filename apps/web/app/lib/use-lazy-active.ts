"use client";

import { useEffect, useRef, useState } from "react";

// Defers "becoming active" (running real effects/data fetches) until the
// element is about to scroll into view. The element itself still mounts
// immediately (same visual, no layout shift) — only the per-instance
// effect work is delayed, which is what actually costs hydration time
// when there are dozens of instances on one page (see SaveHeart).
export function useLazyActive<T extends HTMLElement>(rootMargin = "200px") {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (active) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [active, rootMargin]);

  return { ref, active };
}
