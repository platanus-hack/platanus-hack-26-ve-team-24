<h1 align="center">Trust</h1>

<p align="center"><strong>La caja negra de los agentes de IA</strong></p>

<p align="center">
  <img src="./project-logo.png" width="160" alt="Trust" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/rspack-%23151515.svg?style=for-the-badge&logo=rspack&logoColor=white" alt="Rspack" />
  <img src="https://img.shields.io/badge/pnpm-%23F69220.svg?style=for-the-badge&logo=pnpm&logoColor=white" alt="pnpm" />
  <img src="https://img.shields.io/badge/node-%235FA04E.svg?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/react-%2361DAFB.svg?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/vite%2B-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" alt="Vite+" />
  <img src="https://img.shields.io/badge/tailwind-%2306B6D4.svg?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/postgresql-%234169E1.svg?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/ethereum-%233C3C3D.svg?style=for-the-badge&logo=ethereum&logoColor=white" alt="Ethereum" />
  <img src="https://img.shields.io/badge/solidity-%23363636.svg?style=for-the-badge&logo=solidity&logoColor=white" alt="Solidity" />
  <img src="https://img.shields.io/badge/viem-%232B2B2B.svg?style=for-the-badge" alt="viem" />
  <img src="https://img.shields.io/badge/ML--DSA-%237C3AED.svg?style=for-the-badge" alt="ML-DSA" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/vitest-%236E9F18.svg?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/oxlint-%23F43F5E.svg?style=for-the-badge&logo=oxc&logoColor=white" alt="Oxlint" />
  <img src="https://img.shields.io/badge/oxfmt-%2310B981.svg?style=for-the-badge&logo=oxc&logoColor=white" alt="Oxfmt" />
  <img src="https://img.shields.io/badge/podman-%23892CA0.svg?style=for-the-badge&logo=podman&logoColor=white" alt="Podman" />
</p>

<p align="center">
  <strong>Track:</strong> 🛡️ AI Security · <strong>team-24</strong> · Platanus Hack 26 — Caracas ft. Yummy
</p>

---

> Lo que tomó meses debería tomar minutos — y lo que puede ser falsificado debería ser verificable por cualquiera.

## Qué es

Trust es una caja negra auditable para agentes de IA. Captura tool calls, decisiones y accesos **fuera del control del agente**, sella la evidencia con una hash-chain por sesión, agrega raíces Merkle y las ancla en una cadena pública.

El resultado: cuando algo sale mal, la evidencia no depende de la palabra de la empresa. Cualquiera puede verificarla contra el anclaje público sin pedir permiso.

Y cuando todo sale bien, cambia algo más profundo: **fortalece la confianza entre humanos y agentes**. Sin evidencia verificable, esa confianza es fe; con evidencia verificable, es una decisión informada.

Los tres gestos humanos que guían el producto: **VER**, **RESPONDER**, **COMPROBAR**.

## Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| Backend | NestJS 12 + ESM | El equipo lo domina; DI y módulos claros |
| Build backend | rspack (un bundle) | `main.js` (API) |
| Frontend | React 19 + Vite+ 1.4 | Build rápido, una sola URL servida por Nest |
| Estilos | Tailwind CSS 4 | UI en horas, no en días |
| Lenguaje | TypeScript 6 | **Fijado en 6**: TS 7 (`tsgo`) rompe los decoradores de Nest |
| Store | Postgres 17 + CAS en filesystem | Evidencia off-chain; el hash es la prueba |
| Chain | viem + contrato mínimo | Anclaje de raíces en testnet |
| Firma PQ | `@noble/post-quantum` (ML-DSA) | Demo-grade, sin dependencias nativas |
| Lint/format backend | Oxlint + Oxfmt | Config heredada de `hrzn-core` |
| Lint/format front | `vp check` (Vite+) | Un comando: formato + lint + tipos |
| Paquetes | pnpm 12 (workspaces) | Monorepo simple |
| Contenedores | Podman / Docker | Multi-stage Alpine, Node 26 |

## Estructura

```text
.
├── src/                      Backend NestJS
│   └── main.ts               API — se reconstruye según docs/BACKEND.md
├── web/                      Front React con Vite+
│   ├── src/
│   ├── vite.config.ts
│   └── package.json
├── docs/                     BACKEND.md — la nueva arquitectura
├── docker/
│   └── start.sh              Arranque de la API
├── Dockerfile                Multi-stage: target api
├── Dockerfile.dev
├── docker-compose.yml
├── docker-compose.dev.yml
├── Makefile
├── pnpm-workspace.yaml
├── tsconfig.json
├── rspack.config.js
├── .oxlintrc.json
├── .oxfmtrc.json
└── vitest.config.ts
```

### Un proceso, una imagen

```text
api -> dist/main.js  Nest con HTTP y SSE
```

La captura de evidencia no corre en el back: corre en el host con eBPF. Ver [docs/BACKEND.md](docs/BACKEND.md).

## Requisitos

- Node.js **>= 26**
- pnpm **12**
- Podman (recomendado en Fedora) o Docker

## Arranque rápido

