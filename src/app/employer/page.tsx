import { PageHeader } from '@/components/ui/page-header';
import { EmployerHome } from './_components/employer-home';

export default function EmployerPage() {
  return (
    <>
      <PageHeader
        title="Empleador"
        lead="Llena el formulario y descarga la constancia en PDF, firmada con la clave de este dispositivo. Quien la reciba la verifica sin llamarte."
      />
      <div className="mt-10">
        <EmployerHome />
      </div>
    </>
  );
}
