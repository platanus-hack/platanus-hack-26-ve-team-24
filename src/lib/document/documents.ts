// The three documents of the product, as PDFs: a credential, a presentation, a unified history.
import { decodePresentation, REVEAL_TEMPLATES } from '../credential/present';
import type { IssuedCredential } from '../credential/sdjwt';
import type { DisclosedClaims, P256PrivateJwk } from '../credential/types';
import { CLAIM_LABELS, formatClaim } from '../vault/claims';
import { buildHistoryPdf, buildSheetPdf, type HistoryEntry, type SheetRow } from './pdf';

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

export function credentialPdf(args: {
  credential: IssuedCredential;
  holderKey: P256PrivateJwk;
  issuerName: string;
}): Promise<Uint8Array> {
  const { credential, holderKey, issuerName } = args;
  const { claims } = credential;
  return buildSheetPdf(
    {
      kicker: 'Credencial verificable · SD-JWT VC · W3C VC 2.0',
      title: 'Constancia de trabajo',
      subject: subjectOf(claims),
      issuer: { name: issuerName, did: credential.did },
      rows: rowsOf(claims, 'omit'),
      notes: [
        'Este archivo contiene todos los datos. Quien lo tenga puede elegir cuáles mostrar a un tercero con la página Compartir, sin que el resto salga del archivo.',
      ],
      footer: [
        `huella  ${credential.credentialHash}`,
        `clave   ${credential.keyId}`,
        `vence   ${credential.validUntil ?? 'no vence'}`,
      ],
    },
    { type: 'credential', sdJwt: credential.sdJwt, holderKey },
  );
}

export function presentationPdf(args: { presentation: string; aud: string }): Promise<Uint8Array> {
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
    },
    { type: 'presentation', presentation: args.presentation },
  );
}

export function historyPdf(args: {
  cv: string;
  subject: string;
  entries: { employer: string; claims: DisclosedClaims }[];
  aud: string;
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
    },
    { type: 'cv', cv: args.cv },
  );
}
