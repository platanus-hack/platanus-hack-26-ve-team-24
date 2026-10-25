import type { Metadata } from 'next';
import { HolderShell } from '@/components/ui/holder-shell';

export const metadata: Metadata = { title: 'Compartir solo una parte · Constancia' };

export default function Layout({ children }: LayoutProps<'/present'>) {
  return <HolderShell>{children}</HolderShell>;
}
