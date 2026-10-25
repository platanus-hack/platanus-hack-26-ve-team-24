import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Button, LinkButton } from '@/components/ui/button';
import { Disclosure } from '@/components/ui/disclosure';
import { Field } from '@/components/ui/field';
import { Mono } from '@/components/ui/mono';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { QrBlock } from '@/components/ui/qr-block';
import { Receipt } from '@/components/ui/receipt';
import { SealLegend } from '@/components/ui/seal';
import { Timeline } from '@/components/ui/timeline';
import type { TimelineItem } from '@/components/ui/timeline';
import {
  CheckListDemo,
  ClaimListDemo,
  DropZoneDemo,
  SealStaggerDemo,
  SealStates,
  VerdictDemo,
} from './kit-demo';

export const metadata: Metadata = { title: 'Kit de diseño · Constancia' };

// valores ficticios: el kit nunca muestra una constancia real
const CREDENTIAL_ID = '0x3f9a1c7e0b2d4a685c1e8b7a9d3f0e26a4b9c2d1e7f086351d6e3b9a0c7f2e54';

const TIMELINE: TimelineItem[] = [
  {
    id: 'a',
    employer: 'Logística Orinoco (demo)',
    title: 'Analista (ficticio)',
    start: '2021-03',
    end: '2023-08',
    status: 'VERIFIED',
  },
  {
    id: 'c',
    employer: 'Café Tepuy (demo)',
    title: 'Asistente (ficticio)',
    start: '2022-06',
    end: '2023-10',
    status: 'FAILED',
    note: 'La constancia del empleador no coincide',
  },
  {
    id: 'b',
    employer: 'Astilleros del Lago (demo)',
    title: 'Coordinadora (ficticio)',
    start: '2024-01',
    end: 'present',
    status: 'PENDING',
    note: 'Constancia aún sin comprobar',
  },
];

const TOKENS = [
  { name: 'paper', className: 'bg-paper', use: 'Fondo de todo.' },
  { name: 'ink', className: 'bg-ink', use: 'Texto, reglas de 2–4 px, marcas.' },
  { name: 'ink-muted', className: 'bg-ink-muted', use: 'Texto secundario. Nunca decorativo.' },
  { name: 'rule', className: 'bg-rule', use: 'Solo líneas finas entre filas.' },
  { name: 'marigold', className: 'bg-marigold', use: 'Regiones enteras. Nunca texto.' },
  { name: 'ok', className: 'bg-ok', use: 'Solo estados: válida.' },
  { name: 'fail', className: 'bg-fail', use: 'Solo estados: no válida.' },
];

const TYPE_SCALE = [
  { token: 'text-display', className: 'font-display text-display', sample: 'Se prueban solas.' },
  { token: 'text-headline', className: 'font-display text-headline', sample: 'Verifica en segundos.' },
  { token: 'text-title', className: 'text-title font-bold', sample: 'Cinco comprobaciones, en orden.' },
  { token: 'text-lead', className: 'max-w-[45ch] text-lead', sample: 'Tú eliges qué ve el banco, dato por dato.' },
  {
    token: 'text-body',
    className: 'max-w-[65ch] text-body',
    sample:
      'Constancia lee la credencial firmada en tu navegador y comprueba cada eslabón contra el registro del consorcio. Nada de lo que sueltas aquí se sube a ningún lado.',
  },
  { token: 'text-small', className: 'text-small', sample: 'Pies de foto, recibos y notas.' },
];

