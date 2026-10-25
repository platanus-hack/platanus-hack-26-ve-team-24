import { ErrorText } from './error-text';
import type { ReactNode } from 'react';

// Literal class names on purpose: Tailwind only generates utilities it can find in source.
const CONTROL =
  '[&_input]:block [&_input]:min-h-12 [&_input]:w-full [&_input]:rounded-none [&_input]:border-2 [&_input]:border-ink [&_input]:bg-paper [&_input]:px-3 [&_input]:py-2 [&_input]:text-body ' +
  '[&_select]:block [&_select]:min-h-12 [&_select]:w-full [&_select]:rounded-none [&_select]:border-2 [&_select]:border-ink [&_select]:bg-paper [&_select]:px-3 [&_select]:py-2 [&_select]:text-body ' +
  '[&_textarea]:block [&_textarea]:min-h-12 [&_textarea]:w-full [&_textarea]:rounded-none [&_textarea]:border-2 [&_textarea]:border-ink [&_textarea]:bg-paper [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-body ' +
  '[&_input]:placeholder:text-ink-muted [&_textarea]:placeholder:text-ink-muted ' +
  '[&[data-invalid]_input]:border-fail [&[data-invalid]_select]:border-fail [&[data-invalid]_textarea]:border-fail';

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div data-invalid={error ? '' : undefined} className={`flex flex-col gap-2 ${CONTROL}`}>
      <label className="flex flex-col gap-2">
        <span className="font-bold text-small">{label}</span>
        {children}
        {hint && <span className="text-small text-ink-muted">{hint}</span>}
        {error && (
          <ErrorText as="span" className="text-small">
            {error}
          </ErrorText>
        )}
      </label>
    </div>
  );
}
