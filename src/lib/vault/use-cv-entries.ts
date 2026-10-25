'use client';

import { useCallback, useState } from 'react';
import { attachDeps } from './browser';
import { addEntry, attachCertificate, canJoin, failedEntry, MAX_FILE_BYTES, type CvEntry } from './cv-entries';

/** Certificates attached to the CV page, and which of the verified ones go into the CV. */
export function useCvEntries() {
  const [entries, setEntries] = useState<CvEntry[]>([]);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const add = useCallback(async (sdJwt: string, keyName?: string) => {
    const entry = await attachCertificate(attachDeps(), sdJwt, keyName);
    setEntries((current) => addEntry(current, entry));
  }, []);

  const attachFiles = useCallback(
    async (files: File[]) => {
      setBusy(true);
      for (const file of files) {
        if (file.size > MAX_FILE_BYTES) {
          setEntries((current) =>
            addEntry(current, failedEntry(`big:${file.name}`, 'Este archivo es demasiado grande para ser una constancia (límite 256 KB)')),
          );
        } else {
          await add(await file.text());
        }
      }
      setBusy(false);
    },
    [add],
  );

  const toggleIncluded = useCallback((id: string, next: boolean) => {
    setExcluded((current) => {
      const copy = new Set(current);
      if (next) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  }, []);

  const included = entries.filter((entry) => canJoin(entry) && !excluded.has(entry.id));
  return { entries, included, busy, add, attachFiles, toggleIncluded };
}
