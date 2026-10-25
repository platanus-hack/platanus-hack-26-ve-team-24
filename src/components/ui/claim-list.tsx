'use client';

import { MARK } from './check-list';

export interface ClaimView {
  name: string;
  label: string;
  value?: string;
  state: 'shown' | 'hidden' | 'on' | 'off'; // shown/hidden read-only; on/off toggleable
}

type ToggleHandler = (name: string, next: boolean) => void;

// A hidden claim never reaches the DOM with its value, even when one is passed.
function ClaimControl({ claim, onToggle }: { claim: ClaimView; onToggle?: ToggleHandler }) {
  if (claim.state === 'hidden') {
    return (
      <span className="block bg-ink px-3 py-2 text-center text-small font-bold tracking-wide text-paper uppercase">
        Oculto
      </span>
    );
  }

  if (claim.state === 'shown') {
    return <span className="block border-2 border-ink bg-paper px-3 py-2 text-ink">{claim.value}</span>;
  }

  const on = claim.state === 'on';
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${on ? 'Compartido' : 'Compartir'}: ${claim.label}`}
      onClick={() => {
        onToggle?.(claim.name, !on);
      }}
      className="flex min-h-12 items-center gap-3 font-bold"
    >
      <span
        aria-hidden="true"
        className={`flex size-8 items-center justify-center border-3 border-ink ${on ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}
      >
        {on ? (
          <svg
            viewBox="0 0 20 20"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d={MARK.VERIFIED} strokeLinecap="square" strokeLinejoin="miter" />
          </svg>
        ) : null}
      </span>
      {on ? 'Compartido' : 'Compartir'}
    </button>
  );
}

export function ClaimList({
  claims,
  onToggle,
  caption,
}: {
  claims: ClaimView[];
  onToggle?: ToggleHandler;
  caption?: string;
}) {
  return (
    <div>
      {caption ? <p className="mb-4 text-small text-ink-muted">{caption}</p> : null}
      <ul className="border-b-2 border-ink">
        {claims.map((claim) => (
          <li
            key={claim.name}
            data-state={claim.state}
            className="grid grid-cols-2 items-center gap-4 border-t-2 border-ink py-3"
          >
            <span className="font-bold">{claim.label}</span>
            <ClaimControl claim={claim} onToggle={onToggle} />
          </li>
        ))}
      </ul>
    </div>
  );
}
