"use client";

import { useState } from "react";
import { DischargeSummary } from "@/lib/schema";
import MedList from "./MedList";
import FieldMic from "./FieldMic";

interface Props {
  value: DischargeSummary;
  onChange: (next: DischargeSummary) => void;
}

export default function DischargeForm({ value, onChange }: Props) {
  const set = <K extends keyof DischargeSummary>(k: K, v: DischargeSummary[K]) =>
    onChange({ ...value, [k]: v });

  const getSummary = () => value;

  // Operative section collapsed by default — most cases are non-surgical
  const hasSurgery = !!(value.surgeon || value.anesthetist || value.preop_diagnosis ||
    value.procedure_proposed || value.procedure_steps || value.date_of_procedure);
  const [opOpen, setOpOpen] = useState(hasSurgery);

  return (
    <div className="space-y-6">
      <Section id="sec-patient" title="Patient & Admission" icon="🧾">
        <Grid>
          <Text fieldKey="name"                 label="Patient Name"         id="f-name"       v={value.name}                 on={(x) => set("name", x)}                 gs={getSummary} />
          <Text fieldKey="ip_no"                label="IP No"                id="f-ip_no"      v={value.ip_no}                on={(x) => set("ip_no", x)}                gs={getSummary} />
          <Text fieldKey="age"                  label="Age"                  id="f-age"        v={value.age}                  on={(x) => set("age", x)}                  gs={getSummary} />
          <Text fieldKey="sex"                  label="Sex"                  id="f-sex"        v={value.sex}                  on={(x) => set("sex", x)}                  gs={getSummary} />
          <Text fieldKey="date_of_admission"    label="Date of Admission"    id="f-doa"        v={value.date_of_admission}    on={(x) => set("date_of_admission", x)}    gs={getSummary} />
          <Text fieldKey="date_of_discharge"    label="Date of Discharge"    id="f-dod"        v={value.date_of_discharge}    on={(x) => set("date_of_discharge", x)}    gs={getSummary} />
          <Text fieldKey="payment_type"         label="Insurance / Cash"     id="f-pay"        v={value.payment_type}         on={(x) => set("payment_type", x)}         gs={getSummary} />
          <Text fieldKey="admitting_consultant" label="Admitting Consultant" id="f-cons"       v={value.admitting_consultant} on={(x) => set("admitting_consultant", x)} gs={getSummary} />
        </Grid>
        <Area fieldKey="address" label="Address" id="f-addr" v={value.address} on={(x) => set("address", x)} rows={2} gs={getSummary} />
      </Section>

      <Section id="sec-summary" title="Discharge Summary" icon="📋">
        <Area fieldKey="diagnosis"                    label="Diagnosis"                    id="f-diag"    v={value.diagnosis}                    on={(x) => set("diagnosis", x)}                    gs={getSummary} />
        <Area fieldKey="chief_complaint"              label="Chief Complaint"              id="f-cc"      v={value.chief_complaint}              on={(x) => set("chief_complaint", x)}              gs={getSummary} />
        <Area fieldKey="history_of_present_illness"   label="History of Present Illness"  id="f-hpi"     v={value.history_of_present_illness}   on={(x) => set("history_of_present_illness", x)}   gs={getSummary} rows={4} />
        <Area fieldKey="past_history"                 label="Past History"                id="f-ph"      v={value.past_history}                 on={(x) => set("past_history", x)}                 gs={getSummary} />
        <Area fieldKey="investigations"               label="Investigations"              id="f-inv"     v={value.investigations}               on={(x) => set("investigations", x)}               gs={getSummary} rows={2} />
        <Area fieldKey="course_in_hospital"           label="Course in the Hospital"      id="f-cih"     v={value.course_in_hospital}           on={(x) => set("course_in_hospital", x)}           gs={getSummary} rows={4} />
      </Section>

      <Section id="sec-clinical" title="Clinical Examination" icon="🩺">
        <Grid cols={4}>
          <Text fieldKey="bp"   label="BP"   id="f-bp"   v={value.bp}   on={(x) => set("bp", x)}   gs={getSummary} />
          <Text fieldKey="hr"   label="HR"   id="f-hr"   v={value.hr}   on={(x) => set("hr", x)}   gs={getSummary} />
          <Text fieldKey="spo2" label="SpO2" id="f-spo2" v={value.spo2} on={(x) => set("spo2", x)} gs={getSummary} />
          <Text fieldKey="temp" label="Temp" id="f-temp" v={value.temp} on={(x) => set("temp", x)} gs={getSummary} />
          <Text fieldKey="cvs"  label="CVS"  id="f-cvs"  v={value.cvs}  on={(x) => set("cvs", x)}  gs={getSummary} />
          <Text fieldKey="rs"   label="RS"   id="f-rs"   v={value.rs}   on={(x) => set("rs", x)}   gs={getSummary} />
          <Text fieldKey="pa"   label="P/A"  id="f-pa"   v={value.pa}   on={(x) => set("pa", x)}   gs={getSummary} />
        </Grid>
      </Section>

      {/* Operative note — collapsible, only expanded when surgery data exists */}
      <section id="sec-operative" className="glass rounded-2xl animate-fade-up scroll-mt-24 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 p-4 sm:p-6 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
              style={{ background: "linear-gradient(135deg, #e6f5ec, #c9f0d8)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }}>
              🔬
            </div>
            <div>
              <h2 className="section-title">Operative Note</h2>
              <p className="text-xs text-slate-500">Tap to {opOpen ? "collapse" : "expand"} — fill only if surgery was performed</p>
            </div>
          </div>
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="shrink-0 text-[var(--ink-3)] transition-transform duration-200"
            style={{ transform: opOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {opOpen && (
          <div className="space-y-4 px-4 pb-6 sm:px-6">
            <Grid>
              <Text fieldKey="surgeon"           label="Surgeon"            id="f-surg"  v={value.surgeon}           on={(x) => set("surgeon", x)}           gs={getSummary} />
              <Text fieldKey="anesthetist"       label="Anesthetist"        id="f-anes"  v={value.anesthetist}       on={(x) => set("anesthetist", x)}       gs={getSummary} />
              <Text fieldKey="anesthesia_type"   label="Type of Anesthesia" id="f-atyp"  v={value.anesthesia_type}   on={(x) => set("anesthesia_type", x)}   gs={getSummary} />
              <Text fieldKey="date_of_procedure" label="Date of Procedure"  id="f-dop"   v={value.date_of_procedure} on={(x) => set("date_of_procedure", x)} gs={getSummary} />
            </Grid>
            <Area fieldKey="preop_diagnosis"    label="Preoperative Diagnosis"         id="f-pred"  v={value.preop_diagnosis}    on={(x) => set("preop_diagnosis", x)}    gs={getSummary} />
            <Area fieldKey="procedure_proposed" label="Operative Procedure Proposed"   id="f-prop"  v={value.procedure_proposed} on={(x) => set("procedure_proposed", x)} gs={getSummary} />
            <Area fieldKey="procedure_steps"    label="Procedure (steps)"              id="f-pstep" v={value.procedure_steps}    on={(x) => set("procedure_steps", x)}    gs={getSummary} rows={5} />
          </div>
        )}
      </section>

      <Section id="sec-treatment" title="Treatment Given" icon="💉" subtitle="In-hospital medications">
        <MedList
          variant="treatment"
          treatment={value.treatment_given}
          onTreatmentChange={(rows) => set("treatment_given", rows)}
        />
      </Section>

      <Section id="sec-advice" title="Advice on Discharge" icon="💊" subtitle="Take-home medications">
        <MedList
          variant="discharge"
          discharge={value.discharge_meds}
          onDischargeChange={(rows) => set("discharge_meds", rows)}
        />
        <div className="mt-4 space-y-4">
          <Area fieldKey="general_advice"    label="General Advice"     id="f-gadv"  v={value.general_advice}    on={(x) => set("general_advice", x)}    rows={2} gs={getSummary} />
          <Text fieldKey="review_note"       label="Review Note"        id="f-rev"   v={value.review_note}       on={(x) => set("review_note", x)}       gs={getSummary} />
          <Text fieldKey="doctors_signature" label="Doctor's Signature" id="f-sig"   v={value.doctors_signature} on={(x) => set("doctors_signature", x)} gs={getSummary} />
        </div>
      </Section>
    </div>
  );
}

function Section({ id, title, icon, subtitle, children }: {
  id?: string; title: string; icon: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="glass rounded-2xl p-4 sm:p-6 animate-fade-up scroll-mt-24">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ background: "linear-gradient(135deg, #e6f5ec, #c9f0d8)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }}>
          {icon}
        </div>
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Grid({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 4 }) {
  return (
    <div className={`grid gap-3 ${cols === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"}`}>
      {children}
    </div>
  );
}

function Text({ fieldKey, label, id, v, on, gs }: {
  fieldKey: string; label: string; id: string; v: string;
  on: (x: string) => void; gs: () => Partial<DischargeSummary>;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="field-wrap">
        <input id={id} className="field has-mic" value={v} onChange={(e) => on(e.target.value)} />
        <FieldMic fieldKey={fieldKey} label={label} value={v} onChange={on} getSummary={gs} />
      </div>
    </div>
  );
}

function Area({ fieldKey, label, id, v, on, rows = 3, gs }: {
  fieldKey: string; label: string; id: string; v: string;
  on: (x: string) => void; rows?: number; gs: () => Partial<DischargeSummary>;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="field-wrap">
        <textarea id={id} className="field has-mic resize-y" rows={rows} value={v} onChange={(e) => on(e.target.value)} />
        <FieldMic fieldKey={fieldKey} label={label} value={v} onChange={on} getSummary={gs} />
      </div>
    </div>
  );
}
