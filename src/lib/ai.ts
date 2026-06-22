import Groq from "groq-sdk";
import { DischargeSummary, mergeSummary } from "./schema";

const MODEL = "llama-3.3-70b-versatile";

// ─── Field-level context: what each field expects ────────────────────────────
// This is sent to Groq so it understands the FORMAT and CLINICAL CONTEXT of
// each specific field — not just its label name.
const FIELD_CONTEXT: Record<string, string> = {
  // Patient block
  name:                  "Patient full name. Capitalise each word. E.g. 'Priya Ramesh'.",
  ip_no:                 "Hospital IP number. Format as-is, e.g. '3041/00341'.",
  age:                   "Patient age. E.g. '42 years' or '6 months'.",
  sex:                   "Patient sex. Must be 'Male' or 'Female'.",
  address:               "Patient's home address. Expand dictated shorthand, fix spelling of area/locality names.",
  date_of_admission:     "Date of hospital admission. Format as DD-Mon-YYYY, e.g. '02-Jun-2026'.",
  date_of_discharge:     "Date of discharge. Format as DD-Mon-YYYY, e.g. '09-Jun-2026'.",
  payment_type:          "Payment method. Either 'Cash' or the insurer name, e.g. 'Insurance (Star Health)'.",
  admitting_consultant:  "Consulting doctor's name and qualification. E.g. 'Dr. Kavitha Srinivas, MS (OBG)'.",

  // Discharge summary body
  diagnosis:             "Primary clinical diagnosis. Use proper medical terminology, correct spelling of conditions, procedures and eponyms. Include laterality where applicable.",
  chief_complaint:       "Patient's presenting complaint in clear clinical language. 1-2 sentences.",
  history_of_present_illness: "Detailed narrative of the current illness. Fix medical spelling and terminology. Keep all clinical facts exactly as dictated — do not summarise or omit.",
  past_history:          "Past medical, surgical, drug and allergy history. Use standard clinical phrasing.",
  investigations:        "Lab and imaging results. Fix units and abbreviations: g/dL, mg/dL, cells/cumm, etc. Keep all values exactly as dictated.",
  course_in_hospital:    "Narrative of hospital stay: admission, interventions, daily progress, response to treatment, discharge condition. Fix terminology, keep all facts.",

  // Vitals
  bp:                    "Blood pressure reading. Format as '120/80 mmHg'.",
  hr:                    "Heart rate. Format as '88 bpm'.",
  spo2:                  "Oxygen saturation. Format as '98% on room air' or '99% on RA'.",
  temp:                  "Temperature. Format as 'Afebrile' or '38.2°C'.",
  cvs:                   "Cardiovascular examination finding. E.g. 'S1 S2 heard, no murmur'.",
  rs:                    "Respiratory system finding. E.g. 'Bilateral air entry present, clear'.",
  pa:                    "Per abdomen / abdominal examination finding. E.g. 'Soft, non-tender, no organomegaly'.",

  // Operative note
  surgeon:               "Operating surgeon's name and qualification.",
  anesthetist:           "Anaesthetist's name and qualification.",
  preop_diagnosis:       "Pre-operative diagnosis. Correct medical terminology.",
  procedure_proposed:    "Name of the surgical procedure proposed. Use standard surgical nomenclature.",
  anesthesia_type:       "Type of anaesthesia used. E.g. 'Spinal Anaesthesia', 'General Anaesthesia'.",
  date_of_procedure:     "Date the procedure was performed. Format as DD-Mon-YYYY.",
  procedure_steps:       "Step-by-step operative note. Fix surgical and anatomical terminology. Keep all steps exactly as dictated.",

  // Advice
  general_advice:        "Discharge instructions for the patient. Numbered list preferred. Fix spelling and grammar, keep all points.",
  review_note:           "Follow-up instructions: when to review, with whom, contact number.",
  doctors_signature:     "Signing doctor's name and qualification.",
};

