"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FloatingBackground from "@/components/FloatingBackground";
import TopBar from "@/components/TopBar";
import { downloadPdf } from "@/lib/pdf";
import { DischargeSummary } from "@/lib/schema";

interface Row {
  id: string;
  patient_name: string | null;
  ip_no: string | null;
  created_at: string;
}

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleDownload(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (downloading) return;
    setDownloading(id);
    try {
      const res = await fetch(`/api/summaries/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load.");
      downloadPdf(data.data as DischargeSummary);
    } catch {
      // silently ignore — user can open the record and download from there
    } finally {
      setDownloading(null);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/summaries");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load.");
      setRows(data.summaries);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="relative min-h-screen pb-20">
      <FloatingBackground />
      <div className="relative z-10">
        <TopBar />

        <div className="mx-auto mt-10 max-w-5xl px-5">
          {/* Hero */}
          <div className="animate-fade-up">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              AI-Powered Documentation
            </p>
            <h1 className="display mt-2">
              Discharge summaries, <span className="hl">effortless</span>.
            </h1>
            <p className="mt-4 max-w-xl text-base text-[var(--ink-2)]">
              Dictate or type, let AI structure and clean the fields, review, and
              download a hospital-format PDF — in under a minute.
            </p>

            <Link
              href="/summary/new"
              className="btn-3d mt-7 inline-flex items-center gap-2 px-6 py-3 text-base"
            >
              <span className="text-lg">＋</span> New Discharge Summary
            </Link>
          </div>

          {/* List */}
          <div className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-700">
                Recent summaries
              </h2>
              <button
                onClick={load}
                className="text-sm font-semibold text-brand-600 hover:underline"
              >
                ↻ Refresh
              </button>
            </div>

            {loading ? (
              <SkeletonList />
            ) : error ? (
              <div className="glass rounded-2xl p-6 text-sm text-red-600">
                {error}
                <p className="mt-2 text-slate-500">
                  Make sure Supabase env vars are set and the table exists
                  (run <code>supabase.sql</code>).
                </p>
              </div>
            ) : rows.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center">
                <div className="mb-3 text-4xl">🗂️</div>
                <p className="font-semibold text-slate-700">No summaries yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Create your first one to see it here.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {rows.map((r, i) => (
                  <li
                    key={r.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="glass flex items-center justify-between rounded-2xl px-5 py-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                      <Link
                        href={`/summary/${r.id}`}
                        className="flex min-w-0 flex-1 items-center gap-4"
                      >
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-white"
                          style={{
                            background:
                              "linear-gradient(135deg, #2f8765, #1f6f52)",
                          }}
                        >
                          {(r.patient_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">
                            {r.patient_name || "Unnamed patient"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {r.ip_no ? `IP ${r.ip_no} · ` : ""}
                            {new Date(r.created_at).toLocaleString()}
                          </p>
                        </div>
                      </Link>
                      <div className="ml-3 flex shrink-0 items-center gap-3">
                        <button
                          onClick={(e) => handleDownload(e, r.id)}
                          disabled={downloading === r.id}
                          title="Download PDF"
                          className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--mint-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--green)] transition hover:bg-[var(--mint)] disabled:opacity-50"
                        >
                          {downloading === r.id ? (
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--green)]/30 border-t-[var(--green)]" />
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          )}
                          PDF
                        </button>
                        <Link href={`/summary/${r.id}`} className="text-brand-600">→</Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-3">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="glass h-[68px] animate-pulse rounded-2xl opacity-60"
        />
      ))}
    </ul>
  );
}
