import { getLineUnitDiscountBreakdown } from '@/lib/line-discount-display';

export interface DocumentLineTableExportSource {
  productCode?: string | null;
  productName?: string | null;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  discountRate1: number;
  discountRate2: number;
  discountRate3: number;
  lineTotal: number;
  description?: string | null;
  description1?: string | null;
  description2?: string | null;
  description3?: string | null;
  projectCode?: string | null;
  profilDefinitionId?: number | null;
  demirDefinitionId?: number | null;
  vidaDefinitionId?: number | null;
  baskiDefinitionId?: number | null;
}

export interface DocumentLineTableExportLabels {
  productCode: string;
  productName: string;
  unit: string;
  description: string;
  description1: string;
  description2: string;
  description3: string;
  projectCode: string;
  profil: string;
  demir: string;
  vida: string;
  baski: string;
  unitPrice: string;
  discountedUnitPrice: string;
  quantity: string;
  discount1: string;
  discount2: string;
  discount3: string;
  netPrice: string;
}

type TranslateFn = (key: string, options?: { defaultValue?: string }) => string;

export interface WindoDefinitionMaps {
  profilMap?: Record<number, string>;
  demirMap?: Record<number, string>;
  vidaMap?: Record<number, string>;
  baskiMap?: Record<number, string>;
}

export interface DocumentLineTableExportLine {
  productCode: string;
  productName: string;
  unit: string;
  description: string;
  description1: string;
  description2: string;
  description3: string;
  projectCode: string;
  profil: string;
  demir: string;
  vida: string;
  baski: string;
  unitPrice: string;
  discountedUnitPrice: string;
  quantity: string;
  discount1: string;
  discount2: string;
  discount3: string;
  netPrice: string;
}

export interface BuildDocumentLineTableExportParams {
  lines: DocumentLineTableExportSource[];
  labels: DocumentLineTableExportLabels;
  currencyCode: string;
  formatCurrency: (amount: number, currencyCode: string) => string;
  windoMaps?: WindoDefinitionMaps;
}

function resolveWindoLabel(
  id: number | null | undefined,
  map: Record<number, string> | undefined,
): string {
  if (id == null) return '';
  if (map?.[id]) return map[id];
  return `#${id}`;
}

function formatDiscountRate(rate: number): string {
  return `%${rate ?? 0}`;
}

export function mapToDocumentLineTableExportLine(
  line: DocumentLineTableExportSource,
  params: Pick<BuildDocumentLineTableExportParams, 'currencyCode' | 'formatCurrency' | 'windoMaps'>,
): DocumentLineTableExportLine {
  const breakdown = getLineUnitDiscountBreakdown(
    line.unitPrice,
    line.discountRate1,
    line.discountRate2,
    line.discountRate3,
  );

  return {
    productCode: line.productCode?.trim() ?? '',
    productName: line.productName?.trim() ?? '',
    unit: line.unit?.trim() ?? '',
    description: line.description?.trim() ?? '',
    description1: line.description1?.trim() ?? '',
    description2: line.description2?.trim() ?? '',
    description3: line.description3?.trim() ?? '',
    projectCode: line.projectCode?.trim() ?? '',
    profil: resolveWindoLabel(line.profilDefinitionId, params.windoMaps?.profilMap),
    demir: resolveWindoLabel(line.demirDefinitionId, params.windoMaps?.demirMap),
    vida: resolveWindoLabel(line.vidaDefinitionId, params.windoMaps?.vidaMap),
    baski: resolveWindoLabel(line.baskiDefinitionId, params.windoMaps?.baskiMap),
    unitPrice: params.formatCurrency(line.unitPrice, params.currencyCode),
    discountedUnitPrice: params.formatCurrency(breakdown.discountedUnitPrice, params.currencyCode),
    quantity: String(line.quantity ?? 0),
    discount1: formatDiscountRate(line.discountRate1),
    discount2: formatDiscountRate(line.discountRate2),
    discount3: formatDiscountRate(line.discountRate3),
    netPrice: params.formatCurrency(line.lineTotal, params.currencyCode),
  };
}

