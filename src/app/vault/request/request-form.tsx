'use client';

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
  { value: 'CURRENT', label: 'I work here now' },
  { value: 'PAST', label: 'I used to work here' },
];

const shortAccount = (account: string) => `${account.slice(0, 6)}…${account.slice(-4)}`;

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
      setFailure('Could not send the request. Check your connection and try again.');
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
      <Field label="Employer" error={errors.employer}>
        <select
          value={employer}
          onChange={(event) => {
            setEmployer(event.target.value);
          }}
          disabled={employers.status !== 'ready'}
        >
          <option value="">
            {employers.status === 'loading' ? 'Loading employers…' : 'Choose your employer'}
          </option>
          {employers.status === 'ready' &&
            employers.issuers.map((issuer) => (
              <option key={issuer.account} value={issuer.account}>
                {issuer.name} · {shortAccount(issuer.account)}
              </option>
            ))}
        </select>
      </Field>
      {employers.status === 'error' && (
        <p role="status" className="font-bold">
          Could not load the list of employers. Reload the page to try again.
        </p>
      )}
      <Field label="Employee number" hint="The number your employer knows you by." error={errors.employeeRef}>
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
        <legend className="mb-2 font-bold text-small">Your situation</legend>
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
        <p role="alert" className="font-bold text-red-text">
          {failure}
        </p>
      )}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send request'}
        </Button>
      </div>
    </form>
  );
}
