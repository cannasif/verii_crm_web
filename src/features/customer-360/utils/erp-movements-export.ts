import type { GridExportColumn } from '@/lib/grid-export';
import type { Customer360ErpMovementDto, Customer360ErpMovementLineDto } from '../types/customer360.types';

type TranslateFn = (key: string) => string;

export function buildErpMovementsExportColumns(tc: TranslateFn): GridExportColumn[] {
  return [
    { key: 'tarih', label: tc('erpMovements.columns.date') },
    { key: 'vadeTarihi', label: tc('erpMovements.columns.dueDate') },
    { key: 'belgeNo', label: tc('erpMovements.columns.documentNo') },
    { key: 'aciklama', label: tc('erpMovements.columns.description') },
    { key: 'paraBirimi', label: tc('erpMovements.columns.currency') },
    { key: 'borc', label: tc('erpMovements.columns.debit') },
    { key: 'alacak', label: tc('erpMovements.columns.credit') },
    { key: 'tarihSiraliTlBakiye', label: tc('erpMovements.columns.tlBalanceByDate') },
    { key: 'vadeSiraliTlBakiye', label: tc('erpMovements.columns.tlBalanceByDueDate') },
    { key: 'dovizBorc', label: tc('erpMovements.columns.fxDebit') },
    { key: 'dovizAlacak', label: tc('erpMovements.columns.fxCredit') },
    { key: 'tarihSiraliDovizBakiye', label: tc('erpMovements.columns.fxBalanceByDate') },
    { key: 'vadeSiraliDovizBakiye', label: tc('erpMovements.columns.fxBalanceByDueDate') },
  ];
}

export function buildErpMovementsExportRows(
  movements: Customer360ErpMovementDto[]
): Record<string, unknown>[] {
  return movements.map((row) => ({
    tarih: row.tarih ?? '',
    vadeTarihi: row.vadeTarihi ?? '',
    belgeNo: row.belgeNo ?? '',
    aciklama: row.aciklama ?? '',
    paraBirimi: row.paraBirimi ?? '',
    borc: row.borc,
    alacak: row.alacak,
    tarihSiraliTlBakiye: row.tarihSiraliTlBakiye,
    vadeSiraliTlBakiye: row.vadeSiraliTlBakiye,
    dovizBorc: row.dovizBorc,
    dovizAlacak: row.dovizAlacak,
    tarihSiraliDovizBakiye: row.tarihSiraliDovizBakiye,
    vadeSiraliDovizBakiye: row.vadeSiraliDovizBakiye,
  }));
}

export function buildErpMovementsExportFileName(cariKod?: string | null): string {
  const sanitizedCode = (cariKod ?? 'cari').trim().replace(/[^\w.-]+/g, '_') || 'cari';
  return `cari-hareketleri-${sanitizedCode}`;
}

export function buildErpMovementLinesExportColumns(tc: TranslateFn): GridExportColumn[] {
  return [
    { key: 'stokKodu', label: tc('erpMovements.detail.columns.stockCode') },
    { key: 'stokAdi', label: tc('erpMovements.detail.columns.stockName') },
    { key: 'miktar', label: tc('erpMovements.detail.columns.quantity') },
    { key: 'brutFiyat', label: tc('erpMovements.detail.columns.grossPrice') },
    { key: 'netFiyat', label: tc('erpMovements.detail.columns.netPrice') },
    { key: 'brutSatisTutari', label: tc('erpMovements.detail.columns.grossAmount') },
    { key: 'iskontoTutari', label: tc('erpMovements.detail.columns.discountAmount') },
    { key: 'kdvTutari', label: tc('erpMovements.detail.columns.vatAmount') },
    { key: 'tutar', label: tc('erpMovements.detail.columns.total') },
    { key: 'dovizliFiyat', label: tc('erpMovements.detail.columns.fxPrice') },
    { key: 'dovizliTutar', label: tc('erpMovements.detail.columns.fxAmount') },
  ];
}

export function buildErpMovementLinesExportRows(
  lines: Customer360ErpMovementLineDto[]
): Record<string, unknown>[] {
  return lines.map((line) => ({
    stokKodu: line.stokKodu ?? '',
    stokAdi: line.stokAdi ?? '',
    miktar: line.miktar,
    brutFiyat: line.brutFiyat,
    netFiyat: line.netFiyat,
    brutSatisTutari: line.brutSatisTutari,
    iskontoTutari: line.iskontoTutari,
    kdvTutari: line.kdvTutari,
    tutar: line.tutar,
    dovizliFiyat: line.dovizliFiyat,
    dovizliTutar: line.dovizliTutar,
  }));
}

export function buildErpMovementLinesExportFileName(documentNo?: string | null): string {
  const sanitizedDocumentNo = (documentNo ?? 'belge').trim().replace(/[^\w.-]+/g, '_') || 'belge';
  return `belge-kalemleri-${sanitizedDocumentNo}`;
}
