import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { DischargeSummary, HOSPITAL } from "./schema";

// ─── constants ────────────────────────────────────────────────────────────────
const MARGIN = 15;          // left / right page margin (mm)
const BODY_FS = 9;          // body font size (pt)
const LABEL_FS = 9.5;       // section label font size (pt)
const LINE_H = 5;           // line height for BODY_FS (mm)
const SECTION_GAP = 4;      // vertical gap between sections (mm)
const FOOTER_H = 20;        // reserved height at bottom for footer (mm)

const NAVY: [number, number, number] = [26, 67, 179];
const INK: [number, number, number]  = [17, 24, 39];
const GRAY: [number, number, number] = [100, 110, 120];
const TBL_HEAD: [number, number, number] = [45, 85, 175]; // softer navy for table headers

export function generatePdf(s: DischargeSummary): jsPDF {
  const doc  = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();   // 210
  const pageH = doc.internal.pageSize.getHeight();  // 297
  const W     = pageW - MARGIN * 2;                 // usable width ~180

  // ── header (returns y after the rule line) ──────────────────────────────
  function drawHeader(): number {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...NAVY);
    doc.text(HOSPITAL.name, pageW / 2, 15, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    const addrLines = doc.splitTextToSize(HOSPITAL.address, W);
    doc.text(addrLines, pageW / 2, 21, { align: "center" });
    const afterAddr = 21 + addrLines.length * 3.5;
    doc.text(HOSPITAL.contacts, pageW / 2, afterAddr, { align: "center" });

    const ruleY = afterAddr + 4;
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, ruleY, pageW - MARGIN, ruleY);
    return ruleY + 5;
  }

  // ── footer ──────────────────────────────────────────────────────────────
  function drawFooter() {
    const y = pageH - 14;
    doc.setDrawColor(180, 190, 200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, pageW - MARGIN, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...NAVY);
    doc.text(HOSPITAL.emergency, pageW / 2, y + 5, { align: "center" });
  }

  // ── section block: bold underlined label, then value below on full width ─
  function section(label: string, value: string, y: number): number {
    const text = (value || "").trim() || "—";
    const lines = doc.splitTextToSize(text, W);
    const blockH = LABEL_FS / 2.83 + LINE_H + lines.length * LINE_H + SECTION_GAP;

    // page-break guard
    if (y + blockH > pageH - FOOTER_H) {
      doc.addPage();
      drawFooter();
      y = drawHeader();
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(LABEL_FS);
    doc.setTextColor(...INK);
    doc.text(`${label}:`, MARGIN, y);
    // underline just the label text
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, y + 1, MARGIN + doc.getTextWidth(`${label}:`), y + 1);

    // value
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BODY_FS);
    doc.setTextColor(...INK);
    doc.text(lines, MARGIN, y + LINE_H + 1);

    return y + LINE_H + 1 + lines.length * LINE_H + SECTION_GAP;
  }

  // ── centered page title ─────────────────────────────────────────────────
  function pageTitle(title: string, y: number): number {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(title, pageW / 2, y, { align: "center" });
    return y + 7;
  }

  // ── autoTable wrapper with page-break guard ──────────────────────────────
  function table(
    head: string[][],
    body: string[][],
    colWidths: number[],
    y: number
  ): number {
    // Rough height estimate: header row ~8mm + each body row ~7mm
    const est = 8 + body.length * 7;
    if (y + est > pageH - FOOTER_H - 10) {
      doc.addPage();
      drawFooter();
      y = drawHeader();
    }
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      theme: "grid",
      headStyles: {
        fillColor: TBL_HEAD,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: INK,
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      columnStyles: Object.fromEntries(colWidths.map((w, i) => [i, { cellWidth: w }])),
      head,
      body,
    });
    // @ts-expect-error plugin field
    return (doc.lastAutoTable.finalY as number) + SECTION_GAP;
  }

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ════════════════════════════════════════════════════════════════════════
  let y = drawHeader();

  // Patient info grid
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      textColor: INK,
      lineColor: [170, 180, 195],
      lineWidth: 0.25,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: W * 0.26 },
      1: { cellWidth: W * 0.24 },
      2: { fontStyle: "bold", cellWidth: W * 0.26 },
      3: { cellWidth: W * 0.24 },
    },
    body: [
      ["Name",               s.name || "—",               "IP No",             s.ip_no || "—"],
      ["Age",                s.age || "—",                "Date of Admission",  s.date_of_admission || "—"],
      ["Sex",                s.sex || "—",                "Date of Discharge",  s.date_of_discharge || "—"],
      ["Address",            s.address || "—",            "Insurance / Cash",   s.payment_type || "—"],
      ["Admitting Consultant",
        { content: s.admitting_consultant || "—", colSpan: 3 } as unknown as string,
        "", ""],
    ],
  });
  // @ts-expect-error plugin field
  y = (doc.lastAutoTable.finalY as number) + 5;

  y = pageTitle("DISCHARGE SUMMARY", y);

  y = section("DIAGNOSIS", s.diagnosis, y);
  y = section("CHIEF COMPLAINT", s.chief_complaint, y);
  y = section("HISTORY OF PRESENT ILLNESS", s.history_of_present_illness, y);
  y = section("PAST HISTORY", s.past_history, y);

  // Clinical exam — two neat rows
  const vitals = [
    s.bp   && `BP: ${s.bp}`,
    s.hr   && `HR: ${s.hr}`,
    s.spo2 && `SpO2: ${s.spo2}`,
    s.temp && `Temp: ${s.temp}`,
  ].filter(Boolean).join("        ");
  const systems = [
    s.cvs && `CVS: ${s.cvs}`,
    s.rs  && `RS: ${s.rs}`,
    s.pa  && `P/A: ${s.pa}`,
  ].filter(Boolean).join("        ");
  y = section("CLINICAL EXAMINATION", [vitals, systems].filter(Boolean).join("\n"), y);

  y = section("INVESTIGATIONS", s.investigations, y);
  y = section("COURSE IN THE HOSPITAL", s.course_in_hospital, y);

  drawFooter();

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 2
  // ════════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = drawHeader();

  const hasOp = s.surgeon || s.preop_diagnosis || s.procedure_proposed || s.procedure_steps;
  if (hasOp) {
    y = pageTitle("OPERATIVE NOTE", y);
    y = section("Surgeon", s.surgeon, y);
    y = section("Anaesthetist", s.anesthetist, y);
    y = section("Preoperative Diagnosis", s.preop_diagnosis, y);
    y = section("Procedure Proposed", s.procedure_proposed, y);
    y = section("Type of Anaesthesia", s.anesthesia_type, y);
    y = section("Date of Procedure", s.date_of_procedure, y);
    y = section("Procedure", s.procedure_steps, y);
    y += 2;
  }

  if (s.treatment_given.length) {
    // section-style label before table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(LABEL_FS);
    doc.setTextColor(...INK);
    doc.text("TREATMENT GIVEN:", MARGIN, y);
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, y + 1, MARGIN + doc.getTextWidth("TREATMENT GIVEN:"), y + 1);
    y += LINE_H;

    // column widths: Drug gets most space
    y = table(
      [["Drug", "Dose", "Route", "Frequency"]],
      s.treatment_given.map((m) => [m.drug, m.dose, m.route, m.frequency]),
      [W * 0.46, W * 0.16, W * 0.14, W * 0.24],
      y
    );
    y += 2;
  }

  if (s.discharge_meds.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(LABEL_FS);
    doc.setTextColor(...INK);
    doc.text("ADVICE ON DISCHARGE:", MARGIN, y);
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, y + 1, MARGIN + doc.getTextWidth("ADVICE ON DISCHARGE:"), y + 1);
    y += LINE_H;

    y = table(
      [["Drug", "Dosage", "Duration"]],
      s.discharge_meds.map((m) => [m.drug, m.dosage_pattern, m.duration]),
      [W * 0.55, W * 0.2, W * 0.25],
      y
    );
    y += 2;
  }

  if (s.general_advice) y = section("Advice", s.general_advice, y);
  if (s.review_note)    y = section("Review", s.review_note, y);

  // Signature — guard against footer overlap
  if (y + 14 > pageH - FOOTER_H) {
    doc.addPage();
    drawFooter();
    y = drawHeader();
  }
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text("Doctor's Signature:", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.text(`  ${s.doctors_signature || ""}`, MARGIN + doc.getTextWidth("Doctor's Signature:"), y);
  // signature underline
  doc.setDrawColor(INK[0], INK[1], INK[2]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + doc.getTextWidth("Doctor's Signature:  "), y + 0.8, MARGIN + W * 0.55, y + 0.8);

  drawFooter();

  return doc;
}

export function downloadPdf(s: DischargeSummary) {
  const doc  = generatePdf(s);
  const safe = (s.name || "discharge").replace(/[^a-z0-9]+/gi, "_");
  doc.save(`${safe}_discharge_summary.pdf`);
}
