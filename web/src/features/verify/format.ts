export function formatDateTime(value: Date | string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(value));
}

export const stripHashPrefix = (hash: string): string => hash.replace(/^sha256:/, "");

/** `0x9be4…c21a` para filas compactas; la prueba muestra el hash completo. */
export function shortHash(hash: string): string {
  const bare = stripHashPrefix(hash);

  return `${bare.slice(0, 6)}…${bare.slice(-4)}`;
}
