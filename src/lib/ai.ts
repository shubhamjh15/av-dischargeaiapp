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

// ─── Medical abbreviations ───────────────────────────────────────────────────
// Voice recognition spells abbreviations out as separate spaced letters
// ("CAD" → "C A D" or "CA D" or "see a dee"). Re-assemble them using context.
const ABBREVIATIONS = `
ABBREVIATIONS — voice recognition often splits letters apart or spells them phonetically.
Re-assemble spaced/spelled-out letters into the correct abbreviation when context fits:
- "C A D" / "CA D" / "see a dee" / "sad" (in a cardiac context) → "CAD" (Coronary Artery Disease)
- "C K D" / "see kay dee" → "CKD" (Chronic Kidney Disease)
- "C O P D" / "copd" → "COPD" (Chronic Obstructive Pulmonary Disease)
- "D M" / "dee em" / "diabetes" → "DM" (Diabetes Mellitus)
- "H T N" / "hypertension" → "HTN" (Hypertension)
- "T2 D M" / "type two dm" → "T2DM" (Type 2 Diabetes Mellitus)
- "M I" / "em eye" / "myocardial infarction" → "MI" (Myocardial Infarction)
- "C V A" / "see vee aye" / "stroke" → "CVA" (Cerebrovascular Accident)
- "U T I" / "you tee eye" → "UTI" (Urinary Tract Infection)
- "I H D" → "IHD" (Ischaemic Heart Disease)
- "L R T I" → "LRTI" (Lower Respiratory Tract Infection)
- "A K I" → "AKI" (Acute Kidney Injury)
- "B P H" → "BPH" (Benign Prostatic Hyperplasia)
- "G E R D" / "acidity" → "GERD"
- "D V T" → "DVT" (Deep Vein Thrombosis)
- "K/C/O" / "known case of" → "K/C/O"
- "C A D" should NEVER stay as "CA D" or "C A D" — always collapse to "CAD".
RULE: when you see isolated single capital letters separated by spaces that form a known
medical abbreviation, JOIN them. Expand to the full form in brackets the first time:
"CAD" → "CAD (Coronary Artery Disease)".
`;

// Short structured fields are REFORMATTED tightly (a date 5-word phrase becomes one
// clean date). They must be exempt from the "don't get shorter" anti-summary guard,
// which only applies to free-text narrative fields.
const STRUCTURED_FIELDS = new Set([
  "age", "sex", "ip_no", "date_of_admission", "date_of_discharge", "date_of_procedure",
  "bp", "hr", "spo2", "temp", "payment_type",
]);

const DATE_FIELDS = new Set(["date_of_admission", "date_of_discharge", "date_of_procedure"]);

