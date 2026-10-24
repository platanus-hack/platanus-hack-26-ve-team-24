/**
 * Un bundle:
 *   src/main.ts -> dist/main.js (API HTTP + SSE)
 *
 * La captura de evidencia no corre en el back — corre en el host con
 * eBPF. Ver docs/BACKEND.md.
 */
export default [
  // API: el default de Nest (src/main.ts -> dist/main.js)
  () => ({}),
];
