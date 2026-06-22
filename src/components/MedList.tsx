"use client";

import { DischargeMed, TreatmentMed } from "@/lib/schema";

type Variant = "treatment" | "discharge";

interface Props {
  variant: Variant;
  treatment?: TreatmentMed[];
  discharge?: DischargeMed[];
  onTreatmentChange?: (rows: TreatmentMed[]) => void;
  onDischargeChange?: (rows: DischargeMed[]) => void;
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-red-400 transition hover:bg-red-50 hover:text-red-600 active:scale-95"
      aria-label="Remove row"
      title="Remove"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    </button>
  );
}

export default function MedList({ variant, treatment = [], discharge = [], onTreatmentChange, onDischargeChange }: Props) {
  if (variant === "treatment") {
    const rows = treatment;
    const set = (next: TreatmentMed[]) => onTreatmentChange?.(next);

    return (
      <div className="space-y-2">
        {/* Header row — hidden on mobile */}
        {rows.length > 0 && (
          <div className="hidden grid-cols-[1fr_80px_80px_90px_36px] gap-2 sm:grid">
            {["Drug / Name", "Dose", "Route", "Frequency", ""].map((h) => (
              <span key={h} className="field-label px-1">{h}</span>
            ))}
          </div>
        )}

        {rows.map((row, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-white/60 p-3 sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0">
            {/* Mobile labels */}
            <div className="grid grid-cols-2 gap-2 sm:contents">
              <div className="col-span-2 sm:contents">
                <div className="sm:hidden">
                  <span className="field-label">Drug</span>
                </div>
                <input
                  className="field sm:flex-1"
                  style={{ minWidth: 0 }}
                  placeholder="Inj. Monocef 1gm"
                  value={row.drug}
                  onChange={(e) => set(rows.map((r, j) => j === i ? { ...r, drug: e.target.value } : r))}
                />
              </div>
              <div>
                <div className="sm:hidden"><span className="field-label">Dose</span></div>
                <input
                  className="field w-full sm:w-20"
                  placeholder="1gm"
                  value={row.dose}
                  onChange={(e) => set(rows.map((r, j) => j === i ? { ...r, dose: e.target.value } : r))}
                />
              </div>
              <div>
                <div className="sm:hidden"><span className="field-label">Route</span></div>
                <input
                  className="field w-full sm:w-20"
                  placeholder="IV"
                  value={row.route}
                  onChange={(e) => set(rows.map((r, j) => j === i ? { ...r, route: e.target.value } : r))}
                />
              </div>
              <div>
                <div className="sm:hidden"><span className="field-label">Frequency</span></div>
                <input
                  className="field w-full sm:w-[90px]"
                  placeholder="1-0-1"
                  value={row.frequency}
                  onChange={(e) => set(rows.map((r, j) => j === i ? { ...r, frequency: e.target.value } : r))}
                />
              </div>
            </div>
            <RemoveBtn onClick={() => set(rows.filter((_, j) => j !== i))} />
          </div>
        ))}

        <button
          type="button"
          onClick={() => set([...rows, { drug: "", dose: "", route: "", frequency: "" }])}
          className="btn-ghost px-4 py-2 text-sm"
        >
          + Add medication
        </button>
      </div>
    );
  }

  const rows = discharge;
  const set = (next: DischargeMed[]) => onDischargeChange?.(next);

  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="hidden grid-cols-[1fr_100px_90px_36px] gap-2 sm:grid">
          {["Drug / Name", "Pattern", "Duration", ""].map((h) => (
            <span key={h} className="field-label px-1">{h}</span>
          ))}
        </div>
      )}

      {rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-white/60 p-3 sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0">
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <div className="col-span-2 sm:contents">
              <div className="sm:hidden"><span className="field-label">Drug</span></div>
              <input
                className="field sm:flex-1"
                style={{ minWidth: 0 }}
                placeholder="Tab. Limid 600mg"
                value={row.drug}
                onChange={(e) => set(rows.map((r, j) => j === i ? { ...r, drug: e.target.value } : r))}
              />
            </div>
            <div>
              <div className="sm:hidden"><span className="field-label">Pattern</span></div>
              <input
                className="field w-full sm:w-[100px]"
                placeholder="1-0-1"
                value={row.dosage_pattern}
                onChange={(e) => set(rows.map((r, j) => j === i ? { ...r, dosage_pattern: e.target.value } : r))}
              />
            </div>
            <div>
              <div className="sm:hidden"><span className="field-label">Duration</span></div>
              <input
                className="field w-full sm:w-[90px]"
                placeholder="7 days"
                value={row.duration}
                onChange={(e) => set(rows.map((r, j) => j === i ? { ...r, duration: e.target.value } : r))}
              />
            </div>
          </div>
          <RemoveBtn onClick={() => set(rows.filter((_, j) => j !== i))} />
        </div>
      ))}

      <button
        type="button"
        onClick={() => set([...rows, { drug: "", dosage_pattern: "", duration: "" }])}
        className="btn-ghost px-4 py-2 text-sm"
      >
        + Add medication
      </button>
    </div>
  );
}
