import { PageHeader } from '@/components/ui/page-header';
import { EmployerHome } from './_components/employer-home';

export default function EmployerPage() {
  return (
    <>
      <PageHeader
        title="Empleador"
        lead="Emite constancias de trabajo que se prueban solas. Tu clave de firma no sale de este dispositivo."
      />
      <div className="mt-10">
        <EmployerHome />
      </div>
    </>
  );
}
