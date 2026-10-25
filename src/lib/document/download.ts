// Browser only.
function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const downloadText = (filename: string, text: string): void => {
  save(new Blob([text], { type: 'text/plain' }), filename);
};

export const downloadPdf = (filename: string, bytes: Uint8Array): void => {
  save(new Blob([bytes as BlobPart], { type: 'application/pdf' }), filename);
};

/** Opens the PDF in a new tab; the object URL is released once the tab has had time to load it. */
export function openPdf(bytes: Uint8Array): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
}
