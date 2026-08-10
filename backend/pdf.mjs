import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function addLine(page, text, x, y, font, size = 11) {
  page.drawText(text, { x, y, size, font, color: rgb(0.12, 0.18, 0.24) });
}

function fmtDateLong(v) {
  if (!v) return "—";
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" }).toUpperCase();
}

export async function generateSignedPdf({ envelopeId, data, signedAt, viewedAt, ip, userAgent }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: 742, width: 612, height: 50, color: rgb(0.05, 0.12, 0.24) });
  addLine(page, "Occu-Med Legacy Signed Pricing Agreement", 32, 760, bold, 16);
  addLine(page, `Envelope ID: ${envelopeId}`, 395, 760, regular, 9);

  let y = 712;
  const pair = (label, value) => {
    addLine(page, label.toUpperCase(), 32, y, bold, 9);
    addLine(page, value || "—", 32, y - 14, regular, 11);
    y -= 34;
  };

  pair("Network Management Analyst", data.analystName);
  pair("Director of Network Management", data.directorName);
  pair("Pricing Established", fmtDateLong(data.dateOfMemo));
  pair("Pricing Expires", fmtDateLong(data.dateOfPricingReceived));
  pair("Billing Terms", data.billingTerms);
  pair("Source of Pricing", data.sourceOfPricing);
  pair("Method of Communication", data.methodOfComm);
  pair("New or Existing Provider", data.newOrExistingProvider);
  pair("New or Updated Pricing", data.newOrUpdatedPricing);
  pair("Provider Specialty / Practice", data.providerSpecialty);
  pair("Facility Type", data.facilityType);

  const address = [
    data.address?.street1,
    data.address?.street2,
    [data.address?.city, data.address?.state, data.address?.zip].filter(Boolean).join(", "),
  ].filter(Boolean).join(" | ");
  pair("Provider Address", address);

  addLine(page, "SIGNATURES", 32, y, bold, 10);
  y -= 18;

  page.drawRectangle({ x: 32, y: y - 66, width: 260, height: 62, borderColor: rgb(0.72, 0.76, 0.82), borderWidth: 1 });
  page.drawRectangle({ x: 320, y: y - 66, width: 260, height: 62, borderColor: rgb(0.72, 0.76, 0.82), borderWidth: 1 });
  // Occu-Med fingerprint seal with the OM mark embedded in the center.
  for (let i = 0; i < 6; i++) {
    page.drawEllipse({
      x: 62,
      y: y - 34,
      xScale: 14 - i * 1.7,
      yScale: 18 - i * 2.1,
      borderColor: rgb(0.75, 0.84, 0.95),
      borderWidth: 0.7,
    });
  }
  page.drawRectangle({ x: 56, y: y - 39, width: 3, height: 12, color: rgb(0.05, 0.12, 0.24) });
  page.drawRectangle({ x: 61, y: y - 39, width: 3, height: 12, color: rgb(0.05, 0.12, 0.24) });
  page.drawRectangle({ x: 66, y: y - 39, width: 3, height: 12, color: rgb(0.05, 0.12, 0.24) });
  addLine(page, `Occu-Med: ${data.occuMedRepTitle} | ${data.occuMedRepName} | ${data.occuMedRepDate || signedAt.slice(0, 10)}`, 40, y - 20, regular, 9);
  addLine(page, `Clinic: ${data.clinicRepTitle} | ${data.clinicRepFullName} | ${data.clinicRepDate || signedAt.slice(0, 10)}`, 328, y - 20, regular, 9);
  y -= 84;

  addLine(page, "PRICING", 32, y, bold, 10);
  y -= 16;
  for (const row of (data.priceRows || []).filter((r) => r.component || r.price)) {
    if (y < 80) break;
    addLine(page, `${row.component || "—"}  ....  ${row.price || "—"}`, 36, y, regular, 10);
    y -= 14;
  }

  addLine(page, `Created: ${new Date().toISOString()}`, 32, 40, regular, 8);
  addLine(page, `Viewed: ${viewedAt || "—"}`, 200, 40, regular, 8);
  addLine(page, `Signed: ${signedAt}`, 360, 40, regular, 8);
  addLine(page, `IP: ${ip}`, 32, 26, regular, 8);
  addLine(page, `UA: ${userAgent.slice(0, 90)}`, 130, 26, regular, 8);

  const bytes = await pdfDoc.save();
  return new Uint8Array(bytes);
}

export async function generateCertificatePdf({ envelopeId, pdfHash, audit }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: 742, width: 612, height: 50, color: rgb(0.05, 0.12, 0.24) });
  addLine(page, "Certificate of Completion", 32, 760, bold, 18);

  let y = 710;
  const row = (k, v) => {
    addLine(page, k.toUpperCase(), 32, y, bold, 9);
    y -= 14;
    addLine(page, v || "—", 32, y, regular, 10);
    y -= 22;
  };

  row("Envelope ID", envelopeId);
  row("Final PDF SHA-256", pdfHash);
  row("Original Document SHA-256", audit.originalDocumentHash);
  row("Signature Type", audit.signatureType);
  row("Signature SHA-256", audit.signatureHash);
  row("Evidence SHA-256", audit.evidenceHash);
  if (audit.verificationUrl) row("Verify Certificate", audit.verificationUrl);
  row("Agreement Status", audit.reviewStatus);
  if (audit.approvedAt) row("Occu-Med Approved", audit.approvedAt);
  row("Created", audit.createdAt);
  row("Viewed", audit.viewedAt || "—");
  row("Signed", audit.signedAt);
  row("IP Address", audit.ipAddress);
  row("User Agent", audit.userAgent);
  row("Occu-Med Representative", audit.occuMedRepName);
  row("Clinic Representative", audit.clinicRepFullName);
  row("Agreement to Electronic Record", audit.agreedElectronic ? "Accepted" : "Not Accepted");

  addLine(page, "CONSENT STATEMENT", 32, y, bold, 9);
  y -= 15;
  const consent = audit.consentText || "Electronic records and signature consent captured at signing.";
  const words = consent.split(/\s+/);
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > 88) {
      addLine(page, line, 32, y, regular, 8);
      y -= 11;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) addLine(page, line, 32, y, regular, 8);

  const bytes = await pdfDoc.save();
  return new Uint8Array(bytes);
}
