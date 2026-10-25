import { PageHeader } from '@/components/ui/page-header';
import { Onboarding } from './onboarding';

export default function OnboardingPage() {
  return (
    <>
      <PageHeader
        title="Configura tu organización"
        lead="Crea una clave de firma en este dispositivo y pide al consorcio que te acredite. Podrás emitir cuando aprueben suficientes miembros."
      />
      <div className="mt-10">
        <Onboarding />
      </div>
    </>
  );
}
