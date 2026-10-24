export const es = {
  app: {
    name: "AUDGENTIC",
    section: "Comprobar",
  },
  lang: { label: "Idioma", es: "ES", en: "EN" },
  form: {
    label: "ID de sesión",
    placeholder: "Pega el ID de la sesión",
    submit: "Comprobar",
    loading: "Comprobando…",
    samples: "Prueba con un ejemplo",
    sampleIntact: "Ejemplo íntegro",
    sampleTampered: "Ejemplo manipulado",
    synthetic: "Datos de demostración sintéticos.",
  },
  loading: {
    title: "Comprobando",
    body: "Descargando los eventos, recalculando los hashes en este dispositivo y leyendo el ancla pública.",
  },
  verdict: {
    heading: "Resultado",
    verified: {
      title: "Verificado",
      body: "Ningún evento cambió y no falta ninguno. La raíz que calculó tu dispositivo coincide con la anclada en la cadena pública.",
    },
    altered: {
      title: "Alterado",
      body: "Al menos un evento ya no coincide con lo que se selló: su contenido se modificó después.",
    },
    deleted: {
      title: "Borrado",
      body: "Faltan eventos en la secuencia: alguien los eliminó. El hueco sigue siendo evidencia.",
    },
    altered_deleted: {
      title: "Alterado y borrado",
      body: "Hay eventos modificados y eventos eliminados. Este registro no se puede dar por íntegro.",
    },
    unverifiable: {
      title: "No se puede verificar",
      not_found: "No existe una sesión con ese ID. Revisa que esté completo.",
      offline:
        "Sin conexión no se puede comprobar contra el ancla pública. Esto no significa que el registro esté alterado.",
      error: "No se pudo leer la evidencia. Inténtalo de nuevo; esto no es un fallo de integridad.",
      not_anchored:
        "La cadena es coherente, pero esta sesión todavía no se ancló en la cadena pública.",
      not_confirmed:
        "El servidor indica un anclaje, pero la cadena pública no lo confirma desde este dispositivo.",
    },
    checkedAt: (when: string) => `Comprobado aquí · ${when}`,
    missing: (list: string, count: number) =>
      count === 1 ? `Falta el evento ${list}` : `Faltan los eventos ${list}`,
  },
  checks: {
    heading: "Comprobaciones",
    chain: "Cadena de hashes",
    sequence: "Secuencia completa",
    root: "Raíz Merkle",
    anchor: "Ancla pública",
    result: {
      chain: { pass: "Coincide", fail: "Rota", unavailable: "Sin datos" },
      sequence: { pass: "Completa", fail: "Incompleta", unavailable: "Sin datos" },
      root: { pass: "Coincide", fail: "No coincide", unavailable: "Sin datos" },
      anchor: { pass: "Confirmada", fail: "Sin confirmar", unavailable: "Sin ancla" },
    },
    sequenceValue: (found: number, expected: number) => `${found} de ${expected} eventos`,
  },
  line: {
    heading: "La sesión, estación por estación",
    station: (seq: number) => `Evento ${seq}`,
    ok: "Coincide",
    altered: "Alterado",
    missing: "Sin servicio",
    missingNote: "Evento borrado",
    hub: "Enlace · anclaje público",
    hubUnanchored: "Sin anclaje",
    hubMismatch: "Raíz distinta de la anclada",
    collapsed: (count: number) =>
      count === 1 ? "1 estación sin cambios" : `${count} estaciones sin cambios`,
    expand: "Mostrar",
    collapse: "Ocultar",
  },
  proof: {
    heading: "La prueba",
    open: "Ver la prueba técnica",
    close: "Ocultar la prueba técnica",
    sealed: "Hash sellado",
    recomputed: "Hash recalculado aquí",
    expectedRoot: "Raíz anclada",
    foundRoot: "Raíz recalculada",
    anchoredAt: "Anclada el",
    network: "Red",
    contract: "Contrato",
    explorer: "Ver en el explorador",
    copy: "Copiar",
    copied: "Copiado",
    copyFailed: "No se pudo copiar",
    none: "—",
    explain:
      "Cualquiera puede repetir este cálculo: el hash de cada evento se recalcula con SHA-256 y todos se reducen a una raíz Merkle.",
  },
  empty: {
    title: "Compruébalo tú mismo",
    body: "Tu dispositivo recalcula la cadena de eventos y la compara con la raíz anclada en la cadena pública. No hace falta confiar en nadie.",
  },
};

export type Messages = typeof es;
