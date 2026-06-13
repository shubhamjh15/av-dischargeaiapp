"use client";

import { useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "sec-patient",   label: "Patient",    short: "Patient"   },
  { id: "sec-summary",   label: "Summary",    short: "Summary"   },
  { id: "sec-clinical",  label: "Clinical",   short: "Clinical"  },
  { id: "sec-operative", label: "Operative",  short: "Op. Note"  },
  { id: "sec-treatment", label: "Treatment",  short: "Treatment" },
  { id: "sec-advice",    label: "Advice",     short: "Advice"    },
];

export default function SectionNav() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // pick the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  function jump(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // offset for sticky topbar
      setTimeout(() => window.scrollBy(0, -80), 350);
    }
  }

  return (
    <nav
      aria-label="Form sections"
      className="sticky top-20 z-10 mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-[var(--line)] bg-white/80 p-1 backdrop-blur-md"
      style={{ scrollbarWidth: "none" }}
    >
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => jump(s.id)}
          className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150"
          style={
            active === s.id
              ? {
                  background: "var(--green)",
                  color: "white",
                  boxShadow: "0 2px 8px -3px rgba(19,61,47,0.45)",
                }
              : { color: "var(--ink-2)" }
          }
        >
          <span className="hidden sm:inline">{s.label}</span>
          <span className="sm:hidden">{s.short}</span>
        </button>
      ))}
    </nav>
  );
}
