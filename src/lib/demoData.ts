import { DischargeSummary } from "./schema";

// A complete, realistic sample patient that fills EVERY field perfectly.
// Used by the one-tap "Demo Mode" so a presentation never depends on a live
// microphone, the AI service, or the network. Loads instantly, fully local.
export const DEMO_SUMMARY: DischargeSummary = {
  // Patient & admission
  name: "Sachin Kumar C S",
  ip_no: "2627/00267",
  age: "31 years",
  sex: "Male",
  address: "121, 1st Main, Kanaka Layout, Bandre Nagar, Bangalore - 560085",
  date_of_admission: "03-Jun-2026",
  date_of_discharge: "08-Jun-2026",
  payment_type: "Cash",
  admitting_consultant: "Dr. Sathish Babu, MS (Ortho)",

  // Discharge summary body
  diagnosis: "Refracture of right Humerus with DCP (Dynamic Compression Plate) in situ",
  chief_complaint:
    "Patient presented with pain and swelling of the right arm following a slip and self-fall at home on 01-Jun-2026.",
  history_of_present_illness:
    "Patient was apparently well until he had a slip and self-fall at home on 01-Jun-2026, following which he developed pain, swelling and deformity of the right arm with restriction of movement. There was no history of loss of consciousness, vomiting or seizures. He was brought to the hospital for further evaluation and management.",
  past_history:
    "Known case of fracture right Humerus operated 8 months ago with DCP fixation. No history of Diabetes Mellitus, Hypertension, Tuberculosis or Asthma.",
  investigations:
    "Hb: 13.8 g/dL, TLC: 9,200 cells/cumm, Platelets: 2.4 lakh/cumm, RBS: 104 mg/dL, Serum Creatinine: 0.9 mg/dL. X-ray right arm AP/Lateral: Refracture at previous fracture site with DCP in situ.",
  course_in_hospital:
    "Patient was admitted and evaluated. Pre-anaesthetic check-up was done and fitness obtained. He was taken up for surgery on 04-Jun-2026. Post-operative period was uneventful. He was managed with IV antibiotics, analgesics and limb elevation. Wound was healthy at the time of discharge. Patient was discharged in a hemodynamically stable condition with advice.",

  // Clinical examination
  bp: "130/80 mmHg",
  hr: "90 bpm",
  spo2: "98% on room air",
  temp: "Afebrile",
  cvs: "S1 S2 heard, no murmur",
  rs: "Bilateral air entry present, clear",
  pa: "Soft, non-tender, no organomegaly",

  // Operative note
  surgeon: "Dr. Sathish Babu, MS (Ortho)",
  anesthetist: "Dr. Ramesh Gowda, MD (Anaesthesia)",
  preop_diagnosis: "Refracture of right Humerus with DCP in situ",
  procedure_proposed: "Implant exit and re-fixation with new DCP, right Humerus",
  anesthesia_type: "General Anaesthesia",
  date_of_procedure: "04-Jun-2026",
  procedure_steps:
    "Under GA, with the patient in supine position, the right arm was painted and draped. Previous incision was reopened. Old DCP was exposed and removed. Fracture site was identified, freshened and reduced. New DCP was applied and fixed with cortical screws. Wound was washed and closed in layers. Sterile dressing was applied.",

  // Medications
  treatment_given: [
    { drug: "Inj. Monocef 1gm", dose: "1gm", route: "IV", frequency: "1-0-1" },
    { drug: "Inj. Amikacin 500mg", dose: "500mg", route: "IV", frequency: "1-0-1" },
    { drug: "Inj. Tramadol 50mg", dose: "50mg", route: "IV", frequency: "1-0-1" },
    { drug: "Inj. Pantoprazole 40mg", dose: "40mg", route: "IV", frequency: "1-0-0" },
  ],
  discharge_meds: [
    { drug: "Tab. Linezolid 600mg", dosage_pattern: "1-0-1", duration: "7 days" },
    { drug: "Tab. Zerodol SP", dosage_pattern: "1-0-1", duration: "7 days" },
    { drug: "Tab. Pantoprazole 40mg", dosage_pattern: "1-0-0", duration: "7 days" },
  ],

  // Advice
  general_advice:
    "1. Take medications as prescribed. 2. Keep the operated limb elevated. 3. Keep the wound clean and dry. 4. Suture removal on 12th post-operative day. 5. Do not lift heavy weights with the operated arm. 6. Report immediately if fever, increased pain, swelling or discharge from the wound.",
  review_note: "Review after 10 days with Dr. Sathish Babu in the Orthopaedics OPD.",
  doctors_signature: "Dr. Sathish Babu, MS (Ortho)",
};
