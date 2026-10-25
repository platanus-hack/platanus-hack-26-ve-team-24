import type { Metadata } from 'next';
import { HolderShell } from '@/components/ui/holder-shell';

export const metadata: Metadata = { title: 'Unificar constancias · Constancia' };

export default function Layout({ children }: LayoutProps<'/join'>) {
  return <HolderShell>{children}</HolderShell>;
}
