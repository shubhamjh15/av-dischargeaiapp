"use client";

import { DischargeSummary } from "@/lib/schema";
import MedList from "./MedList";
import FieldMic from "./FieldMic";

interface Props {
  value: DischargeSummary;
  onChange: (next: DischargeSummary) => void;
}

export default function DischargeForm({ value, onChange }: Props) {
  const set = <K extends keyof DischargeSummary>(
    key: K,
    v: DischargeSummary[K]
  ) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-6">
      {/* Patient / Admission */}
      <Section title="Patient & Admission" icon="🧾">
        <Grid>
          <Text label="Patient Name" v={value.name} on={(x) => set("name", x)} />
          <Text label="IP No" v={value.ip_no} on={(x) => set("ip_no", x)} />
          <Text label="Age" v={value.age} on={(x) => set("age", x)} />
          <Text label="Sex" v={value.sex} on={(x) => set("sex", x)} />
          <Text
            label="Date of Admission"
            v={value.date_of_admission}
            on={(x) => set("date_of_admission", x)}
          />
          <Text
            label="Date of Discharge"
            v={value.date_of_discharge}
            on={(x) => set("date_of_discharge", x)}
          />
          <Text
            label="Insurance / Cash"
            v={value.payment_type}
            on={(x) => set("payment_type", x)}
          />
          <Text
            label="Admitting Consultant"
            v={value.admitting_consultant}
            on={(x) => set("admitting_consultant", x)}
          />
        </Grid>
        <Area
          label="Address"
          v={value.address}
          on={(x) => set("address", x)}
          rows={2}
        />
      </Section>

      {/* Discharge Summary body */}
      <Section title="Discharge Summary" icon="📋">
        <Area label="Diagnosis" v={value.diagnosis} on={(x) => set("diagnosis", x)} />
        <Area
          label="Chief Complaint"
          v={value.chief_complaint}
          on={(x) => set("chief_complaint", x)}
        />
        <Area
          label="History of Present Illness"
          v={value.history_of_present_illness}
          on={(x) => set("history_of_present_illness", x)}
        />
        <Area
          label="Past History"
          v={value.past_history}
          on={(x) => set("past_history", x)}
        />
        <Area
          label="Investigations"
          v={value.investigations}
          on={(x) => set("investigations", x)}
          rows={2}
        />
        <Area
          label="Course in the Hospital"
          v={value.course_in_hospital}
          on={(x) => set("course_in_hospital", x)}
          rows={4}
        />
      </Section>

      {/* Clinical Examination */}
      <Section title="Clinical Examination" icon="🩺">
        <Grid cols={4}>
          <Text label="BP" v={value.bp} on={(x) => set("bp", x)} />
          <Text label="HR" v={value.hr} on={(x) => set("hr", x)} />
          <Text label="SpO2" v={value.spo2} on={(x) => set("spo2", x)} />
          <Text label="Temp" v={value.temp} on={(x) => set("temp", x)} />
          <Text label="CVS" v={value.cvs} on={(x) => set("cvs", x)} />
          <Text label="RS" v={value.rs} on={(x) => set("rs", x)} />
          <Text label="P/A" v={value.pa} on={(x) => set("pa", x)} />
        </Grid>
      </Section>

      {/* Operative Note */}
      <Section title="Operative Note" icon="🔬" subtitle="Fill when surgery was performed">
        <Grid>
          <Text label="Surgeon" v={value.surgeon} on={(x) => set("surgeon", x)} />
          <Text
            label="Anesthetist"
            v={value.anesthetist}
            on={(x) => set("anesthetist", x)}
          />
          <Text
            label="Type of Anesthesia"
            v={value.anesthesia_type}
            on={(x) => set("anesthesia_type", x)}
          />
          <Text
            label="Date of Procedure"
            v={value.date_of_procedure}
            on={(x) => set("date_of_procedure", x)}
          />
        </Grid>
        <Area
          label="Preoperative Diagnosis"
          v={value.preop_diagnosis}
          on={(x) => set("preop_diagnosis", x)}
        />
        <Area
          label="Operative Procedure Proposed"
          v={value.procedure_proposed}
          on={(x) => set("procedure_proposed", x)}
        />
        <Area
          label="Procedure (steps)"
          v={value.procedure_steps}
          on={(x) => set("procedure_steps", x)}
          rows={5}
        />
      </Section>

      {/* Treatment Given */}
      <Section title="Treatment Given" icon="💉" subtitle="In-hospital medications">
        <MedList
          variant="treatment"
          treatment={value.treatment_given}
          onTreatmentChange={(rows) => set("treatment_given", rows)}
        />
      </Section>

      {/* Advice on Discharge */}
      <Section title="Advice on Discharge" icon="💊" subtitle="Take-home medications">
        <MedList
          variant="discharge"
          discharge={value.discharge_meds}
          onDischargeChange={(rows) => set("discharge_meds", rows)}
        />
        <div className="mt-4 space-y-4">
          <Area
            label="General Advice"
            v={value.general_advice}
            on={(x) => set("general_advice", x)}
            rows={2}
          />
          <Text
            label="Review Note"
            v={value.review_note}
            on={(x) => set("review_note", x)}
          />
          <Text
            label="Doctor's Signature"
            v={value.doctors_signature}
            on={(x) => set("doctors_signature", x)}
          />
        </div>
      </Section>
    </div>
  );
}

/* ---------- small presentational helpers ---------- */

function Section({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-2xl p-4 sm:p-6 animate-fade-up">
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
          style={{
            background: "linear-gradient(135deg, #e6f5ec, #c9f0d8)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
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

function Grid({
  children,
  cols = 2,
}: {
  children: React.ReactNode;
  cols?: 2 | 4;
}) {
  return (
    <div
      className={`grid gap-3 ${
        cols === 4
          ? "grid-cols-2 sm:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-2"
      }`}
    >
      {children}
    </div>
  );
}

function Text({
  label,
  v,
  on,
}: {
  label: string;
  v: string;
  on: (x: string) => void;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="field-wrap">
        <input
          className="field has-mic"
          value={v}
          onChange={(e) => on(e.target.value)}
        />
        <FieldMic label={label} value={v} onChange={on} />
      </div>
    </div>
  );
}

function Area({
  label,
  v,
  on,
  rows = 3,
}: {
  label: string;
  v: string;
  on: (x: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="field-wrap">
        <textarea
          className="field has-mic resize-y"
          rows={rows}
          value={v}
          onChange={(e) => on(e.target.value)}
        />
        <FieldMic label={label} value={v} onChange={on} />
      </div>
    </div>
  );
}
