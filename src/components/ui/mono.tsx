'use client';

import { useEffect, useState } from 'react';

// shortcut: fixed 10/8 middle-ellipsis, no grapheme awareness, fine for hex and base58 IDs; upgrade if free-text values appear
export function shortenMiddle(value: string): string {
  if (value.length <= 24) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

export function Mono({
  value,
  shorten = false,
  copy = false,
}: {
  value: string;
  shorten?: boolean;
  copy?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => {
      setCopied(false);
    }, 1500);
    return () => {
      clearTimeout(timer);
    };
  }, [copied]);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false); // clipboard blocked: the label keeps showing the value
    }
  }

  const text = shorten ? shortenMiddle(value) : value;

  if (!copy) {
    return (
      <code title={value} className="font-mono break-all">
        {text}
      </code>
    );
  }

  return (
    <span aria-live="polite">
      <button
        type="button"
        title={value}
        className="font-mono text-small border-2 border-ink bg-paper px-2 py-1 min-h-12 hover:bg-ink hover:text-paper transition-colors duration-150"
        onClick={() => {
          void copyValue();
        }}
      >
        {copied ? (
          'Copiado'
        ) : (
          <>
            <span className="sr-only">Copiar </span>
            {text}
          </>
        )}
      </button>
    </span>
  );
}
