"use client";

import { DischargeMed, TreatmentMed } from "@/lib/schema";

// Two flavors of repeatable medication rows. Kept in one component to avoid
// duplication — `variant` decides the columns.

type Variant = "treatment" | "discharge";

interface Props {
  variant: Variant;
  treatment?: TreatmentMed[];
  discharge?: DischargeMed[];
  onTreatmentChange?: (rows: TreatmentMed[]) => void;
  onDischargeChange?: (rows: DischargeMed[]) => void;
}

export default function MedList({
  variant,
  treatment = [],
  discharge = [],
  onTreatmentChange,
  onDischargeChange,
}: Props) {
  if (variant === "treatment") {
    const rows = treatment;
    const set = (next: TreatmentMed[]) => onTreatmentChange?.(next);
    return (
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input
              className="field col-span-5"
              placeholder="Drug (e.g. Inj. Monocef 1gm)"
              value={row.drug}
              onChange={(e) =>
                set(rows.map((r, j) => (j === i ? { ...r, drug: e.target.value } : r)))
              }
            />
            <input
              className="field col-span-2"
              placeholder="Dose"
              value={row.dose}
              onChange={(e) =>
                set(rows.map((r, j) => (j === i ? { ...r, dose: e.target.value } : r)))
              }
            />
            <input
              className="field col-span-2"
              placeholder="Route"
              value={row.route}
              onChange={(e) =>
                set(rows.map((r, j) => (j === i ? { ...r, route: e.target.value } : r)))
              }
            />
            <input
              className="field col-span-2"
              placeholder="1-0-1"
              value={row.frequency}
              onChange={(e) =>
                set(
                  rows.map((r, j) =>
                    j === i ? { ...r, frequency: e.target.value } : r
                  )
                )
              }
            />
            <button
              type="button"
              onClick={() => set(rows.filter((_, j) => j !== i))}
              className="col-span-1 rounded-xl text-red-500 transition hover:bg-red-50"
              aria-label="Remove row"
            >
              ✕
            </button>
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

  // discharge variant
  const rows = discharge;
  const set = (next: DischargeMed[]) => onDischargeChange?.(next);
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-12 gap-2">
          <input
            className="field col-span-6"
            placeholder="Drug (e.g. Tab. Limid 600mg)"
            value={row.drug}
            onChange={(e) =>
              set(rows.map((r, j) => (j === i ? { ...r, drug: e.target.value } : r)))
            }
          />
          <input
            className="field col-span-3"
            placeholder="1-0-1"
            value={row.dosage_pattern}
            onChange={(e) =>
              set(
                rows.map((r, j) =>
                  j === i ? { ...r, dosage_pattern: e.target.value } : r
                )
              )
            }
          />
          <input
            className="field col-span-2"
            placeholder="7 days"
            value={row.duration}
            onChange={(e) =>
              set(rows.map((r, j) => (j === i ? { ...r, duration: e.target.value } : r)))
            }
          />
          <button
            type="button"
            onClick={() => set(rows.filter((_, j) => j !== i))}
            className="col-span-1 rounded-xl text-red-500 transition hover:bg-red-50"
            aria-label="Remove row"
          >
            ✕
          </button>
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
