// un error nunca es solo color: palabra en negrita, marca dibujada y color fail
export function ErrorText({
  children,
  as: Tag = 'p',
  className = '',
}: {
  children: string;
  as?: 'p' | 'span';
  className?: string;
}) {
  return (
    <Tag role="alert" className={`flex items-start gap-2 font-bold text-fail ${className}`}>
      <svg
        viewBox="0 0 14 14"
        aria-hidden="true"
        strokeLinecap="square"
        className="mt-[0.3em] size-3.5 shrink-0 fill-none stroke-fail stroke-2"
      >
        <path d="M2 2l10 10" />
        <path d="M12 2L2 12" />
      </svg>
      {children}
    </Tag>
  );
}
