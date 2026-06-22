import Groq from "groq-sdk";
import { DischargeSummary, mergeSummary } from "./schema";

// Most capable model for everything — medical accuracy beats shaving a second.
const MODEL = "llama-3.3-70b-versatile";

// ─── Field-level context ─────────────────────────────────────────────────────
const FIELD_CONTEXT: Record<string, string> = {
  name:                       "Patient full name. Capitalise each word. E.g. 'Priya Ramesh'.",
  ip_no:                      "Hospital IP number. Format as-is, e.g. '3041/00341'.",
  age:                        "Patient age. E.g. '42 years' or '6 months'.",
  sex:                        "Patient sex. Must be 'Male' or 'Female'.",
  address:                    "Patient's home address. Expand dictated shorthand, fix spelling of area/locality names in Bangalore.",
  date_of_admission:          "Date of hospital admission. Format as DD-Mon-YYYY, e.g. '02-Jun-2026'.",
  date_of_discharge:          "Date of discharge. Format as DD-Mon-YYYY, e.g. '09-Jun-2026'.",
  payment_type:               "Payment method. Either 'Cash' or the insurer name, e.g. 'Insurance (Star Health)'.",
  admitting_consultant:       "Consulting doctor's name and qualification. E.g. 'Dr. Kavitha Srinivas, MS (OBG)'.",
  diagnosis:                  "Primary clinical diagnosis. Use proper medical terminology, correct spelling of conditions, procedures and eponyms. Include laterality where applicable.",
  chief_complaint:            "Patient's presenting complaint in clear clinical language. 1-2 sentences.",
  history_of_present_illness: "Detailed narrative of the current illness. Fix medical spelling and terminology. Keep all clinical facts exactly as dictated — do not summarise or omit.",
  past_history:               "Past medical, surgical, drug and allergy history. Use standard clinical phrasing.",
  investigations:             "Lab and imaging results. Fix units and abbreviations: g/dL, mg/dL, cells/cumm, etc. Keep all values exactly as dictated.",
  course_in_hospital:         "Narrative of hospital stay: admission, interventions, daily progress, response to treatment, discharge condition. Fix terminology, keep all facts.",
  bp:                         "Blood pressure reading. Format as '120/80 mmHg'.",
  hr:                         "Heart rate. Format as '88 bpm'.",
  spo2:                       "Oxygen saturation. Format as '98% on room air' or '99% on RA'.",
  temp:                       "Temperature. Format as 'Afebrile' or '38.2°C'.",
  cvs:                        "Cardiovascular examination finding. E.g. 'S1 S2 heard, no murmur'.",
  rs:                         "Respiratory system finding. E.g. 'Bilateral air entry present, clear'.",
  pa:                         "Per abdomen / abdominal examination finding. E.g. 'Soft, non-tender, no organomegaly'.",
  surgeon:                    "Operating surgeon's name and qualification.",
  anesthetist:                "Anaesthetist's name and qualification.",
  preop_diagnosis:            "Pre-operative diagnosis. Correct medical terminology.",
  procedure_proposed:         "Name of the surgical procedure proposed. Use standard surgical nomenclature.",
  anesthesia_type:            "Type of anaesthesia used. E.g. 'Spinal Anaesthesia', 'General Anaesthesia'.",
  date_of_procedure:          "Date the procedure was performed. Format as DD-Mon-YYYY.",
  procedure_steps:            "Step-by-step operative note. Fix surgical and anatomical terminology. Keep all steps exactly as dictated.",
  general_advice:             "Discharge instructions for the patient. Numbered list preferred. Fix spelling and grammar, keep all points.",
  review_note:                "Follow-up instructions: when to review, with whom, contact number.",
  doctors_signature:          "Signing doctor's name and qualification.",
};

