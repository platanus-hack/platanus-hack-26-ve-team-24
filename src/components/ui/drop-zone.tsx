'use client';

import { useEffect } from 'react';
import type { ChangeEvent, DragEvent } from 'react';

const hasFiles = (event: globalThis.DragEvent) => event.dataTransfer?.types.includes('Files');

// '.ext' entries match the file name suffix; anything else is an exact MIME type
function accepts(file: File, accept: string): boolean {
  const name = file.name.toLowerCase();
  return accept
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .some((entry) => (entry.startsWith('.') ? name.endsWith(entry) : file.type === entry));
}

// The working drop slot: a white field with a 4px black border (see /dev/kit).
export function DropZone({
  onFile,
  onFiles,
  multiple = false,
  accept = '.pdf,.sdjwt,.json,.txt',
  label,
  hint,
  disabled = false,
  compact = false,
}: {
  onFile?: (file: File) => void;
  onFiles?: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  // A file dragged anywhere over the page sets html[data-dragging]; globals.css inverts
  // the drop slot. Drops outside the slot are swallowed
  // so the browser never navigates away to the file.
  useEffect(() => {
    const root = document.documentElement;
    let depth = 0;
    // a disabled zone still swallows drops (a run in progress must not lose its result to a navigation)
    const enter = (event: globalThis.DragEvent) => {
      if (disabled || !hasFiles(event)) return;
      depth += 1;
      root.dataset.dragging = 'true';
    };
    const leave = (event: globalThis.DragEvent) => {
      if (disabled || !hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) delete root.dataset.dragging;
    };
    const over = (event: globalThis.DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const drop = (event: globalThis.DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      delete root.dataset.dragging;
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
      delete root.dataset.dragging;
    };
  }, [disabled]);

  function pick(files: FileList | null | undefined) {
    if (disabled || !files) return;
    const accepted = [...files]
      .filter((file) => accepts(file, accept))
      .slice(0, multiple ? undefined : 1);
    if (accepted.length === 0) return;
    onFile?.(accepted[0]);
    onFiles?.(accepted);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    pick(event.currentTarget.files);
    event.currentTarget.value = '';
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    if (disabled) return;
    event.preventDefault();
    pick(event.dataTransfer.files);
  }

  return (
    <label
      onDragOver={(event) => {
        if (!disabled) event.preventDefault();
      }}
      onDrop={handleDrop}
      data-disabled={disabled || undefined}
      className={`dropzone flex w-full cursor-pointer flex-col items-center justify-center gap-3 border-4 border-ink bg-paper text-center transition-colors duration-150 has-focus-visible:outline-3 has-focus-visible:-outline-offset-8 has-focus-visible:outline-focus data-disabled:cursor-not-allowed data-disabled:border-dashed data-disabled:border-ink-muted data-disabled:text-ink-muted ${compact ? 'min-h-44 p-6' : 'min-h-64 p-8'}`}
    >
      <span
        className={`font-display font-extrabold text-balance ${compact ? 'text-[1.75rem] leading-tight tracking-[-0.02em]' : 'text-headline'}`}
      >
        {label}
      </span>
      {hint ? <span className="max-w-[40ch] text-body">{hint}</span> : null}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
      />
    </label>
  );
}
