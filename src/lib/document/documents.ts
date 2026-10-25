// The three documents of the product, as PDFs: a credential, a presentation, a unified history.
import { decodePresentation, REVEAL_TEMPLATES } from '../credential/present';
import type { IssuedCredential } from '../credential/sdjwt';
import type { DisclosedClaims, P256PrivateJwk } from '../credential/types';
import { CLAIM_LABELS, formatClaim } from '../vault/claims';
import { buildHistoryPdf, buildLetterPdf, buildSheetPdf, type HistoryEntry, type SheetRow } from './pdf';

export const subjectOf = (claims: DisclosedClaims): string | undefined => {
  const name = [claims.givenName, claims.familyName].filter(Boolean).join(' ');
  return name || undefined;
};

export function periodOf(claims: DisclosedClaims): string {
  if (claims.startDate === undefined) return 'Fechas ocultas';
  const end = claims.endDate ?? (claims.employedNow ? 'actualidad' : '—');
  return `${claims.startDate} → ${end}`;
}

/** Every claim the credential holds, in the fixed order of the form. */
function rowsOf(claims: DisclosedClaims, hidden: 'bar' | 'omit'): SheetRow[] {
  const rows: SheetRow[] = [];
  for (const name of REVEAL_TEMPLATES.full) {
    if (name === 'givenName' || name === 'familyName') continue; // they head the page as the subject
    const value = claims[name];
    if (value !== undefined) rows.push({ label: CLAIM_LABELS[name], value: formatClaim(value) });
    else if (hidden === 'bar') rows.push({ label: CLAIM_LABELS[name], value: null });
  }
  return rows;
}

const MODALITY: Record<string, string> = {
  FULL_TIME: 'a tiempo completo',
  PART_TIME: 'a medio tiempo',
  CONTRACT: 'por contrato',
};

const longDate = (iso: string | Date): string =>
  new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const countryName = (code: string): string =>
  new Intl.DisplayNames(['es'], { type: 'region' }).of(code) ?? code;

/** The letter's prose, from the claims. Present tense while the person is still employed. */
function letterText(claims: DisclosedClaims, issuerName: string, issuedOn: string) {
  const current = claims.employedNow === true;
  const start = longDate(String(claims.startDate));
  const period = claims.endDate === undefined ? `desde el ${start} y a la fecha continúa en funciones` : `desde el ${start} hasta el ${longDate(String(claims.endDate))}`;
  const department = claims.department === undefined ? '' : `, adscrito al departamento de ${String(claims.department)}`;
  const salary =
    claims.salaryMonthlyUsd === undefined
      ? ''
      : ` Su remuneración mensual ${current ? 'es' : 'fue'} de USD ${String(claims.salaryMonthlyUsd)}.`;
  return {
    intro: `Por medio de la presente, ${issuerName} hace constar que:`,
    paragraphs: [
      `${current ? 'Presta' : 'Prestó'} servicios en esta organización ${period}. En ese tiempo ${current ? 'se desempeña' : 'se desempeñó'} en el cargo de ${String(claims.jobTitle)}${department}, ${MODALITY[String(claims.employmentType)] ?? ''}, con sede de trabajo en ${countryName(String(claims.workCountry))}.${salary}`,
      `Se expide la presente constancia a solicitud de la parte interesada, el ${issuedOn}. Su autenticidad se comprueba en línea cargando este archivo en la página de verificación de Constancia: la emisión quedó registrada en el consorcio de acreditación.`,
    ],
  };
}

