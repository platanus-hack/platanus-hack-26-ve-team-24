'use client';

import { useEffect, useState } from 'react';
import { useVerification } from '@/app/verify/_lib/use-verification';
import { Button, LinkButton } from '@/components/ui/button';
import { CheckList, CheckRow } from '@/components/ui/check-list';
import { Panel } from '@/components/ui/panel';
import type { AttackId, Sample } from '@/lib/credential/attacks';
import { downloadText } from '@/lib/vault/certificate-info';
import { ATTACK_CARDS, presentOriginal } from '@/lib/vault/lab';
import { loadSample } from '@/lib/vault/lab-sample';

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; sample: Sample };

interface Run {
  title: string;
  changed?: string;
  presentation: string;
}

function Result({ run, verification }: { run: Run; verification: ReturnType<typeof useVerification> }) {
  const { verdict } = verification;
  return (
    <Panel title={run.title}>
      {run.changed && <p className="mb-4 max-w-[65ch] text-body">{run.changed}</p>}
      <CheckList>
        {verification.rows.map((row, index) => (
          <CheckRow
            key={row.code}
            index={index + 1}
            label={row.label}
            status={row.status}
            measured={row.measured}
            detail={row.detail}
          />
        ))}
      </CheckList>
      {verdict && (
        <p role="status" className="mt-4 text-title font-bold">
          {verdict.kind === 'AUTHENTIC'
            ? 'Authentic: this letter passes every check.'
            : verdict.kind === 'NOT_AUTHENTIC'
              ? `Rejected: ${verdict.reason}`
              : 'The ledger could not be reached. Try again.'}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            downloadText('forgery.sdjwt', run.presentation);
          }}
        >
          Download the forgery
        </Button>
      </div>
    </Panel>
  );
}

export function LabView() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [run, setRun] = useState<Run | null>(null);
  const verification = useVerification();
  const { run: verify } = verification;

  useEffect(() => {
    void (async () => {
      try {
        setLoad({ status: 'ready', sample: await loadSample() });
      } catch {
        setLoad({ status: 'error' });
      }
    })();
  }, []);

  if (load.status === 'loading') return <p role="status">Preparing the sample letter…</p>;
  if (load.status === 'error') {
    return (
      <Panel title="The sample letter is not available yet">
        <p className="text-body">Try again in a moment.</p>
      </Panel>
    );
  }
  const { sample } = load;

  async function start(next: Run) {
    setRun(next);
    await verify({ text: next.presentation, kind: 'presentation', origin: 'sample' });
  }

  async function runOriginal() {
    await start({ title: 'The original letter', presentation: await presentOriginal(sample) });
  }

  async function runAttackCard(id: AttackId, title: string) {
    const { runAttack } = await import('@/lib/credential/attacks');
    const { presentation, attack } = await runAttack(id, sample);
    await start({ title, changed: attack.changed, presentation });
  }

  return (
    <div className="flex flex-col gap-10">
      <Panel title="The original" tone="quiet">
        <p className="mb-4 max-w-[65ch] text-body">
          This sample letter is synthetic, and its holder key is public on purpose so anyone can run the
          lab. It passes every check.
        </p>
        <Button variant="secondary" onClick={() => void runOriginal()}>
          Check the original
        </Button>
      </Panel>

      <ul className="grid gap-6 md:grid-cols-2">
        {ATTACK_CARDS.map((card) => (
          <li key={card.id} className="flex flex-col gap-4 border-2 border-ink bg-white p-6">
            <h2 className="font-display text-title font-extrabold font-stretch-expanded">{card.title}</h2>
            <Button
              disabled={verification.running}
              onClick={() => void runAttackCard(card.id, card.title)}
            >
              Try it
            </Button>
          </li>
        ))}
        <li className="flex flex-col gap-4 border-2 border-dashed border-ink p-6">
          <h2 className="font-display text-title font-extrabold font-stretch-expanded">
            Revoke the letter
          </h2>
          <p className="text-body">
            Revoking fails the ledger record. Ask the employer to revoke it, then check again.
          </p>
          <div>
            <LinkButton variant="secondary" href="/employer/issued">
              Open the employer’s issued list
            </LinkButton>
          </div>
        </li>
      </ul>

      {run && (
        <div className="flex flex-col gap-4">
          <Result run={run} verification={verification} />
          <div>
            <Button
              variant="quiet"
              onClick={() => {
                setRun(null);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
