import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

// Demo identities as extractable P-256 private JWKs (only seed scripts and tests ever hold these).
// demo-pack/ is gitignored. The file is never overwritten: the deployed Ledger depends on it.
const FILE = 'demo-pack/identities.json';
const MEMBER_NAMES = [
  'Cámara Nacional de Comercio e Industria',
  'Banco Meridiano',
  'Instituto Andino de Formación Profesional',
  'Servicio Nacional de Registro Laboral',
];
const EMPLOYER_NAMES = ['Logística Orinoco, C.A.', 'Cafés del Tepuy, C.A.', 'Astilleros del Lago, C.A.'];

async function newPrivateJwk() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  const { kty, crv, x, y, d } = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return { kty, crv, x, y, d };
}

const named = (names: string[]) => Promise.all(names.map(async (name) => ({ name, jwk: await newPrivateJwk() })));

if (existsSync(FILE)) {
  console.log(`${FILE} already exists; keeping it`);
} else {
  const identities = {
    members: await named(MEMBER_NAMES),
    employers: await named(EMPLOYER_NAMES),
    holder: { name: 'Sample holder', jwk: await newPrivateJwk() },
  };
  mkdirSync('demo-pack', { recursive: true });
  writeFileSync(FILE, JSON.stringify(identities, null, 2));
  console.log(`wrote ${FILE}: ${MEMBER_NAMES.length} members, ${EMPLOYER_NAMES.length} employers, 1 holder`);
}
