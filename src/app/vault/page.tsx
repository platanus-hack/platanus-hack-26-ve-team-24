import { PageHeader } from '@/components/ui/page-header';
import { VaultHome } from './_components/vault-home';

export default function VaultPage() {
  return (
    <>
      <PageHeader
        title="Tu bóveda"
        lead="Tu bóveda vive en este navegador. Las claves se crean aquí y nunca salen de él."
      />
      <div className="mt-10">
        <VaultHome />
      </div>
    </>
  );
}
