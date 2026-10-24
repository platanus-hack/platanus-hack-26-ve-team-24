import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { useI18n } from "../i18n";

type Props = {
  label: string;
  value: string;
  /** Marca el valor como el que no coincide. */
  flagged?: boolean;
};

type CopyState = "idle" | "copied" | "failed";

const FEEDBACK_MS = 1800;

export function HashValue({ label, value, flagged = false }: Props) {
  const { t } = useI18n();
  const [copy, setCopy] = useState<CopyState>("idle");

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopy("copied");
    } catch {
      // Origen no seguro o permiso denegado: se avisa en vez de fallar callado.
      setCopy("failed");
    }

    setTimeout(() => setCopy("idle"), FEEDBACK_MS);
  };

  const Icon = copy === "copied" ? Check : copy === "failed" ? X : Copy;
  const text =
    copy === "copied" ? t.proof.copied : copy === "failed" ? t.proof.copyFailed : t.proof.copy;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        <button
          type="button"
          onClick={copyValue}
          aria-label={`${t.proof.copy} ${label}`}
          className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-cobalt"
        >
          <Icon aria-hidden className="size-4" />
          <span aria-live="polite">{text}</span>
        </button>
      </div>
      <p
        className={`font-mono text-xs leading-relaxed break-all ${flagged ? "bg-scarlet px-1.5 py-1 text-porcelain" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
