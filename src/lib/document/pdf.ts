// The PDF container. Visual layer: for people to read. Metadata: the signed token, for the verifier.
// The visual layer is never trusted: the verifier reads the token and shows only what it proves.
import {
  PDFDocument,
  PDFDict,
  PDFHexString,
  PDFName,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import { parsePayload, serializePayload, type DocPayload } from './payload';

const INFO_KEY = 'ConstanciaToken';
const ATTACHMENT_NAME = 'constancia-token.json';
const PAGE = { width: 595, height: 842 } as const;
const MARGIN = 48;
const INK = rgb(0.04, 0.04, 0.04);
const MUTED = rgb(0.3, 0.3, 0.3);
const MARIGOLD = rgb(0.949, 0.718, 0.02);
const RULE = rgb(0.83, 0.83, 0.83);

export interface SheetRow {
  label: string;
  /** null = the holder chose not to show it: drawn as a black bar. */
  value: string | null;
}

export interface Sheet {
  kicker: string;
  title: string;
  subject?: string;
  issuer?: { name: string; did: string };
  rows: SheetRow[];
  notes: string[];
  footer: string[];
}

export interface HistoryEntry {
  employer: string;
  jobTitle?: string;
  period: string;
  extras?: string[];
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  mono: PDFFont;
}

const supported = new WeakMap<PDFFont, Set<number>>();

/** Standard fonts only cover WinAnsi: anything else becomes "?" instead of making the whole PDF fail. */
function safe(font: PDFFont, text: string): string {
  let set = supported.get(font);
  if (!set) {
    set = new Set(font.getCharacterSet());
    supported.set(font, set);
  }
  const known = set;
  return [...text.replace(/\s+/g, ' ')]
    .map((char) => (known.has(char.codePointAt(0) ?? 0) ? char : '?'))
    .join('');
}

function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of safe(font, text).split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function start(): Promise<{ doc: PDFDocument; page: PDFPage; fonts: Fonts }> {
  const doc = await PDFDocument.create();
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.Courier),
  };
  return { doc, page: doc.addPage([PAGE.width, PAGE.height]), fonts };
}

function header(page: PDFPage, fonts: Fonts, kicker: string, title: string): number {
  page.drawRectangle({
    x: 0,
    y: PAGE.height - 120,
    width: PAGE.width,
    height: 120,
    color: MARIGOLD,
  });
  page.drawText('CONSTANCIA', {
    x: MARGIN,
    y: PAGE.height - 42,
    size: 11,
    font: fonts.bold,
    color: INK,
  });
  page.drawText(safe(fonts.regular, kicker), {
    x: MARGIN,
    y: PAGE.height - 58,
    size: 9,
    font: fonts.regular,
    color: INK,
  });
  page.drawText(safe(fonts.bold, title), {
    x: MARGIN,
    y: PAGE.height - 98,
    size: 24,
    font: fonts.bold,
    color: INK,
  });
  page.drawRectangle({ x: 0, y: PAGE.height - 124, width: PAGE.width, height: 4, color: INK });
  return PAGE.height - 160;
}

function paragraph(
  page: PDFPage,
  font: PDFFont,
  text: string,
  at: { y: number; size: number; color?: ReturnType<typeof rgb>; x?: number; width?: number },
): number {
  const x = at.x ?? MARGIN;
  const lineHeight = at.size * 1.4;
  let { y } = at;
  for (const line of wrap(font, text, at.size, at.width ?? PAGE.width - 2 * MARGIN)) {
    page.drawText(line, { x, y, size: at.size, font, color: at.color ?? INK });
    y -= lineHeight;
  }
  return y;
}

function footer(page: PDFPage, fonts: Fonts, lines: string[]): void {
  page.drawRectangle({ x: MARGIN, y: 150, width: PAGE.width - 2 * MARGIN, height: 2, color: INK });
  let y = 134;
  for (const line of lines)
    y = paragraph(page, fonts.mono, line, { y, size: 7.5, color: MUTED }) - 2;
  paragraph(
    page,
    fonts.regular,
    'Esta página es solo la capa visual. La prueba está en el token firmado que lleva el archivo: cárgalo en /verify para comprobarlo. Si el texto de esta página y el token no coinciden, vale el token.',
    { y: 78, size: 8, color: MUTED },
  );
}

// pdf-lib keeps getInfoDict private; the trailer's Info entry is the same dictionary.
const infoDict = (doc: PDFDocument): PDFDict =>
  doc.context.lookup(doc.context.trailerInfo.Info, PDFDict);