export function credentialPdf(args: {
  credential: IssuedCredential;
  holderKey: P256PrivateJwk;
  issuerName: string;
  verifyUrl: string;
}): Promise<Uint8Array> {
  const { credential, holderKey, issuerName, verifyUrl } = args;
  const { claims } = credential;
  const issuedOn = longDate(new Date());
  const text = letterText(claims, issuerName, issuedOn);
  return buildLetterPdf(
    {
      issuer: { name: issuerName, did: credential.did },
      reference: credential.credentialHash.slice(2, 12),
      issuedOn,
      title: 'Constancia de trabajo',
      intro: text.intro,
      subject: {
        name: subjectOf(claims) ?? 'Titular',
        detail: `Cédula de identidad ${String(claims.nationalId)}`,
      },
      paragraphs: text.paragraphs,
      facts: [
        { label: 'Cargo', value: String(claims.jobTitle) },
        { label: 'Ingreso', value: longDate(String(claims.startDate)) },
        { label: 'Egreso', value: claims.endDate === undefined ? 'En funciones' : longDate(String(claims.endDate)) },
        { label: 'Modalidad', value: formatClaim(claims.employmentType) },
      ],
      signer: { name: issuerName, detail: `Clave ES256 ${credential.keyId.slice(0, 10)}…${credential.keyId.slice(-4)}` },
      seal: ['Verificable', 'en línea', 'Cargue este PDF en', 'la página Verificar'],
      verifyUrl,
      footer: [
        `huella  ${credential.credentialHash}`,
        `clave   ${credential.keyId}`,
        `vence   ${credential.validUntil ?? 'no vence'}`,
      ],
    },
    { type: 'credential', sdJwt: credential.sdJwt, holderKey },
  );
}

export function presentationPdf(args: { presentation: string; aud: string; verifyUrl: string }): Promise<Uint8Array> {
  const decoded = decodePresentation(args.presentation);
  const { claims, hiddenCount, payload, keyBinding } = decoded;
  const shown = Object.keys(claims).length;
  const exp = keyBinding?.payload.exp;
  const issuer = typeof payload.issuer === 'string' ? payload.issuer : '';
  const rows = rowsOf(claims, 'omit');
  for (let i = 0; i < hiddenCount; i++) rows.push({ label: 'No se muestra', value: null });
  return buildSheetPdf(
    {
      kicker: 'Presentación con divulgación selectiva',
      title: 'Datos compartidos',
      subject: subjectOf(claims),
      issuer: { name: 'Emitida y firmada por el empleador', did: issuer },
      rows,
      notes: [
        `Se muestran ${shown} ${shown === 1 ? 'dato' : 'datos'} y ${hiddenCount} ${hiddenCount === 1 ? 'queda oculto' : 'quedan ocultos'}. Los ocultos no están en el archivo, ni siquiera cifrados: quien lo reciba no puede recuperarlos.`,
        `Presentada para: ${args.aud}. ${typeof exp === 'number' ? `Vence el ${new Date(exp * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC.` : ''}`,
      ],
      footer: [`sd_hash  ${decoded.sdHash}`, `emisor   ${issuer}`],
      verifyUrl: args.verifyUrl,
    },
    { type: 'presentation', presentation: args.presentation },
  );
}

export function historyPdf(args: {
  cv: string;
  subject: string;
  entries: { employer: string; claims: DisclosedClaims }[];
  aud: string;
  verifyUrl: string;
}): Promise<Uint8Array> {
  const entries: HistoryEntry[] = args.entries.map(({ employer, claims }) => ({
    employer,
    jobTitle: typeof claims.jobTitle === 'string' ? claims.jobTitle : undefined,
    period: periodOf(claims),
    extras: [claims.salaryBand !== undefined ? `USD ${claims.salaryBand}/mes` : undefined].filter(
      (extra) => extra !== undefined,
    ),
  }));
  const count = entries.length;
  return buildHistoryPdf(
    {
      subject: args.subject,
      entries,
      notes: [
        `${count} ${count === 1 ? 'constancia' : 'constancias'} de la misma persona, cada una firmada por su empleador y selladas juntas: nadie puede agregar ni quitar una después. Presentado para: ${args.aud}.`,
      ],
      footer: [],
      verifyUrl: args.verifyUrl,
    },
    { type: 'cv', cv: args.cv },
  );
}
