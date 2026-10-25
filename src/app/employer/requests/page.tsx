import { PageHeader } from '@/components/ui/page-header';
import { RequestInbox } from './request-inbox';

export default function RequestsPage() {
  return (
    <>
      <PageHeader
        title="Solicitudes"
        lead="Empleados que piden una constancia. Revisa cada una contra tu directorio antes de emitir."
      />
      <div className="mt-10">
        <RequestInbox />
      </div>
    </>
  );
}