export function buildDocumentLineTableExportLabels(
  t: TranslateFn,
  keyPrefix = 'lines',
): DocumentLineTableExportLabels {
  const label = (key: string, defaultValue: string): string =>
    t(`${keyPrefix}.${key}`, { defaultValue });

  return {
    productCode: label('productCode', 'Stok Kodu'),
    productName: label('productName', 'Stok Adı'),
    unit: label('unit', 'Birim'),
    description: label('description', 'Açıklama'),
    description1: label('descriptionField1Label', 'Açıklama 1'),
    description2: label('descriptionField2Label', 'Açıklama 2'),
    description3: label('descriptionField3Label', 'Açıklama 3'),
    projectCode: label('projectCode', 'Proje Kodu'),
    profil: label('windoProfileLabel', 'Profil'),
    demir: label('windoRebarLabel', 'Demir'),
    vida: label('windoScrewLabel', 'Vida'),
    baski: label('windoPrintLabel', 'Baskı'),
    unitPrice: label('unitPrice', 'Birim Fiyat'),
    discountedUnitPrice: label('discountedUnitPrice', 'İndirimli Birim Fiyat'),
    quantity: label('quantity', 'Miktar'),
    discount1: label('discount1', 'İndirim 1 %'),
    discount2: label('discount2', 'İndirim 2 %'),
    discount3: label('discount3', 'İndirim 3 %'),
    netPrice: label('netPrice', 'Net Fiyat'),
  };
}

function getExportColumnOrder(): Array<keyof DocumentLineTableExportLine> {
  return [
    'productCode',
    'productName',
    'unit',
    'description1',
    'description2',
    'description3',
    'profil',
    'demir',
    'vida',
    'baski',
    'description',
    'projectCode',
    'unitPrice',
    'discountedUnitPrice',
    'quantity',
    'discount1',
    'discount2',
    'discount3',
    'netPrice',
  ];
}

export function buildDocumentLineTableExportData(
  params: BuildDocumentLineTableExportParams,
): {
  headers: string[];
  rows: string[][];
  excelRows: Record<string, string | number>[];
} {
  const { labels } = params;
  const columnKeys = getExportColumnOrder();
  const headers = columnKeys.map((key) => labels[key]);

  const mappedLines = params.lines.map((line) =>
    mapToDocumentLineTableExportLine(line, params),
  );

  const rows = mappedLines.map((line) => columnKeys.map((key) => line[key]));

  const excelRows = mappedLines.map((line) => {
    const record: Record<string, string | number> = {};
    columnKeys.forEach((key, index) => {
      record[headers[index]] = line[key];
    });
    return record;
  });

  return { headers, rows, excelRows };
}

export async function exportDocumentLineTablePdf(params: {
  fileName: string;
  title: string;
  exportData: ReturnType<typeof buildDocumentLineTableExportData>;
}): Promise<void> {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(16);
  doc.text(params.title, 14, 18);

  autoTable(doc, {
    startY: 24,
    head: [params.exportData.headers],
    body: params.exportData.rows,
    styles: { font: 'helvetica', fontStyle: 'normal', fontSize: 7 },
    headStyles: { fillColor: [52, 90, 153], fontSize: 7 },
    theme: 'grid',
  });

  doc.save(params.fileName);
}

export async function exportDocumentLineTablePowerPoint(params: {
  fileName: string;
  title: string;
  exportData: ReturnType<typeof buildDocumentLineTableExportData>;
}): Promise<void> {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  const slide = pptx.addSlide();

  slide.addText(params.title, { x: 0.3, y: 0.2, w: '95%', fontSize: 18, bold: true });

  const tableData = [
    params.exportData.headers.map((text) => ({
      text,
      options: { bold: true, fill: 'F0F0F0', fontSize: 7 },
    })),
    ...params.exportData.rows.map((row) =>
      row.map((text) => ({ text, options: { fontSize: 7 } })),
    ),
  ];

  slide.addTable(tableData, {
    x: 0.2,
    y: 0.7,
    w: 9.6,
    colW: Array(params.exportData.headers.length).fill(9.6 / params.exportData.headers.length),
    fontSize: 7,
  });

  await pptx.writeFile({ fileName: params.fileName });
}
