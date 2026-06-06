// Single source of truth for the discharge summary shape.
// Used by: the form, the Groq auto-fill response, and the PDF generator.
// Transcribed directly from the AV Multispeciality Hospital discharge document.

export interface TreatmentMed {
  drug: string; // e.g. "Inj. Monocef 1gm"
  dose: string; // e.g. "1gm" (kept separate for clarity, optional)
  route: string; // e.g. "IV"
  frequency: string; // e.g. "1-0-1"
}

export interface DischargeMed {
  drug: string; // e.g. "Tab. Limid 600mg"
  dosage_pattern: string; // e.g. "1-0-1"
  duration: string; // e.g. "7 days"
}

export interface DischargeSummary {
  // --- Patient / admission block ---
  name: string;
  ip_no: string;
  age: string;
  sex: string;
  address: string;
  date_of_admission: string;
  date_of_discharge: string;
  payment_type: string; // Cash / Insurance
  admitting_consultant: string;

  // --- Discharge summary body (Page 1) ---
  diagnosis: string;
  chief_complaint: string;
  history_of_present_illness: string;
  past_history: string;
  investigations: string;
  course_in_hospital: string;

  // --- Clinical examination ---
  bp: string;
  hr: string;
  spo2: string;
  temp: string;
  cvs: string;
  rs: string;
  pa: string;

  // --- Operative note (Page 2, when surgery happened) ---
  surgeon: string;
  anesthetist: string;
  preop_diagnosis: string;
  procedure_proposed: string;
  anesthesia_type: string;
  date_of_procedure: string;
  procedure_steps: string;

  // --- Medications ---
  treatment_given: TreatmentMed[];
  discharge_meds: DischargeMed[];

  // --- Discharge advice ---
  general_advice: string;
  review_note: string;
  doctors_signature: string;
}

export const EMPTY_SUMMARY: DischargeSummary = {
  name: "",
  ip_no: "",
  age: "",
  sex: "",
  address: "",
  date_of_admission: "",
  date_of_discharge: "",
  payment_type: "",
  admitting_consultant: "",
  diagnosis: "",
  chief_complaint: "",
  history_of_present_illness: "",
  past_history: "",
  investigations: "",
  course_in_hospital: "",
  bp: "",
  hr: "",
  spo2: "",
  temp: "",
  cvs: "",
  rs: "",
  pa: "",
  surgeon: "",
  anesthetist: "",
  preop_diagnosis: "",
  procedure_proposed: "",
  anesthesia_type: "",
  date_of_procedure: "",
  procedure_steps: "",
  treatment_given: [],
  discharge_meds: [],
  general_advice: "",
  review_note: "",
  doctors_signature: "",
};

// Hospital constants (printed on the PDF header/footer)
export const HOSPITAL = {
  name: "A.V. MULTISPECIALITY HOSPITAL",
  address:
    "#781, 782, 100ft Ring Road, Hosakerehalli, Opp. Little Flower Public School, BSK 3rd stage, Bangalore - 85",
  contacts: "Contact: 2672 5700, 99452 71291, 72599 03816, 99006 91230",
  emergency:
    "IN CASE OF EMERGENCY PLEASE CONTACT 080-26725700/800 / VISIT THE HOSPITAL",
};

// Merge a partial (e.g. from the AI) onto the empty template safely.
export function mergeSummary(partial: Partial<DischargeSummary>): DischargeSummary {
  return {
    ...EMPTY_SUMMARY,
    ...partial,
    treatment_given: Array.isArray(partial.treatment_given)
      ? partial.treatment_given.map((m) => ({
          drug: m?.drug ?? "",
          dose: m?.dose ?? "",
          route: m?.route ?? "",
          frequency: m?.frequency ?? "",
        }))
      : [],
    discharge_meds: Array.isArray(partial.discharge_meds)
      ? partial.discharge_meds.map((m) => ({
          drug: m?.drug ?? "",
          dosage_pattern: m?.dosage_pattern ?? "",
          duration: m?.duration ?? "",
        }))
      : [],
  };
}
