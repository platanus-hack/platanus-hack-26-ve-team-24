import { LinkButton } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';

export function NotInVault() {
  return (
    <Panel title="No está en esta bóveda">
      <p className="mb-4 text-body">Esta constancia no está en este dispositivo.</p>
      <LinkButton href="/vault">Volver a tu bóveda</LinkButton>
    </Panel>
  );
}
