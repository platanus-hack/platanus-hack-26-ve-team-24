'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from './button';

// literal black on white: a theme token could drift to grey and lose scan contrast
const QR_OPTIONS = {
  margin: 2,
  width: 320,
  color: { dark: '#000000', light: '#ffffff' },
};

export function QrBlock({
  value,
  label,
  copy = false,
}: {
  value: string;
  label: string;
  copy?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    async function render() {
      try {
        const url = await QRCode.toDataURL(value, QR_OPTIONS);
        if (active) setSrc(url);
      } catch {
        if (active) setSrc(null);
      }
    }
    void render();
    return () => {
      active = false;
    };
  }, [value]);

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
      setCopied(false); // clipboard blocked: the button keeps its label
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="border-4 border-ink bg-paper p-2">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL from a local QR render
          <img
            src={src}
            alt={label}
            className="size-56 sm:size-80 [image-rendering:pixelated]"
          />
        ) : (
          <div className="size-56 sm:size-80" aria-hidden="true" />
        )}
      </div>
      <p className="text-body font-bold">{label}</p>
      {copy ? (
        <Button
          variant="secondary"
          onClick={() => {
            void copyValue();
          }}
        >
          {copied ? 'Copiado' : 'Copiar enlace'}
        </Button>
      ) : null}
    </div>
  );
}
