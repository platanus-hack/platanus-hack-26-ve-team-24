import { LinkButton } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';

export function SignInFirst() {
  return (
    <Panel title="Primero inicia sesión">
      <LinkButton href="/employer">Iniciar sesión con este dispositivo</LinkButton>
    </Panel>
  );
}
