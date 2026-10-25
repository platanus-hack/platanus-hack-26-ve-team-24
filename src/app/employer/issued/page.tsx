import { PageHeader } from '@/components/ui/page-header';
import { IssuedList } from './issued-list';

export default function IssuedPage() {
  return (
    <>
      <PageHeader
        title="Constancias emitidas"
        lead="Constancias emitidas desde este dispositivo. Si revocas una, falla la comprobación del registro para quien la tenga."
      />
      <div className="mt-10">
        <IssuedList />
      </div>
    </>
  );
}
