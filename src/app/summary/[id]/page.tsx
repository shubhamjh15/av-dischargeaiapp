"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import FloatingBackground from "@/components/FloatingBackground";
import TopBar from "@/components/TopBar";
import SummaryEditor from "@/components/SummaryEditor";
import { DischargeSummary, mergeSummary } from "@/lib/schema";

export default function EditSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [initial, setInitial] = useState<DischargeSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/summaries/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load summary.");
        setInitial(mergeSummary(data.data ?? {}));
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [id]);

  return (
    <main className="relative min-h-screen">
      <FloatingBackground />
      <div className="relative z-10">
        <TopBar />
        <div className="mx-auto mt-8 max-w-4xl px-5">
          <Link
            href="/"
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            ← Back to dashboard
          </Link>
          <h1 className="h-page mt-3">
            Edit <span className="hl">discharge summary</span>
          </h1>
        </div>

        {error ? (
          <div className="mx-auto mt-8 max-w-4xl px-5">
            <div className="glass rounded-2xl p-6 text-sm text-red-600">
              {error}
            </div>
          </div>
        ) : !initial ? (
          <div className="mx-auto mt-8 max-w-4xl px-5">
            <div className="glass h-40 animate-pulse rounded-2xl opacity-60" />
          </div>
        ) : (
          <SummaryEditor id={id} initial={initial} />
        )}
      </div>
    </main>
  );
}
