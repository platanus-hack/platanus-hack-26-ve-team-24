import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { DemoImport } from './demo-import';

export default function ImportPage() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== '1') notFound();
  return (
    <>
      <PageHeader
        title="Importar constancias de demostración"
        lead="Solo en modo demostración. Elige demo-pack/vault.json, generado por el script de siembra. Todos los datos son ficticios."
      />
      <div className="mt-10 max-w-xl">
        <DemoImport />
      </div>
    </>
  );
}
