import Groq from "groq-sdk";
import { DischargeSummary, mergeSummary } from "./schema";

// Free, fast field extraction via Groq (OpenAI-compatible).
// Takes the doctor's free-form dictation/notes and returns the structured
// discharge summary fields. Output is always treated as a draft the operator edits.

const MODEL = "llama-3.3-70b-versatile";

// Per-field clean-up. Used by the mic on every field: doctor speaks naturally,
// this fixes medical spelling, capitalization, punctuation and dictation noise,
// and returns ONLY the corrected text for that one field. It must not invent,
// summarize, or add clinical facts — only tidy what was actually said.
export async function cleanField(rawText: string, label: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return rawText; // no key -> return as-is, never block the doctor
  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content:
          "You are a medical transcription corrector for a hospital discharge summary. " +
          "You are given the raw text a doctor typed or dictated for ONE field. " +
          "Return a cleaned version of that text and NOTHING ELSE (no quotes, no labels, no explanation). " +
          "Rules:\n" +
          "- Fix spelling of drugs, diagnoses and medical terms (e.g. 'monosef'->'Monocef', 'humorus'->'humerus').\n" +
          "- Fix capitalization, punctuation and spacing. Expand obvious dictation: 'one zero one'->'1-0-1'.\n" +
          "- Keep it concise and clinical. Do NOT add facts, do NOT invent values, do NOT summarize away detail.\n" +
          "- If the text is already fine, return it unchanged.\n" +
          "- Never refuse; if unsure, return the input text corrected only for obvious errors.",
      },
      {
        role: "user",
        content: `Field: ${label}\nRaw text: ${rawText}`,
      },
    ],
  });

  const out = completion.choices[0]?.message?.content?.trim() ?? rawText;
  // strip wrapping quotes a model sometimes adds
  return out.replace(/^["'""]+|["'""]+$/g, "").trim() || rawText;
}

const FIELD_GUIDE = `Return a JSON object with EXACTLY these keys (use "" when not mentioned):
name, ip_no, age, sex, address, date_of_admission, date_of_discharge, payment_type, admitting_consultant,
diagnosis, chief_complaint, history_of_present_illness, past_history, investigations, course_in_hospital,
bp, hr, spo2, temp, cvs, rs, pa,
surgeon, anesthetist, preop_diagnosis, procedure_proposed, anesthesia_type, date_of_procedure, procedure_steps,
general_advice, review_note, doctors_signature,
treatment_given (array of objects: {drug, dose, route, frequency}),
discharge_meds (array of objects: {drug, dosage_pattern, duration}).

Rules:
- This is a hospital discharge summary. Preserve medical terms, drug names, dosages exactly as dictated.
- "1-0-1" style frequency means morning-afternoon-night; keep that format.
- payment_type is "Cash" or "Insurance".
- Do NOT invent facts. If something was not said, leave it as "".
- For medications, split each into its parts. Example dictation "Inj Monocef 1gm IV one zero one"
  -> {drug:"Inj. Monocef 1gm", dose:"1gm", route:"IV", frequency:"1-0-1"}.
- Return ONLY the JSON object, nothing else.`;

export async function extractSummary(rawText: string): Promise<DischargeSummary> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY missing.");
  }
  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You convert a doctor's free-form discharge dictation into structured JSON fields for a hospital discharge summary. " +
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
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }
  return mergeSummary(parsed);
}