export async function cleanField(
  rawText: string,
  fieldKey: string,
  label: string,
  currentSummary?: Partial<DischargeSummary>
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return rawText;

  const groq = new Groq({ apiKey });
  let fieldGuide = FIELD_CONTEXT[fieldKey] ?? `A field labelled "${label}" in a hospital discharge summary.`;

  // Extra-strict instruction for structured fields so the AI reformats instead of
  // leaving voice junk like "10th class 7 class 2026".
  if (DATE_FIELDS.has(fieldKey)) {
    fieldGuide += " CRITICAL: output ONE date only, formatted exactly DD-Mon-YYYY (e.g. '04-Jul-2026'). " +
      "Voice recognition mangles spoken dates ('4th of July 2026' may arrive as '10th class 7 class 2026' " +
      "or '4 June 4/7/2026'). Interpret the intended day, month and year and output the single clean date. " +
      "Ordinals: 1st→01, 2nd→02 ... Month numbers: 1→Jan, 7→Jul, 12→Dec. If the year is missing assume the current year. " +
      "Return ONLY the date, nothing else.";
  } else if (fieldKey === "age") {
    fieldGuide += " Output ONLY the age, like '47 years' or '6 months'. Strip any duplicated/garbled numbers.";
  } else if (fieldKey === "sex") {
    fieldGuide += " Output exactly 'Male' or 'Female'. Nothing else.";
  } else if (STRUCTURED_FIELDS.has(fieldKey)) {
    fieldGuide += " Output ONLY the single clean value in the specified format — no extra words.";
  }

  // Cross-field context — gives the AI the full picture of THIS patient so it reasons
  // about what value belongs in this field (e.g. age must be a number, not random words).
  let crossContext = "";
  if (currentSummary) {
    const parts: string[] = [];
    if (currentSummary.name)               parts.push(`Patient name: ${currentSummary.name}`);
    if (currentSummary.age)                parts.push(`Age: ${currentSummary.age}`);
    if (currentSummary.sex)                parts.push(`Sex: ${currentSummary.sex}`);
    if (currentSummary.diagnosis)          parts.push(`Diagnosis: ${currentSummary.diagnosis}`);
    if (currentSummary.chief_complaint)    parts.push(`Chief complaint: ${currentSummary.chief_complaint}`);
    if (currentSummary.date_of_admission)  parts.push(`Admitted: ${currentSummary.date_of_admission}`);
    if (currentSummary.admitting_consultant) parts.push(`Consultant: ${currentSummary.admitting_consultant}`);
    if (currentSummary.surgeon)            parts.push(`Surgeon: ${currentSummary.surgeon}`);
    if (currentSummary.treatment_given?.length) {
      const drugs = currentSummary.treatment_given.map(m => m.drug).filter(Boolean).join(", ");
      if (drugs) parts.push(`Drugs already recorded: ${drugs}`);
    }
    if (parts.length) crossContext = `\nThis patient's other recorded details (for context & consistent spelling):\n${parts.join("\n")}`;
  }

  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 1200,
    messages: [
      {
        role: "system",
        content:
          "You are a medical SPELL-CHECKER for an Indian hospital. A doctor dictated text via voice recognition. Your ONLY job: output the EXACT SAME text, word for word, with mis-heard/misspelled medical words swapped for the correct term.\n\n" +
          "THINK OF YOURSELF AS AUTOCORRECT, NOT A WRITER:\n" +
          "- You correct individual WORDS. You do NOT rewrite, rephrase, summarise, expand, or 'improve' sentences.\n" +
          "- Keep the doctor's exact words, exact order, exact length. Same number of facts in, same number out.\n" +
          "- The only changes allowed: (a) fix a mis-heard word to the medical term it sounds like, (b) fix spelling/capitalisation, (c) expand dictation shorthand like 'one zero one'→'1-0-1'.\n\n" +
          "HOW to pick the right word when one is mis-heard — use phonetics + context:\n" +
          "  • Does the garbled word SOUND LIKE a known medical term? 'mona sef'→Monocef, 'tram a doll'→Tramadol, 'human rus'→Humerus, 'see f tri axone'→Ceftriaxone.\n" +
          "  • Use the field and surrounding words to disambiguate. 'fracture of right human rus' → the word is clearly 'Humerus'.\n" +
          "  • If a word is NOT clearly a mis-heard medical term, LEAVE IT EXACTLY AS IS. Do not touch normal English words.\n\n" +
          "REFERENCE corrections (examples — generalise the phonetic pattern, this is not the full list):\n" +
          PRONUNCIATION_FIXES + "\n" +
          ABBREVIATIONS + "\n" +
          "DICTATION SHORTHAND:\n" +
          "- 'one zero one' → '1-0-1', 'zero one zero' → '0-1-0', 'one one one' → '1-1-1'\n" +
          "- 'BP 130 by 80' → '130/80 mmHg', 'percent' → '%', 'degree' → '°'\n" +
          "- 'Inj' → 'Inj.', 'Tab' → 'Tab.', 'Cap' → 'Cap.', 'Syr' → 'Syr.'\n\n" +
          "FORBIDDEN for free-text/narrative fields (Diagnosis, History, Complaint, Advice, etc.):\n" +
          "- DO NOT summarise or shorten. DO NOT add explanation or extra words.\n" +
          "- DO NOT rephrase into 'better' medical English. Keep the doctor's phrasing.\n" +
          "- DO NOT invent a diagnosis, drug, dose, or finding that wasn't said.\n" +
          "- DO NOT reorder. DO NOT change numbers.\n\n" +
          "EXCEPTION — short structured fields (Age, Sex, Dates, BP, HR, SpO2, Temp, IP No):\n" +
          "- These hold ONE clean value. Voice recognition often adds duplicate/garbled words.\n" +
          "- Extract the single correct value and DISCARD the junk. '47 years 999 99 years' → '47 years'.\n" +
          "- A Date field must output exactly one date as DD-Mon-YYYY. An Age field outputs only the age.\n\n" +
          "ALWAYS:\n" +
          "- Return ONLY the value — no quotes, no labels, no preamble.\n" +
          "- For narrative fields, if nothing is mis-heard, return the input unchanged.",
      },
      // Few-shot: correct ONLY the mis-heard words, keep everything else identical
      {
        role: "user",
        content: "Field: Diagnosis\nField format: Primary clinical diagnosis.\n\nDoctor's dictation to correct:\nfracture of right human rus with dee see pee in situ",
      },
      { role: "assistant", content: "Fracture of right Humerus with DCP in situ" },
      {
        role: "user",
        content: "Field: Chief Complaint\nField format: Presenting complaint.\n\nDoctor's dictation to correct:\npatient came with pain in the right leg since three days and difficulty in walking",
      },
      { role: "assistant", content: "Patient came with pain in the right leg since three days and difficulty in walking" },
      {
        role: "user",
        content: "Field: Treatment Given\nField format: In-hospital medication.\n\nDoctor's dictation to correct:\ninjection mona sef one gram I V one zero one and tram a doll fifty mg",
      },
      { role: "assistant", content: "Inj. Monocef 1gm IV 1-0-1 and Tramadol 50mg" },
      {
        role: "user",
        content: "Field: Past History\nField format: Past medical history.\n\nDoctor's dictation to correct:\nknown case of CA D and H T N since five years",
      },
      { role: "assistant", content: "Known case of CAD (Coronary Artery Disease) and HTN (Hypertension) since five years" },
      {
        role: "user",
        content: "Field: Date of Admission\nField format: output ONE date DD-Mon-YYYY.\n\nDoctor's dictation to correct:\n4 June 4/7/2026",
      },
      { role: "assistant", content: "04-Jul-2026" },
      {
        role: "user",
        content: "Field: Age\nField format: output ONLY the age.\n\nDoctor's dictation to correct:\n47 years 999 99 years",
      },
      { role: "assistant", content: "47 years" },
      {
        role: "user",
        content: `You are filling the "${label}" field of a discharge summary.\n` +
          `What belongs in this field: ${fieldGuide}\n` +
          `${crossContext}\n\n` +
          `The doctor dictated the following for the "${label}" field. Output the correct value for THIS field only — ` +
          `if voice recognition added words that don't belong in a "${label}" field, discard them:\n${rawText}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? rawText;
  const cleaned = raw.replace(/^["'""«»`]+|["'""«»`]+$/g, "").trim();

  if (!cleaned) return rawText;

  // Structured fields (dates, age, vitals) are SUPPOSED to shrink to one tight value —
  // skip the length guard for them, just sanity-check the AI didn't return an essay.
  if (STRUCTURED_FIELDS.has(fieldKey)) {
    // Reject only if the AI rambled (structured values are short by nature)
    if (cleaned.split(/\s+/).filter(Boolean).length > 8) return rawText;
    return cleaned;
  }

  // Narrative fields: a spell-checker output should be ROUGHLY the same length as input.
  // Reject summarising (much shorter) or padding/explaining (much longer) → keep raw words.
  const inputWords  = rawText.trim().split(/\s+/).filter(Boolean).length;
  const outputWords = cleaned.split(/\s+/).filter(Boolean).length;
  if (inputWords > 0 && (outputWords < inputWords * 0.6 || outputWords > inputWords * 1.6)) {
    return rawText;
  }

  return cleaned;
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
          "Re-assemble spaced/spelled-out abbreviations using context: 'C A D'/'CA D' → 'CAD (Coronary Artery Disease)', 'H T N' → 'HTN (Hypertension)', 'C K D' → 'CKD', 'D M' → 'DM', 'C O P D' → 'COPD'. " +
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
