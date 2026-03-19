import type { PdfTableColumn, PdfTableOptions } from '../types/pdf-report-template.types';

export interface PdfTablePresetDefinition {
  key: string;
  label: string;
  ruleTypes?: Array<'quotation' | 'demand' | 'order'>;
  columns: PdfTableColumn[];
  tableOptions?: PdfTableOptions;
}

export const PDF_TABLE_PRESETS: PdfTablePresetDefinition[] = [
  {
    key: 'quotation-lines-default',
    label: 'Teklif satirlari',
    ruleTypes: ['quotation'],
    columns: [
      { label: 'Gorsel', path: 'Lines.ImageUrl', width: 72, align: 'center', format: 'image' },
      { label: 'Stok Kodu', path: 'Lines.ProductCode', width: 92, align: 'left', format: 'text' },
      { label: 'Aciklama', path: 'Lines.ProductName', align: 'left', format: 'text' },
      { label: 'Miktar', path: 'Lines.Quantity', width: 70, align: 'right', format: 'number' },
      { label: 'Birim Fiyat', path: 'Lines.UnitPrice', width: 96, align: 'right', format: 'currency' },
      { label: 'Net Toplam', path: 'Lines.LineTotal', width: 104, align: 'right', format: 'currency' },
    ],
    tableOptions: {
      repeatHeader: true,
      dense: true,
      showBorders: true,
      presetName: 'quotation-lines-default',
    },
  },
  {
    key: 'demand-lines-default',
    label: 'Talep satirlari',
    ruleTypes: ['demand'],
    columns: [
      { label: 'Kod', path: 'Lines.ProductCode', width: 100, align: 'left', format: 'text' },
      { label: 'Urun', path: 'Lines.ProductName', align: 'left', format: 'text' },
      { label: 'Miktar', path: 'Lines.Quantity', width: 80, align: 'right', format: 'number' },
      { label: 'Birim', path: 'Lines.Unit', width: 72, align: 'center', format: 'text' },
    ],
    tableOptions: {
      repeatHeader: true,
      dense: false,
      showBorders: true,
      presetName: 'demand-lines-default',
    },
  },
  {
    key: 'order-lines-default',
    label: 'Siparis satirlari',
    ruleTypes: ['order'],
    columns: [
      { label: 'Kod', path: 'Lines.ProductCode', width: 100, align: 'left', format: 'text' },
      { label: 'Aciklama', path: 'Lines.ProductName', align: 'left', format: 'text' },
      { label: 'Miktar', path: 'Lines.Quantity', width: 80, align: 'right', format: 'number' },
      { label: 'Birim Fiyat', path: 'Lines.UnitPrice', width: 96, align: 'right', format: 'currency' },
      { label: 'Toplam', path: 'Lines.LineTotal', width: 104, align: 'right', format: 'currency' },
    ],
    tableOptions: {
      repeatHeader: true,
      dense: true,
      showBorders: true,
      presetName: 'order-lines-default',
    },
  },
];

export function getPdfTablePreset(key: string): PdfTablePresetDefinition | undefined {
  return PDF_TABLE_PRESETS.find((preset) => preset.key === key);
}
