async function renderElement(element: HTMLElement, options: Parameters<(typeof import("html2canvas"))["default"]>[1]) {
  const { default: html2canvas } = await import("html2canvas");
  return html2canvas(element, options);
}

export async function providerDocumentPdf(root: HTMLElement): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-pdf-page]"));
  if (!pages.length) throw new Error("The document preview is not ready.");

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  for (let index = 0; index < pages.length; index += 1) {
    const canvas = await renderElement(pages[index], {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: pages[index].scrollWidth,
      windowHeight: pages[index].scrollHeight,
    });
    if (index > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
  }

  return new Uint8Array(pdf.output("arraybuffer") as ArrayBuffer);
}

export async function screenFormPdf(root: HTMLElement): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const canvas = await renderElement(root, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: root.scrollWidth,
    windowHeight: root.scrollHeight,
    ignoreElements: (element) =>
      element.classList.contains("print-hide") ||
      element.classList.contains("pdf-exclude") ||
      Boolean(element.closest(".pdf-exclude")),
  });

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pagePixelHeight = Math.floor(canvas.width * (297 / 210));
  let sourceY = 0;
  let pageIndex = 0;

  while (sourceY < canvas.height) {
    const sliceHeight = Math.min(pagePixelHeight, canvas.height - sourceY);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = pagePixelHeight;
    const context = pageCanvas.getContext("2d");
    if (!context) throw new Error("Unable to render PDF page.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    context.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    );
    if (pageIndex > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
    sourceY += sliceHeight;
    pageIndex += 1;
  }

  return new Uint8Array(pdf.output("arraybuffer") as ArrayBuffer);
}

export function pdfBytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
