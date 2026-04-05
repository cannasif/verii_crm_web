import { type ReactElement, type ReactNode } from 'react';
import { MANAGEMENT_DATA_GRID_CLASSNAME } from '@/lib/management-list-layout';

/** Müşteri listesiyle aynı tablo kenarlık / thead / satır hover stilleri. */
export function ManagementDataTableChrome({ children }: { children: ReactNode }): ReactElement {
  return <div className={MANAGEMENT_DATA_GRID_CLASSNAME}>{children}</div>;
}
