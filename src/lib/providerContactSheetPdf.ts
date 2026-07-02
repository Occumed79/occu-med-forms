import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";
import logo from "@/assets/occu-med-logo.png";

export type ContactSheetField = { label: string; value: string };

async function loadLogoDataUrl(): Promise<string> {
  const res = await fetch(logo);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

const findField = (fields: ContactSheetField[], label: string) =>
  fields.find((field) => field.label === label)?.value || "";

const contactLabel = (role: string) => `${role} - Name | Title | Telephone | Email`;

export async function generateProviderContactSheetPdf(
  title: string,
  fields: ContactSheetField[],
): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logoData = await loadLogoDataUrl();

  try {
    doc.addImage(logoData, "PNG", 34, 18, 34, 20);
  } catch {}

  doc.setTextColor(0, 0, 0);
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text(title, pageW / 2, 38, { align: "center" });

  const drawLineField = (
    label: string,
    value: string,
    y: number,
    lineX = 67,
    lineW = 112,
    labelX = 36,
    valueX = lineX + 10,
  ) => {
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text(`${label}:`, labelX, y);
    doc.setDrawColor(90, 90, 90);
    doc.setLineWidth(0.25);
    doc.line(lineX, y + 1.2, lineX + lineW, y + 1.2);
    doc.text(value || "", valueX, y, { maxWidth: lineW - 12 });
  };

  let y = 52;
  drawLineField("Clinic Name", findField(fields, "Clinic Name"), y);
  y += 8;
  drawLineField("Address", findField(fields, "Address"), y, 56, 123, 36, 76);
  y += 8;
  drawLineField("City, State Zip", findField(fields, "City, State Zip"), y, 64, 115, 36, 76);
  y += 8;

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("Telephone:", 36, y);
  doc.line(55, y + 1.2, 105, y + 1.2);
  doc.text(findField(fields, "Telephone"), 70, y);
  doc.text("Fax:", 124, y);
  doc.line(135, y + 1.2, 179, y + 1.2);
  doc.text(findField(fields, "Fax"), 147, y);

  y += 10;
  doc.text("Hours of Operation:", 36, y);
  y += 9;
  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].forEach((day) => {
    drawLineField(day, findField(fields, day), y, 55, 124, 36, 76);
    y += 6.8;
  });

  y += 7;
  doc.text("The following are pertinent points of contact:", 36, y);
  y += 10;

  [
    "Schedule Contact",
    "Exam Results",
    "Billing",
    "Manager / Supervisor",
    "Corporate",
  ].forEach((role) => {
    const longLabel = role === "Schedule Contact"
      ? "Schedule Contact - Name | Title | Telephone | Email | Preferred Method"
      : contactLabel(role);
    const value = findField(fields, longLabel);

    doc.setFont("times", "bold");
    doc.setFontSize(10.5);
    doc.text(role, 36, y);
    y += 6.8;

    doc.setFont("times", "normal");
    doc.setFontSize(8.2);
    doc.text(role === "Schedule Contact" ? "Name | Title | Telephone | Email | Preferred Method:" : "Name | Title | Telephone | Email:", 36, y);
    doc.line(100, y + 1.1, 179, y + 1.1);
    doc.text(value || "", 102, y, { maxWidth: 76 });
    y += 12;
  });

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("Page 1 of 1", pageW - 34, pageH - 14);

  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
}

export async function appendPdfPages(
  basePdfBytes: Uint8Array,
  additionalPdfBytes: Uint8Array[],
): Promise<Uint8Array> {
  if (!additionalPdfBytes.length) return basePdfBytes;

  const pdfDoc = await PDFDocument.load(basePdfBytes);
  for (const bytes of additionalPdfBytes) {
    const source = await PDFDocument.load(bytes);
    const copiedPages = await pdfDoc.copyPages(source, source.getPageIndices());
    copiedPages.forEach((page) => pdfDoc.addPage(page));
  }

  return pdfDoc.save();
}
