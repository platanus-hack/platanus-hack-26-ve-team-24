import { PageHeader } from '@/components/ui/page-header';
import { JoinView } from './join-view';

export default function JoinPage() {
  return (
    <>
      <PageHeader
        title="Une tus constancias en un historial."
        lead="Carga los PDF que te dieron tus empleadores. Se comprueba que sean de la misma persona y que cada una sea auténtica, y se sellan juntas en un solo historial que nadie puede ampliar ni recortar."
      />
      <div className="mt-10">
        <JoinView />
      </div>
    </>
  );
}
