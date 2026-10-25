'use client';

import { ErrorText } from '@/components/ui/error-text';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { createStoredSigner } from '@/lib/credential/keystore';
import { generateEncKey } from '@/lib/credential/share-crypto';
import { vaultStore } from '@/lib/vault/browser';
import { requestInputSchema, startRequest } from '@/lib/vault/request-flow';
import { postRequest } from '@/lib/vault/requests-client';
import { useEmployers } from '@/lib/vault/use-employers';
import type { RequestKind } from '@/lib/vault/types';

const KINDS: { value: RequestKind; label: string }[] = [
  { value: 'CURRENT', label: 'Trabajo aquí actualmente' },
  { value: 'PAST', label: 'Trabajé aquí antes' },
];

export function RequestForm() {
  const router = useRouter();
  const employers = useEmployers();
  const [employer, setEmployer] = useState('');
  const [employeeRef, setEmployeeRef] = useState('');
  const [kind, setKind] = useState<RequestKind>('CURRENT');
  const [errors, setErrors] = useState<{ employer?: string; employeeRef?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = requestInputSchema.safeParse({ employer, employeeRef, kind });
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      setErrors({ employer: fields.employer?.[0], employeeRef: fields.employeeRef?.[0] });
      return;
    }
    setErrors({});
    setFailure(null);
    setBusy(true);
    try {
      await startRequest(
        { store: vaultStore(), createSigner: createStoredSigner, generateEncKey, postRequest },
        parsed.data,
      );
      router.push('/vault');
    } catch {
      setFailure('No se pudo enviar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void submit(event);
      }}
      className="flex flex-col gap-6"
      noValidate
    >
      <Field label="Empleador" error={errors.employer}>
        <select
          value={employer}
          onChange={(event) => {
            setEmployer(event.target.value);
          }}
          disabled={employers.status !== 'ready'}
        >
          <option value="">
            {employers.status === 'loading' ? 'Cargando empleadores…' : 'Elige a tu empleador'}
          </option>
          {employers.status === 'ready' &&
            employers.issuers.map((issuer) => (
              <option key={issuer.account} value={issuer.account}>
                {issuer.name}
              </option>
            ))}
        </select>
      </Field>
      {employers.status === 'error' && (
        <p role="status" className="font-bold">
          No se pudo cargar la lista de empleadores. Recarga la página para intentarlo de nuevo.
        </p>
      )}
      <Field label="Número de empleado" hint="El número con el que te identifica tu empleador." error={errors.employeeRef}>
        <input
          value={employeeRef}
          maxLength={40}
          autoComplete="off"
          onChange={(event) => {
            setEmployeeRef(event.target.value);
          }}
        />
      </Field>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-bold text-small">Tu situación</legend>
        {KINDS.map((option) => (
          <label key={option.value} className="flex min-h-12 items-center gap-3 text-body">
            <input
              type="radio"
              name="kind"
              className="size-5 accent-ink"
              checked={kind === option.value}
              onChange={() => {
                setKind(option.value);
              }}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      {failure && (
        <ErrorText>{failure}</ErrorText>
      )}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? 'Enviando…' : 'Enviar solicitud'}
        </Button>
      </div>
    </form>
  );
}