async function finish(doc: PDFDocument, payload: DocPayload): Promise<Uint8Array> {
  const json = serializePayload(payload);
  doc.setTitle('Constancia'); // creates the Info dictionary
  infoDict(doc).set(PDFName.of(INFO_KEY), PDFHexString.fromText(json));
  await doc.attach(new TextEncoder().encode(json), ATTACHMENT_NAME, {
    mimeType: 'application/json',
    description: 'Token firmado de la constancia',
  });
  doc.setProducer('Constancia');
  return doc.save({ useObjectStreams: false });
}

export async function buildSheetPdf(sheet: Sheet, payload: DocPayload): Promise<Uint8Array> {
  const { doc, page, fonts } = await start();
  let y = header(page, fonts, sheet.kicker, sheet.title);

  if (sheet.issuer) {
    page.drawText('Emitida por', { x: MARGIN, y, size: 9, font: fonts.bold, color: MUTED });
    y = paragraph(page, fonts.bold, sheet.issuer.name, { y: y - 16, size: 15 });
    y = paragraph(page, fonts.mono, sheet.issuer.did, { y: y - 2, size: 7, color: MUTED }) - 14;
  }
  if (sheet.subject) {
    page.drawText('A favor de', { x: MARGIN, y, size: 9, font: fonts.bold, color: MUTED });
    y = paragraph(page, fonts.bold, sheet.subject, { y: y - 20, size: 20 }) - 12;
  }

  const valueX = 230;
  for (const row of sheet.rows) {
    page.drawRectangle({
      x: MARGIN,
      y: y + 15,
      width: PAGE.width - 2 * MARGIN,
      height: 1,
      color: RULE,
    });
    page.drawText(safe(fonts.regular, row.label), {
      x: MARGIN,
      y,
      size: 10,
      font: fonts.regular,
      color: MUTED,
    });
    if (row.value === null) {
      page.drawRectangle({ x: valueX, y: y - 3, width: 150, height: 15, color: INK });
      page.drawText('OCULTO', {
        x: valueX + 6,
        y: y + 1,
        size: 8,
        font: fonts.bold,
        color: rgb(1, 1, 1),
      });
      y -= 24;
    } else {
      const bottom = paragraph(page, fonts.bold, row.value, {
        y,
        size: 11,
        x: valueX,
        width: PAGE.width - MARGIN - valueX,
      });
      y = Math.min(y - 24, bottom - 8);
    }
  }
  y -= 8;
  for (const note of sheet.notes)
    y = paragraph(page, fonts.regular, note, { y, size: 9.5, color: MUTED }) - 4;

  footer(page, fonts, sheet.footer);
  return finish(doc, payload);
}

export async function buildHistoryPdf(
  history: { subject: string; entries: HistoryEntry[]; footer: string[]; notes: string[] },
  payload: DocPayload,
): Promise<Uint8Array> {
  const { doc, page, fonts } = await start();
  let y = header(
    page,
    fonts,
    'Todas selladas juntas, firmadas por cada empleador',
    'Historial laboral',
  );
  page.drawText('A favor de', { x: MARGIN, y, size: 9, font: fonts.bold, color: MUTED });
  y = paragraph(page, fonts.bold, history.subject, { y: y - 20, size: 20 }) - 14;

  for (const [index, entry] of history.entries.entries()) {
    page.drawRectangle({
      x: MARGIN,
      y: y + 36,
      width: PAGE.width - 2 * MARGIN,
      height: 1,
      color: RULE,
    });
    page.drawText(String(index + 1).padStart(2, '0'), {
      x: MARGIN,
      y: y + 6,
      size: 14,
      font: fonts.mono,
      color: MUTED,
    });
    page.drawText(safe(fonts.bold, entry.employer), {
      x: MARGIN + 36,
      y: y + 20,
      size: 12,
      font: fonts.bold,
      color: INK,
    });
    const detail = [entry.jobTitle, entry.period, ...(entry.extras ?? [])]
      .filter(Boolean)
      .join('  ·  ');
    page.drawText(safe(fonts.regular, detail), {
      x: MARGIN + 36,
      y: y + 4,
      size: 9.5,
      font: fonts.regular,
      color: MUTED,
    });
    y -= 46;
  }
  y -= 4;
  for (const note of history.notes)
    y = paragraph(page, fonts.regular, note, { y, size: 9.5, color: MUTED }) - 4;

  footer(page, fonts, history.footer);
  return finish(doc, payload);
}

/** The token a Constancia PDF carries, or null when the bytes are not one. */
export async function readPdfPayload(bytes: Uint8Array): Promise<DocPayload | null> {
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    const value = infoDict(doc).get(PDFName.of(INFO_KEY));
    if (!(value instanceof PDFHexString)) return null;
    return parsePayload(value.decodeText());
  } catch {
    return null;
  }
}

export const isPdf = (bytes: Uint8Array): boolean =>
  bytes.length > 4 && String.fromCharCode(...bytes.subarray(0, 5)) === '%PDF-';
