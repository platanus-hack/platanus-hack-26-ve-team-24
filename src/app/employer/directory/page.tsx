import { PageHeader } from '@/components/ui/page-header';
import { DirectoryView } from './directory-view';

export default function DirectoryPage() {
  return (
    <>
      <PageHeader
        title="Directorio de empleados"
        lead="Las personas a las que puedes emitir constancias. Esta lista nunca sale de este navegador."
      />
      <div className="mt-10">
        <DirectoryView />
      </div>
    </>
  );
}
