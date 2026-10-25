import type { ComponentProps } from 'react';

type Variant = 'primary' | 'secondary' | 'quiet';

const BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-none border-3 border-ink px-6 font-bold text-body no-underline transition-colors duration-150 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-dashed disabled:border-ink-muted disabled:bg-paper disabled:text-ink-muted aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:border-dashed aria-disabled:border-ink-muted aria-disabled:bg-paper aria-disabled:text-ink-muted';

const styles: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-paper hover:text-ink',
  secondary: 'bg-paper text-ink hover:bg-ink hover:text-paper',
  quiet: 'border-transparent text-ink hover:underline',
};

function classFor(variant: Variant, className: string | undefined): string {
  return `${BASE} ${styles[variant]} ${className ?? ''}`.trim();
}

export function Button({
  variant = 'primary',
  type = 'button',
  className,
  ...rest
}: ComponentProps<'button'> & { variant?: Variant; asChild?: never }) {
  return (
    <button type={type} data-variant={variant} className={classFor(variant, className)} {...rest} />
  );
}

export function LinkButton({
  variant = 'primary',
  className,
  ...rest
}: ComponentProps<'a'> & { variant?: Variant }) {
  return <a data-variant={variant} className={classFor(variant, className)} {...rest} />;
}