function Section({ title, component, children }: { title: string; component?: string; children: ReactNode }) {
  return (
    <section className="mt-24 border-t-4 border-ink pt-6">
      <h2 className="mb-8 font-display text-headline font-extrabold">
        {title}
        {component ? (
          <code className="ml-4 align-middle text-small font-normal">{component}</code>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return <span className="text-small text-ink-muted">{children}</span>;
}

export default function KitPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-gutter py-12">
      <PageHeader
        title="Kit de diseño"
        lead="Cada pieza de Constancia en cada estado. Programa de identidad: blanco, negro y un amarillo institucional que ocupa regiones enteras."
      />

      <Section title="Color">
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-7">
          {TOKENS.map((token) => (
            <li key={token.name} className="flex flex-col gap-2">
              <div className={`h-24 border-2 border-ink ${token.className}`} />
              <code className="text-small font-bold">{token.name}</code>
              <Caption>{token.use}</Caption>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-[65ch] text-body">
          Sobre amarillo, el texto siempre es negro. Ningún estado depende solo del color: cada uno
          lleva su palabra y su marca.
        </p>
      </Section>

      <Section title="Tipografía">
        <div className="flex flex-col gap-10">
          {TYPE_SCALE.map((entry) => (
            <div key={entry.token} className="flex flex-col gap-1">
              <code className="text-small text-ink-muted">{entry.token}</code>
              <p className={entry.className}>{entry.sample}</p>
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <code className="text-small text-ink-muted">code</code>
            <p>
              <code>sha256:3f9a1c7e0b2d4a68</code>
            </p>
          </div>
        </div>
      </Section>

      <Section title="Sello" component="Seal">
        <div className="flex flex-col gap-12">
          <SealStates />
          <SealStaggerDemo />
        </div>
      </Section>

      <Section title="Leyenda del sello" component="SealLegend">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <Caption>En reposo</Caption>
            <SealLegend />
          </div>
          <div className="flex flex-col gap-3">
            <Caption>Falla en la tercera comprobación</Caption>
            <SealLegend statuses={['VERIFIED', 'VERIFIED', 'FAILED', 'NOT_EXAMINED', 'NOT_EXAMINED']} />
          </div>
        </div>
      </Section>

      <Section title="Lista de comprobaciones" component="CheckList">
        <CheckListDemo />
      </Section>

      <Section title="Veredicto" component="Verdict">
        <VerdictDemo />
      </Section>

      <Section title="Zona para soltar" component="DropZone">
        <DropZoneDemo />
      </Section>

      <Section title="Datos compartidos" component="ClaimList">
        <ClaimListDemo />
      </Section>

      <Section title="Línea de tiempo" component="Timeline">
        <div className="max-w-2xl">
          <Timeline
            items={TIMELINE}
            gaps={[{ from: '2023-10', to: '2024-01', months: 3 }]}
            overlaps={[{ a: 'a', b: 'c' }]}
          />
        </div>
      </Section>

      <Section title="Código QR" component="QrBlock">
        <div className="flex flex-wrap gap-12">
          <QrBlock
            value="https://constancia.example/share#demo-fragment"
            label="Enlace para compartir (ficticio)"
            copy
          />
          <QrBlock
            value="https://constancia.example/verify#demo-fragment"
            label="Enlace de verificación (ficticio)"
          />
        </div>
      </Section>

      <Section title="Recibo" component="Receipt">
        <div className="flex flex-col gap-12">
          <Receipt
            title="Lo que salió de tu navegador"
            rows={[
              { label: 'DID', value: 'did:constancia:11155111:0x1f9a…', mono: true },
              { label: 'Clave', value: '…#key-1', mono: true },
              { label: 'ID de la constancia', value: CREDENTIAL_ID, mono: true },
              { label: 'Documento', value: 'Nunca se envió', muted: true },
            ]}
            footnote="Solo salieron identificadores públicos: el DID, su clave y el ID impreso en la constancia."
          />
          <Receipt
            title="Lo que guardamos"
            rows={[
              { label: 'ID de la constancia', value: CREDENTIAL_ID, mono: true },
              { label: 'Empleador', value: 'Logística Orinoco (empleador ficticio)' },
              { label: 'Huella', value: '0x9c41…7e2a (ejemplo)', mono: true },
              { label: 'Fecha', value: '24-10-2026 14:32 UTC' },
            ]}
            footnote="Ningún nombre, ningún salario, ningún documento."
          />
        </div>
      </Section>

      <Section title="Botones" component="Button">
        <div id="botones" className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center gap-4">
            <Button>Primario</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="quiet">Discreto</Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button disabled>Primario</Button>
            <Button variant="secondary" disabled>
              Secundario
            </Button>
            <Button variant="quiet" disabled>
              Discreto
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <LinkButton href="#botones">Enlace primario</LinkButton>
            <LinkButton href="#botones" variant="secondary">
              Enlace secundario
            </LinkButton>
          </div>
        </div>
      </Section>

      <Section title="Campo" component="Field">
        <div className="grid gap-8 md:grid-cols-2">
          <Field label="Nombre del titular">
            <input type="text" name="holder" placeholder="María Fernanda Rojas (ficticio)" />
          </Field>
          <Field label="Nombre del titular, con ayuda" hint="Tal como aparece en la constancia.">
            <input type="text" name="holder-hint" placeholder="María Fernanda Rojas (ficticio)" />
          </Field>
          <Field label="Cédula" error="Ninguna constancia coincide con esta cédula.">
            <input type="text" name="national-id" defaultValue="V-00000000" />
          </Field>
          <Field label="Situación">
            <select name="status" defaultValue="active">
              <option value="active">Empleado activo</option>
              <option value="former">Ex empleado</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Panel, detalles y código" component="Panel · Disclosure · Mono">
        <div className="flex flex-col gap-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Panel normal">
              <p className="text-body">Un panel con borde para un solo bloque de contenido.</p>
            </Panel>
            <Panel title="Panel discreto" tone="quiet">
              <p className="text-body">El mismo bloque sin relleno, para contenido secundario.</p>
            </Panel>
          </div>
          <Disclosure summary="Detalles técnicos">
            <p className="max-w-[65ch]">
              El verificador calcula la huella del archivo en memoria, lee la credencial firmada y
              resuelve el documento DID del emisor. Nada se escribe en disco.
            </p>
          </Disclosure>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Caption>Completo</Caption>
              <Mono value={CREDENTIAL_ID} />
            </div>
            <div className="flex flex-col gap-2">
              <Caption>Acortado</Caption>
              <Mono value={CREDENTIAL_ID} shorten />
            </div>
            <div className="flex flex-col gap-2">
              <Caption>Acortado y copiable</Caption>
              <Mono value={CREDENTIAL_ID} shorten copy />
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
