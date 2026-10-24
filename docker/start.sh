#!/usr/bin/env bash
#
# Arranque del contenedor: la API.
#
# La captura de evidencia corre en el host con eBPF, no en el
# contenedor. Ver docs/BACKEND.md.
set -Eeuo pipefail

# exec reemplaza el shell: las señales llegan directo a Node.
exec node dist/main.js
