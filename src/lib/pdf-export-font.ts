import { resolveAppPath } from '@/lib/api-config';
import type { jsPDF } from 'jspdf';

const PDF_FONT_CANDIDATES = [
  {
    path: '/fonts/arial.ttf',
    vfsName: 'GridExportArial.ttf',
    fontName: 'GridExportArial',
  },
  {
    path: '/fonts/Montserrat-Regular.ttf',
    vfsName: 'GridExportMontserrat.ttf',
    fontName: 'GridExportMontserrat',
  },
] as const;

export async function registerPdfExportFont(doc: jsPDF): Promise<string> {
  for (const candidate of PDF_FONT_CANDIDATES) {
    try {
      const response = await fetch(resolveAppPath(candidate.path), { cache: 'force-cache' });
      if (!response.ok) {
        continue;
      }

      const fontBytes = await response.arrayBuffer();
      const fontBinary = Array.from(new Uint8Array(fontBytes), (byte) => String.fromCharCode(byte)).join('');
      doc.addFileToVFS(candidate.vfsName, fontBinary);
      doc.addFont(candidate.vfsName, candidate.fontName, 'normal');
      doc.addFont(candidate.vfsName, candidate.fontName, 'bold');
      doc.setFont(candidate.fontName, 'normal');
      return candidate.fontName;
    } catch {
      continue;
    }
  }

  doc.setFont('helvetica', 'normal');
  return 'helvetica';
}
