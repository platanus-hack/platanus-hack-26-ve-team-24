import type { Metadata } from 'next';
import { HolderShell } from '../vault/_components/holder-shell';

export const metadata: Metadata = { title: 'CV verificado · Constancia' };

export default function CvLayout({ children }: LayoutProps<'/cv'>) {
  return <HolderShell>{children}</HolderShell>;
}
