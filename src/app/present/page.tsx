import { PageHeader } from '@/components/ui/page-header';
import { PresentView } from './present-view';

export default function PresentPage() {
  return (
    <>
      <PageHeader
        title="Comparte solo lo que elijas."
        lead="Carga el PDF de tu constancia, marca los datos que quieres mostrar y genera una presentación. Lo que no marques no viaja en el archivo, ni cifrado, y aun así quien lo reciba puede comprobar que lo firmó tu empleador."
      />
      <div className="mt-10">
        <PresentView />
      </div>
    </>
  );
}
