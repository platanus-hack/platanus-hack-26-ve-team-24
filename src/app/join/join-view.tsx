'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AttachRegion } from '@/components/ui/attach-region';
import { Button } from '@/components/ui/button';
import { Chip, type RowStatus } from '@/components/ui/check-list';
import { ClaimList } from '@/components/ui/claim-list';
import { DropZone } from '@/components/ui/drop-zone';
import { ErrorText } from '@/components/ui/error-text';
import { Field } from '@/components/ui/field';
import { Panel } from '@/components/ui/panel';
import type { ClaimName } from '@/lib/credential/types';
import {
  CredentialFileError,
  readCredentialFile,
  type CredentialFile,
} from '@/lib/document/credential-file';
import { downloadPdf } from '@/lib/document/download';
import { buildHistory, checkSamePerson, dedupe, HISTORY_DEFAULT_REVEAL } from '@/lib/document/join';
import { periodOf } from '@/lib/document/documents';
import { setHandoffFile } from '@/lib/handoff';
import { drainVerdict } from '@/lib/vault/drain-verdict';
import { appUrl, claimViews, EXPIRIES, MAX_AUDIENCE, toggleClaim } from '@/lib/vault/share-builder';
import { createRecordingLookup } from '../verify/_lib/lookup-client';
import { failureReason, unavailableReason } from '../verify/_lib/verdict-copy';

interface Row {
  file: CredentialFile;
  status: RowStatus;
  employer?: string;
  problem?: string;
}

const STATUS_WORD: Partial<Record<RowStatus, string>> = {
  CHECKING: 'Comprobando…',
  VERIFIED: 'Auténtica',
  FAILED: 'No válida',
  UNAVAILABLE: 'No se pudo comprobar',
};

async function checkFile(file: CredentialFile): Promise<Omit<Row, 'file'>> {
  const { verifyCertificate } = await import('@/lib/credential/verify');
  const verdict = await drainVerdict(
    verifyCertificate(file.sdJwt, { lookup: createRecordingLookup().lookup }),
  );
  if (verdict.kind === 'AUTHENTIC') return { status: 'VERIFIED', employer: verdict.issuer.name };
  if (verdict.kind === 'UNAVAILABLE')
    return { status: 'UNAVAILABLE', problem: unavailableReason(verdict.reason) };
  return { status: 'FAILED', problem: failureReason(verdict.failedAt, verdict.reason) };
}

