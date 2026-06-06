"use client";

import Link from "next/link";
import FloatingBackground from "@/components/FloatingBackground";
import TopBar from "@/components/TopBar";
import SummaryEditor from "@/components/SummaryEditor";

export default function NewSummaryPage() {
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
            New <span className="hl">discharge summary</span>
          </h1>
        </div>
        <SummaryEditor />
      </div>
    </main>
  );
}
