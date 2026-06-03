export interface NetsisOrderHeader {
  subeKodu: number;
  fatirsNo: string;
  cariKodu: string;
  cariIsim: string;
  tarih: string;
  teslimTarihi: string;
  brutTutar: number;
  kdv: number;
  genelToplam: number;
  plasiyerKodu: string;
}

export interface NetsisOrderLine {
  subeKodu: number;
  fatirsNo: string;
  sira: number;
  stokKodu: string;
  stokAdi: string;
  miktar: number;
  olcuBr1: string;
  netFiyat: number;
  kdvOrani: number;
  depoKodu: number;
}