export function JoinView() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [reveal, setReveal] = useState<ClaimName[]>(HISTORY_DEFAULT_REVEAL);
  const [aud, setAud] = useState('');
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ file: File; bytes: Uint8Array; entries: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(picked: File[]) {
    setMade(null);
    setError(null);
    const read: CredentialFile[] = [];
    const bad: string[] = [];
    for (const file of picked) {
      try {
        read.push(await readCredentialFile(file));
      } catch (caught) {
        bad.push(
          caught instanceof CredentialFileError ? caught.message : `${file.name}: no se pudo leer`,
        );
      }
    }
    setProblems(bad);
    const known = new Set(rows.map((row) => row.file.credentialHash));
    const fresh = dedupe(read).filter((file) => !known.has(file.credentialHash));
    setRows((current) => [...current, ...fresh.map((file): Row => ({ file, status: 'CHECKING' }))]);
    for (const file of fresh) {
      const result = await checkFile(file);
      setRows((current) =>
        current.map((row) =>
          row.file.credentialHash === file.credentialHash ? { file, ...result } : row,
        ),
      );
    }
  }

  const files = rows.map((row) => row.file);
  const same = checkSamePerson(files);
  const checking = rows.some((row) => row.status === 'CHECKING');
  const allValid = rows.length > 0 && rows.every((row) => row.status === 'VERIFIED');
  const claims = Object.assign({}, ...files.map((file) => file.claims)) as CredentialFile['claims'];
  const ready = allValid && same.ok && rows.length >= 2;

  async function unify() {
    setBusy(true);
    setError(null);
    try {
      const { pdf, entries } = await buildHistory({
        files: rows.map((row) => ({ file: row.file, employer: row.employer ?? 'Empleador' })),
        reveal,
        aud: aud.trim() || 'Quien lo reciba',
        ttlSec: EXPIRIES[2].ttlSec,
        verifyUrl: `${appUrl()}/verify`,
      });
      const file = new File([pdf as BlobPart], 'historial-laboral.pdf', {
        type: 'application/pdf',
      });
      setMade({ file, bytes: pdf, entries });
      downloadPdf(file.name, pdf);
    } catch {
      setError('No se pudo armar el historial. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <AttachRegion>
        <DropZone
          accept=".pdf"
          multiple
          onFiles={(picked) => void add(picked)}
          label={rows.length === 0 ? 'Suelta los PDF de tus constancias' : 'Suelta más constancias'}
          hint="Son los archivos que emitieron tus empleadores. No salen de tu navegador."
        />
      </AttachRegion>
      {problems.map((problem) => (
        <ErrorText key={problem}>{problem}</ErrorText>
      ))}

      {rows.length > 0 && (
        <Panel title={`Constancias cargadas (${rows.length})`}>
          <ul className="border-b-2 border-ink">
            {rows.map((row) => (
              <li
                key={row.file.credentialHash}
                className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-ink py-4"
              >
                <div>
                  <p className="text-title font-bold">
                    {row.employer ?? 'Comprobando al empleador…'}
                    {typeof row.file.claims.jobTitle === 'string'
                      ? ` · ${row.file.claims.jobTitle}`
                      : ''}
                  </p>
                  <p className="text-small text-ink-muted">
                    {row.file.name} · {periodOf(row.file.claims)}
                  </p>
                  {row.problem && (
                    <p className="mt-1 text-small font-bold text-fail">{row.problem}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <p
                    role="status"
                    className="flex items-center gap-3 text-small font-bold uppercase tracking-wide"
                  >
                    <Chip status={row.status} />
                    {STATUS_WORD[row.status]}
                  </p>
                  <Button
                    variant="quiet"
                    aria-label={`Quitar ${row.file.name}`}
                    onClick={() => {
                      setMade(null);
                      setRows((current) => current.filter((item) => item !== row));
                    }}
                  >
                    Quitar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {!same.ok && <ErrorText className="mt-4">{same.reason}</ErrorText>}
          {same.ok && rows.length === 1 && (
            <p className="mt-4 text-body text-ink-muted">
              Carga al menos una constancia más para unirlas.
            </p>
          )}
          {same.ok && rows.length >= 2 && !checking && allValid && (
            <p role="status" className="mt-4 font-bold">
              Todas son de {same.subject} y todas son auténticas.
            </p>
          )}
        </Panel>
      )}

      {ready && (
        <div className="grid gap-10 lg:grid-cols-2">
          <Panel title="Qué muestra el historial">
            <ClaimList
              claims={claimViews(claims, reveal, 'toggle')}
              onToggle={(name, next) => {
                setReveal((current) => toggleClaim(current, name as ClaimName, next));
                setMade(null);
              }}
            />
          </Panel>
          <div className="flex flex-col gap-6">
            <Field
              label="¿Para quién es?"
              hint="Un nombre que verá quien lo reciba, por ejemplo Banco Meridiano."
            >
              <input
                value={aud}
                maxLength={MAX_AUDIENCE}
                autoComplete="off"
                onChange={(event) => {
                  setAud(event.target.value);
                  setMade(null);
                }}
              />
            </Field>
            <div>
              <Button disabled={busy || reveal.length === 0} onClick={() => void unify()}>
                {busy ? 'Sellando…' : 'Unir en un historial (PDF)'}
              </Button>
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            {made && (
              <Panel title="Historial listo">
                <p className="mb-6 max-w-[65ch] text-body">
                  Se descargó un PDF con {made.entries} constancias selladas juntas. Cárgalo en
                  Verificar para comprobar cada una y ver la trayectoria.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => {
                      setHandoffFile(made.file);
                      router.push('/verify');
                    }}
                  >
                    Verificarlo ahora
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      downloadPdf(made.file.name, made.bytes);
                    }}
                  >
                    Descargar de nuevo
                  </Button>
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
