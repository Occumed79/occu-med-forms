export function downloadFile(bytes: Uint8Array | ArrayBuffer, filename: string, type = "application/octet-stream") {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const buffer = new ArrayBuffer(source.byteLength);
  new Uint8Array(buffer).set(source);
  const blob = new Blob([buffer], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadPdf(bytes: Uint8Array | ArrayBuffer, filename: string) {
  downloadFile(bytes, filename, "application/pdf");
}