// Per-field clean: takes raw dictated/typed text for ONE specific field,
// uses full field context + the current summary state for cross-field consistency,
// and returns medically corrected, properly formatted text.
export async function cleanField(
  rawText: string,
  fieldKey: string,
  label: string,
  currentSummary?: Partial<DischargeSummary>
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return rawText;

  const groq = new Groq({ apiKey });
  const fieldGuide = FIELD_CONTEXT[fieldKey] ?? `A field labelled "${label}" in a hospital discharge summary.`;

  // Build cross-field context so Groq can ensure consistency
  // (e.g. drug names already used in treatment should match in discharge meds)
  let crossContext = "";
  if (currentSummary) {
    const parts: string[] = [];
    if (currentSummary.name)      parts.push(`Patient: ${currentSummary.name}`);
    if (currentSummary.diagnosis) parts.push(`Diagnosis: ${currentSummary.diagnosis}`);
    if (currentSummary.admitting_consultant) parts.push(`Consultant: ${currentSummary.admitting_consultant}`);
    if (currentSummary.surgeon)   parts.push(`Surgeon: ${currentSummary.surgeon}`);
    if (currentSummary.treatment_given?.length) {
      const drugs = currentSummary.treatment_given.map(m => m.drug).filter(Boolean).join(", ");
      if (drugs) parts.push(`Treatment drugs already recorded: ${drugs}`);
    }
    if (parts.length) crossContext = `\nContext from other fields:\n${parts.join("\n")}`;
  }

  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content:
          "You are a senior medical transcription editor for an Indian hospital discharge summary system.\n" +
          "You are given raw text (dictated or typed by a doctor) for ONE specific field.\n\n" +
          "YOUR ONLY JOB — fix spelling, format, and medical terminology. NOTHING ELSE:\n" +
          "1. Fix ALL medical spelling: drug names (Inj. Monocef, Tab. Augmentin, Inj. Tramadol), diagnoses (fracture, haemorrhage, appendicitis), anatomical terms, eponyms.\n" +
          "2. Fix capitalisation: drug names → Title Case. Diagnoses → sentence case.\n" +
          "3. Expand dictation shorthand ONLY: 'one zero one' → '1-0-1', 'BP 130 by 80' → '130/80 mmHg', 'percent' → '%', 'degree' → '°', 'point' → '.'.\n" +
          "4. Fix punctuation and spacing.\n" +
          "5. Apply the field-specific format described in the user message.\n" +
          "6. Use cross-field context for consistent spelling of names and drug names already recorded.\n\n" +
          "ABSOLUTE RULES — violating any of these is a critical error:\n" +
          "- PRESERVE EVERY PIECE OF INFORMATION. Do not delete, condense, summarise, or omit any word, number, or fact the doctor said.\n" +
          "- Do NOT invent, add, or assume any clinical fact not present in the raw text.\n" +
          "- Do NOT reorder sentences or restructure content.\n" +
          "- Return ONLY the corrected text. No quotes, no labels, no explanation, no preamble.\n" +
          "- If the text is already correct, return it exactly as-is.\n" +
          "- Never refuse. Always return something.",
      },
      {
        role: "user",
        content:
          `Field: ${label}\n` +
          `Field format guide: ${fieldGuide}\n` +
          `${crossContext}\n` +
          `Raw text to correct:\n${rawText}`,
      },
    ],
  });

  const out = completion.choices[0]?.message?.content?.trim() ?? rawText;
  return out.replace(/^["'""«»]+|["'""«»]+$/g, "").trim() || rawText;
}

// ─── Global autofill ─────────────────────────────────────────────────────────
const FIELD_GUIDE = `Return a JSON object with EXACTLY these keys (use "" when not mentioned):
name, ip_no, age, sex, address, date_of_admission, date_of_discharge, payment_type, admitting_consultant,
diagnosis, chief_complaint, history_of_present_illness, past_history, investigations, course_in_hospital,
bp, hr, spo2, temp, cvs, rs, pa,
surgeon, anesthetist, preop_diagnosis, procedure_proposed, anesthesia_type, date_of_procedure, procedure_steps,
general_advice, review_note, doctors_signature,
treatment_given (array of {drug, dose, route, frequency}),
discharge_meds (array of {drug, dosage_pattern, duration}).

RULES — follow every one precisely:
- CAPTURE EVERY DETAIL the doctor mentioned. Do not skip, condense, or summarise anything.
- Fix medical spelling: drug names (Inj. Monocef, Tab. Augmentin), diagnoses (fracture, haemorrhage), procedures — use correct medical English.
- Expand dictation shorthand: "one zero one" → "1-0-1", "BP 130 by 80" → "130/80 mmHg", "percent" → "%".
- payment_type: "Cash" or insurer name.
- Do NOT invent facts not stated. Use "" for any field not mentioned.
- Medications — split each drug: "Inj Monocef 1gm IV one zero one" → {drug:"Inj. Monocef 1gm", dose:"1gm", route:"IV", frequency:"1-0-1"}.
- Dates: format as DD-Mon-YYYY (e.g. "03-Jun-2026").
- For narrative fields (history_of_present_illness, course_in_hospital, procedure_steps): write complete sentences preserving every clinical detail — do NOT shorten.
- Return ONLY the JSON object, no markdown, no explanation, no preamble.`;

export async function extractSummary(rawText: string): Promise<DischargeSummary> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY missing.");

  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a medical transcription AI for an Indian hospital. " +
          "Convert the doctor's free-form discharge dictation into structured JSON. " +
          "Use correct medical English spelling and terminology throughout. " +
          FIELD_GUIDE,
      },
      {
        role: "user",
        content: `Dictation / notes:\n"""\n${rawText}\n"""\n\nReturn the JSON object now.`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  let parsed: Partial<DischargeSummary> = {};
  try { parsed = JSON.parse(content); } catch { parsed = {}; }
  return mergeSummary(parsed);
}
