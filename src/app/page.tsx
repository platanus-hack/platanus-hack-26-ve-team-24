import { LinkButton } from '@/components/ui/button';
import { ClaimList } from '@/components/ui/claim-list';
import type { ClaimView } from '@/components/ui/claim-list';
import { Seal } from '@/components/ui/seal';
import type { RowStatus } from '@/components/ui/check-list';
import { Hero } from './_landing/hero';
import { SiteNav } from './_landing/site-nav';

const CHECKS = [
  { label: 'Constancia', proves: 'El archivo es una credencial válida y nadie la alteró.' },
  { label: 'Acreditado', proves: 'El consorcio acreditó a este empleador en el registro.' },
  { label: 'Firma', proves: 'La firmó la clave del empleador, no otra.' },
  { label: 'Titular', proves: 'Quien la comparte tiene la clave a la que fue emitida.' },
  { label: 'Registro', proves: 'Su huella está anclada en el registro público, sin revocar.' },
];

// datos ficticios: ilustran qué ve quien recibe el enlace
const SAMPLE_CLAIMS: ClaimView[] = [
  { name: 'employer', label: 'Empleador', value: 'Ejemplo Andino, C.A.', state: 'shown' },
  { name: 'status', label: 'Situación', value: 'Empleado activo', state: 'shown' },
  { name: 'salary', label: 'Salario', state: 'hidden' },
  { name: 'position', label: 'Cargo', state: 'hidden' },
  { name: 'startDate', label: 'Fecha de ingreso', state: 'hidden' },
];

const STORED = ['La huella (hash) de cada constancia', 'La cuenta del empleador que la emitió', 'La fecha'];
const NEVER_STORED = ['Tu nombre', 'Tu salario ni tu cargo', 'La constancia en sí'];

function sealFor(index: number): RowStatus[] {
  return CHECKS.map((_, i) => (i <= index ? 'DONE' : 'PENDING'));
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="max-w-[18ch] font-display text-headline font-extrabold text-balance">{children}</h2>
  );
}

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="flex flex-1 flex-col">
        <Hero />

        <section className="border-t-4 border-ink px-gutter pt-24 pb-24">
          <SectionTitle>Cinco comprobaciones, siempre en el mismo orden.</SectionTitle>
          <p className="mt-6 max-w-[60ch] text-lead">
            Cada una cierra un segmento del sello. Si una falla, el sello queda abierto en ese
            punto y te dice qué se esperaba y qué se encontró.
          </p>
          <ol className="mt-12 border-b-2 border-ink">
            {CHECKS.map((check, index) => (
              <li
                key={check.label}
                className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2 border-t-2 border-ink py-6 md:grid-cols-[auto_14rem_1fr]"
              >
                <Seal statuses={sealFor(index)} size={56} />
                <p className="text-title font-bold">
                  <span className="tnum">{index + 1}</span> {check.label}
                </p>
                <p className="col-start-2 max-w-[55ch] text-body md:col-start-3">{check.proves}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-12 bg-ink px-gutter py-24 text-paper md:grid-cols-2 md:gap-16">
          <div>
            <SectionTitle>Muestra un dato. Oculta el resto.</SectionTitle>
            <p className="mt-6 max-w-[45ch] text-lead">
              Tú eliges qué ve el banco, dato por dato, y ves su vista mientras decides. Lo oculto
              no se difumina: no viaja.
            </p>
          </div>
          <div className="bg-paper p-6 text-ink">
            <ClaimList claims={SAMPLE_CLAIMS} caption="Vista del banco · ejemplo con datos ficticios" />
          </div>
        </section>

        <section className="px-gutter py-24">
          <SectionTitle>La confianza la da un consorcio, no una empresa.</SectionTitle>
          <p className="mt-6 max-w-[60ch] text-lead">
            Cámaras, bancos y universidades acreditan a cada empleador por quórum. El registro es
            público y cualquiera puede leerlo.
          </p>
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <div className="border-t-4 border-ink pt-4">
              <h3 className="text-title font-bold">Lo que guarda el registro</h3>
              <ul className="mt-4">
                {STORED.map((item) => (
                  <li key={item} className="border-t-2 border-rule py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t-4 border-ink pt-4">
              <h3 className="text-title font-bold">Lo que nunca guarda</h3>
              <ul className="mt-4">
                {NEVER_STORED.map((item) => (
                  <li key={item} className="border-t-2 border-rule py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-10 max-w-[65ch] text-body text-ink-muted">
            Es divulgación selectiva (SD-JWT), no una prueba de conocimiento cero. El consorcio de
            esta demo y sus empleadores son ficticios.
          </p>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-8 bg-marigold px-gutter py-16">
          <p className="max-w-[20ch] font-display text-headline font-extrabold text-balance">
            ¿Te enviaron una constancia?
          </p>
          <div className="flex flex-wrap gap-4">
            <LinkButton href="/verify">Verificar una constancia</LinkButton>
            <LinkButton href="/vault" variant="secondary">
              Abrir mi bóveda
            </LinkButton>
          </div>
        </footer>
      </main>
    </>
  );
}