```bash
cp .env.example .env
pnpm install

# Backend con hot reload (3000)
make dev

# Front con Vite+ (5173), en otra terminal
make dev-web
```

O todo containerizado:

```bash
make up-dev
```

## Comandos

| Comando | Qué hace |
|---|---|
| `make help` | Lista todos los comandos |
| `make install` | Instala dependencias |
| `make dev` | Backend con hot reload |
| `make dev-web` | Front con Vite+ y HMR |
| `make build` | Compila backend (rspack) |
| `make build-web` | Compila front (Vite+) |
| `make lint` | Oxlint sobre backend y front |
| `make fmt` | Oxfmt sobre backend |
| `make fmt-check` | Verifica formato sin escribir |
| `make typecheck` | `tsc --noEmit` |
| `make check-web` | `vp check` del front |
| `make test` | Vitest |
| `make up` | Levanta api + postgres |
| `make logs` | Logs de contenedores |
| `make down` | Para los contenedores |
| `make clean` | Baja y borra volúmenes |

Sin Make, los comandos equivalentes viven en `package.json` y `web/package.json`.

## Verificación

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm --filter web check
pnpm build
pnpm build:web
```

El lint incluye la regla **`import/no-cycle`**: un ciclo de imports rompe la arquitectura y falla el build.

## API

| Ruta | Método | Qué hace |
|---|---|---|
| `/health` | GET | Estado del servicio |
| `/api/events` | POST | Sella un evento |
| `/api/sessions` | GET | Lista sesiones |
| `/api/sessions/:id` | DELETE | Borra la sesión completa |
| `/api/sessions/:id/state` | GET | Cuarentena y cabeza |
| `/api/sessions/:id/events` | GET | Eventos de la sesión |
| `/api/sessions/:id/verify` | GET | Verificación de la cadena |
| `/api/anchor/:id` | POST | Ancla la raíz ahora |
| `/api/chaos/:id/tamper/:seq` | POST | Altera un evento |
| `/api/chaos/:id/delete/:seq` | POST | Borra un evento |
| `/api/chaos/:id/kill` | POST | Activa el kill switch |
| `/events` | GET | Stream SSE |
| `/` | GET | Dashboard (placeholder) |

En desarrollo el front corre en `5173` y hace proxy de `/api` y `/events` a `3000`. En producción Nest sirve el build estático desde el mismo origen: **una URL, cero CORS**.

## Variables de entorno

Copia `.env.example` a `.env`. Las principales:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Postgres |
| `RPC_URL` | RPC de la testnet |
| `PRIVATE_KEY` | Wallet del anclaje (nunca la de los agentes) |
| `CONTRACT_ADDRESS` | Contrato de raíces |
| `TELEGRAM_TOKEN` / `TELEGRAM_CHAT_ID` | Alertas |
| `CAS_DIR` | Directorio del content-addressed storage |

## Estado del proyecto

- [x] Monorepo pnpm con workspaces
- [x] Backend NestJS ESM con rspack (dos bundles)
- [x] API con `/health` y servicio de estáticos
- [x] Worker standalone sin HTTP
- [x] Sealer con hash-chain por sesión
- [x] Persistencia en archivos + cabeza de sesión
- [x] Verificador de alteración y borrado (incluido el último evento)
- [x] Merkle root por sesión
- [x] Anchor job + contrato `EvidenceRegistry.sol` (dry-run sin credenciales)
- [x] Agente rogue + kill switch
- [x] Alertas Telegram con fallback a log
- [x] SSE en `/events`
- [x] Oxlint + Oxfmt + Vitest en el backend
- [x] Dockerfiles multi-stage y compose con Podman
- [x] Regla `import/no-cycle` en el lint
- [ ] Anchor on-chain real (requiere faucet, wallet y contrato)
- [ ] Telegram real (requiere token)
- [ ] Firma ML-DSA de la raíz
- [ ] Snapshot forense
- [ ] Front completo (fuera de alcance: solo backend)

## Documentación

- [BACKEND.md](docs/BACKEND.md) — la nueva arquitectura del back: captura kernel (eBPF), sellado, anclaje y verificación

## Deploy

Vercel, Render y Netlify no pueden conectarse a un repositorio de organización. Para desplegar hay que hacer mirror a un repo personal:

```bash
git remote set-url --add --push origin https://github.com/platanus-hack/platanus-hack-26-ve-team-24.git
git remote set-url --add --push origin https://github.com/<tu-usuario>/<tu-repo>.git
```

Cada `git push` actualiza ambos. El deploy corre desde el repo personal.

> **Nota:** Vercel no corre daemons. El sealer, el anchor y los witnesses necesitan un host persistente. Para el demo, un solo contenedor con Podman Compose en Railway, Render o Fly.

## Equipo

- Diego Enrique Garcia Gonzalez ([@devgago](https://github.com/devgago))
- Luis Ochoa ([@tipotramquilo](https://github.com/tipotramquilo))
- Franklin Quintana ([@franku03](https://github.com/franku03))
- Gustavo Enrique Kufatty Anton ([@kufatty](https://github.com/kufatty))
- Jose Briceno ([@briluzaog](https://github.com/briluzaog))