// ─── Indian medical pronunciation correction map ─────────────────────────────
// Common dictation errors due to Indian English pronunciation
const PRONUNCIATION_FIXES = `
Common Indian-English dictation corrections to apply (pronunciation → correct medical term):
- "mona sef" / "monosef" / "monocef" → "Monocef"
- "amikacin" / "amicasin" / "ami kacin" → "Amikacin"
- "tramadole" / "tramedol" / "trauma dol" → "Tramadol"
- "pantaprazole" / "panta" / "pantop" → "Pantoprazole"
- "ondansetron" / "ondan setron" → "Ondansetron"
- "metrogil" / "metro jil" / "metronidazole" → "Metronidazole"
- "augmentin" / "ogmentin" → "Augmentin"
- "paracetamol" / "para" → "Paracetamol"
- "diclofenac" / "diclo" / "diclofanak" → "Diclofenac"
- "zerodol" / "zero dol" → "Zerodol"
- "limid" / "linezolid" / "lymid" → "Linezolid"
- "haemorrhage" / "hemorrhage" / "hemmorage" → "Haemorrhage"
- "fracture" / "freakture" / "frakture" → "Fracture"
- "appendicitis" / "apendisitis" → "Appendicitis"
- "cholecystitis" / "chole" → "Cholecystitis"
- "laparoscopy" / "laproscopy" / "lapro" → "Laparoscopy"
- "cholecystectomy" / "chole ectomy" → "Cholecystectomy"
- "appendectomy" / "appendisectomy" → "Appendectomy"
- "hysterectomy" / "hystro" → "Hysterectomy"
- "humerus" / "humorous" / "humrus" → "Humerus"
- "femur" / "feamer" → "Femur"
- "tibia" / "tibi" → "Tibia"
- "anaesthesia" / "anesthesia" / "anesthia" → "Anaesthesia"
- "spinal" → "Spinal"
- "general anaesthesia" / "GA" → "General Anaesthesia"
- "DCP" / "dynamic compression plate" → "DCP (Dynamic Compression Plate)"
- "ORIF" / "open reduction internal fixation" → "ORIF (Open Reduction Internal Fixation)"
- "intra medullary nail" / "IM nail" → "Intramedullary Nail"
- "one zero one" / "one-zero-one" → "1-0-1"
- "zero one zero" → "0-1-0"
- "one one one" → "1-1-1"
- "twice daily" / "BD" → "1-0-1 (BD)"
- "thrice daily" / "TDS" → "1-1-1 (TDS)"
- "once daily" / "OD" → "1-0-0 (OD)"
- "BP 130 by 80" / "130 by 80" → "130/80 mmHg"
- "HR" / "heart rate" → keep as dictated with "bpm"
- "SPO2" / "spo 2" / "saturation" → "SpO2"
- "room air" / "RA" → "on room air"
- "S1 S2" / "S 1 S 2" → "S1 S2"
- "nontender" / "non tender" → "non-tender"
`;

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

  // Cross-field context for consistency
  let crossContext = "";
  if (currentSummary) {
    const parts: string[] = [];
    if (currentSummary.name)      parts.push(`Patient name: ${currentSummary.name}`);
    if (currentSummary.diagnosis) parts.push(`Diagnosis: ${currentSummary.diagnosis}`);
    if (currentSummary.admitting_consultant) parts.push(`Consultant: ${currentSummary.admitting_consultant}`);
    if (currentSummary.surgeon)   parts.push(`Surgeon: ${currentSummary.surgeon}`);
    if (currentSummary.treatment_given?.length) {
      const drugs = currentSummary.treatment_given.map(m => m.drug).filter(Boolean).join(", ");
      if (drugs) parts.push(`Drugs already recorded: ${drugs}`);
    }
    if (parts.length) crossContext = `\nConsistency context (use same spellings):\n${parts.join("\n")}`;
  }

  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 1200,
    messages: [
      {
        role: "system",
        content:
          "You are an expert medical transcription editor for an Indian hospital, with deep knowledge of drug names, diagnoses, anatomy, and surgical procedures. A doctor dictated text for ONE field of a discharge summary using voice recognition. Voice recognition often mis-hears medical terms because of Indian-English pronunciation — your job is to recover what the doctor ACTUALLY MEANT.\n\n" +
          "HOW TO THINK (this is the key skill):\n" +
          "Do NOT just match a fixed list. REASON about each suspicious word using:\n" +
          "  • PHONETICS — does the garbled word SOUND LIKE a known medical term? ('mona sef'→Monocef, 'tram a doll'→Tramadol, 'see f tri axone'→Ceftriaxone, 'human rus'→Humerus, 'after stay'→ apply context).\n" +
          "  • FIELD CONTEXT — which field is this? A diagnosis field expects a condition; a treatment field expects a drug; a vitals field expects numbers.\n" +
          "  • SURROUNDING WORDS (syntax & semantics) — 'fracture of the human rus' clearly means 'Humerus'. 'tab limit 600' near other antibiotics is likely 'Linezolid 600'. 'spinal an aesthesia' means 'Spinal Anaesthesia'.\n" +
          "  • CROSS-FIELD CONTEXT — match spellings of names/drugs already recorded elsewhere.\n" +
          "  • CLINICAL PLAUSIBILITY — pick the medically sensible interpretation. If a 'drug 1-0-1 for 7 days' it's an oral medication.\n\n" +
          "Behave like GPT-4: confidently correct obvious phonetic mistakes to the right medical term when context makes the intent clear, but do NOT hallucinate facts that were never said.\n\n" +
          "REFERENCE corrections (examples, NOT an exhaustive list — generalise the pattern):\n" +
          PRONUNCIATION_FIXES + "\n" +
          "DICTATION SHORTHAND:\n" +
          "- 'one zero one' → '1-0-1', 'zero one zero' → '0-1-0', 'one one one' → '1-1-1'\n" +
          "- 'BP 130 by 80' → '130/80 mmHg', 'percent' → '%', 'degree' → '°'\n" +
          "- 'Inj' → 'Inj.', 'Tab' → 'Tab.', 'Cap' → 'Cap.', 'Syr' → 'Syr.'\n\n" +
          "ABSOLUTE RULES:\n" +
          "1. PRESERVE EVERY FACT, number, name, and clause from the input. Zero deletions, zero summarising.\n" +
          "2. Correct mis-heard words to the intended medical term ONLY when phonetics + context make it clear. If genuinely ambiguous, keep the original word.\n" +
          "3. NEVER invent a diagnosis, drug, dose, or finding that the doctor did not say.\n" +
          "4. Do NOT reorder or restructure sentences.\n" +
          "5. Return ONLY the corrected text — no quotes, no labels, no explanation, no preamble.\n" +
          "6. If nothing needs fixing, return the input exactly as-is.",
      },
      // Few-shot: teach inference-from-context, not lookup
      {
        role: "user",
        content: "Field: Diagnosis\nField format: Primary clinical diagnosis.\n\nDoctor's dictation to correct:\nfracture of right human rus with dee see pee in situ",
      },
      { role: "assistant", content: "Fracture of right Humerus with DCP (Dynamic Compression Plate) in situ" },
      {
        role: "user",
        content: "Field: Treatment Given\nField format: In-hospital medication.\n\nDoctor's dictation to correct:\ninjection mona sef one gram I V one zero one and tram a doll fifty mg",
      },
      { role: "assistant", content: "Inj. Monocef 1gm IV 1-0-1 and Tramadol 50mg" },
      {
        role: "user",
        content: `Field: ${label}\n` +
          `Field format: ${fieldGuide}\n` +
          `${crossContext}\n\n` +
          `Doctor's dictation to correct:\n${rawText}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? rawText;
  const cleaned = raw.replace(/^["'""«»`]+|["'""«»`]+$/g, "").trim();

  // Safety net: if AI returned something drastically shorter than input
  // (i.e. it summarised), fall back to raw. Allow up to 20% shorter (for formatting).
  const inputWords  = rawText.trim().split(/\s+/).length;
  const outputWords = cleaned.split(/\s+/).length;
  if (outputWords < inputWords * 0.8) {
    return rawText;
  }

  return cleaned || rawText;
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

RULES:
- CAPTURE EVERY DETAIL. Do not skip, condense, or summarise anything the doctor said.
- Fix medical spelling using correct Indian hospital terminology: drug names (Inj. Monocef, Tab. Augmentin), diagnoses, procedures.
- Pronunciation fixes: "mona sef" → "Monocef", "tramadole" → "Tramadol", "one zero one" → "1-0-1", "BP 130 by 80" → "130/80 mmHg", "percent" → "%".
- payment_type: "Cash" or insurer name.
- DO NOT invent facts. Use "" for anything not mentioned.
- Medications: split each drug fully. "Inj Monocef 1gm IV one zero one" → {drug:"Inj. Monocef 1gm", dose:"1gm", route:"IV", frequency:"1-0-1"}.
- Dates: DD-Mon-YYYY (e.g. "03-Jun-2026").
- Narrative fields (history_of_present_illness, course_in_hospital, procedure_steps): full sentences, preserve every clinical detail, no shortening.
- Return ONLY valid JSON, no markdown fences, no explanation.`;

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
          "You are a medical transcription AI for an Indian multispeciality hospital. " +
          "Convert a doctor's free-form discharge dictation into structured JSON fields. " +
          "Use correct medical English spelling throughout. Apply Indian pronunciation corrections (e.g. 'mona sef' → 'Monocef'). " +
          FIELD_GUIDE,
      },
      {
        role: "user",
        content: `Doctor's dictation:\n"""\n${rawText}\n"""\n\nReturn the JSON now.`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  let parsed: Partial<DischargeSummary> = {};
  try { parsed = JSON.parse(content); } catch { parsed = {}; }
  return mergeSummary(parsed);
}
