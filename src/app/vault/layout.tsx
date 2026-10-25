import type { Metadata } from 'next';
import { HolderShell } from './_components/holder-shell';

export const metadata: Metadata = { title: 'Tu bóveda · Constancia' };

export default function VaultLayout({ children }: LayoutProps<'/vault'>) {
  return <HolderShell>{children}</HolderShell>;
}
