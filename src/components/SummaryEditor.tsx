"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DischargeSummary, EMPTY_SUMMARY, mergeSummary } from "@/lib/schema";
import { downloadPdf } from "@/lib/pdf";
import DischargeForm from "./DischargeForm";
import Dictation from "./Dictation";

interface Props {
  // when editing an existing record
  id?: string;
  initial?: DischargeSummary;
}

export default function SummaryEditor({ id, initial }: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState<DischargeSummary>(
    initial ?? EMPTY_SUMMARY
  );
  const [raw, setRaw] = useState("");
  const [autofilling, setAutofilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(
    null
  );

  function flash(kind: "ok" | "err", msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function autofill() {
    if (!raw.trim()) {
      flash("err", "Dictate or type some notes first.");
      return;
    }
    setAutofilling(true);
    try {
      const res = await fetch("/api/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: raw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auto-fill failed.");
      // Merge AI output over current (so re-running adds, doesn't wipe edits with blanks)
      const filled = mergeSummary(data.summary);
      setSummary((prev) => smartMerge(prev, filled));
      flash("ok", "Fields auto-filled from your dictation. Please review.");
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setAutofilling(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(
        id ? `/api/summaries/${id}` : "/api/summaries",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: summary }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      flash("ok", "Saved.");
      if (!id && data.id) {
        router.push(`/summary/${data.id}`);
        router.refresh();
      }
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-4xl px-4 pb-28 sm:px-5">
      {/* Voice + AI card */}
      <div className="glass-strong rounded-2xl p-4 sm:p-6 animate-fade-up">
        {/* Header row */}
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[var(--ink)] sm:text-lg">
              Quick fill with <span style={{ color: "var(--green)" }}>AI</span>
            </h2>
            <p className="mt-0.5 text-xs text-[var(--ink-3)] sm:text-sm">
              Type or dictate the full case — AI structures every field
            </p>
          </div>
          {!raw && (
            <button
              type="button"
              onClick={() =>
                setRaw(
                  "Patient Sachin Kumar C S, 31 year old male, IP 2627/00267, address 121 1st Main Kanaka Layout Bendre Nagar Bangalore. Admitted 3rd June 2026, discharged 8th June 2026, cash. Admitting consultant Dr Sathish Babu. Diagnosis right fracture humerus refracture with DCP insitu. Chief complaint slip and self fall at home on 1st June 2026 followed by fracture of right humerus. No known comorbidities. BP 130 by 80, HR 90, SpO2 98 percent on RA, temp normal, CVS S1 S2 present, RS bilateral air entry present, P/A soft and nontender. Treatment Inj Monocef 1gm IV one zero one, Inj Amikacin 500mg IV one zero one, Tab Limid 600mg one zero one. Discharge Tab Limid 600mg one zero one for 7 days, Tab Zerodol SP one zero one for 7 days. Review after 10 days with Dr Satish Babu."
                )
              }
              className="shrink-0 rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--green)] transition hover:bg-[var(--mint-soft)]"
            >
              Try sample
            </button>
          )}
        </div>

        {/* Dictate button */}
        <Dictation onAppend={(t) => setRaw((p) => (p + t).trimStart())} />

        {/* Notes textarea */}
        <textarea
          className="field mt-3 w-full resize-y"
          rows={4}
          placeholder="e.g. Patient Ravi Kumar, 45M, IP 1234. Fracture right femur. Admitted 5 Jun, discharged 10 Jun. Cash. BP 130/80, HR 88. Inj Monocef 1g IV 1-0-1…"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />

        {/* Actions */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={autofill}
            disabled={autofilling || !raw.trim()}
            className="btn-3d inline-flex items-center gap-2 px-5 py-2.5 text-sm"
          >
            {autofilling ? (
              <><Spinner /> Structuring&hellip;</>
            ) : (
              <>&#10024; Auto-fill all fields</>
            )}
          </button>
          {raw && !autofilling && (
            <button onClick={() => setRaw("")} className="btn-ghost px-4 py-2 text-sm">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* The structured form */}
      <div className="mt-6">
        <DischargeForm value={summary} onChange={setSummary} />
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 px-3 pb-3 sm:px-0 sm:pb-0">
        <div className="glass-strong mx-auto flex max-w-4xl items-center justify-between gap-2 rounded-2xl px-4 py-3 sm:mb-4 sm:px-5">
          <button
            onClick={() => downloadPdf(summary)}
            className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm sm:px-5 sm:py-2.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="hidden sm:inline">Download</span> PDF
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="btn-3d inline-flex items-center gap-2 px-5 py-2 text-sm sm:px-7 sm:py-2.5"
          >
            {saving ? (
              <>
                <Spinner /> Saving&hellip;
              </>
            ) : (
              <>💾 {id ? "Update" : "Save"} summary</>
            )}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed left-1/2 top-6 z-30 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.kind === "ok" ? "bg-[var(--green)]" : "bg-red-500"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// Prefer AI values where non-empty; keep prior values otherwise.
function smartMerge(
  prev: DischargeSummary,
  next: DischargeSummary
): DischargeSummary {
  const out = { ...prev };
  (Object.keys(next) as (keyof DischargeSummary)[]).forEach((k) => {
    const val = next[k];
    if (Array.isArray(val)) {
      if (val.length) (out[k] as unknown) = val;
    } else if (typeof val === "string" && val.trim() !== "") {
      (out[k] as unknown) = val;
    }
  });
  return out;
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}
