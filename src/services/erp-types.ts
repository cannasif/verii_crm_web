export interface ErpCustomer {
  subeKodu: number;
  isletmeKodu: number;
  cariKod: string;
  cariTel: string;
  cariIl: string;
  ulkeKodu: string;
  cariIsim: string;
  cariTip: string;
  grupKodu: string;
  raporKodu1: string;
  raporKodu2: string;
  raporKodu3: string;
  raporKodu4: string;
  raporKodu5: string;
  cariAdres: string;
  cariIlce: string;
  vergiDairesi: string;
  vergiNumarasi: string;
  fax: string;
  postaKodu: string;
  detayKodu: number;
  nakliyeKatsayisi: number;
  riskSiniri: number;
  teminati: number;
  cariRisk: number;
  ccRisk: number;
  saRisk: number;
  scRisk: number;
  cmBorct: number;
  cmAlact: number;
  cmRapTarih: string;
  kosulKodu: string;
  iskontoOrani: number;
  vadeGunu: number;
  listeFiati: number;
  acik1: string;
  acik2: string;
  acik3: string;
  mKod: string;
  dovizTipi: number;
  dovizTuru: number;
  hesapTutmaSekli: string;
  dovizLimi: string;
}

export interface ErpProject {
  projeKod: string;
  projeAciklama: string;
}

export interface ProjeDto {
  projeKod: string;
  projeAciklama: string | null;
}

export interface ErpWarehouse {
  depoKodu: number;
  depoIsmi: string;
}

export interface ErpProduct {
  subeKodu: number;
  isletmeKodu: number;
  stokKodu: string;
  ureticiKodu: string;
  stokAdi: string;
  grupKodu: string;
  grupAdi?: string;
  saticiKodu: string;
  olcuBr1: string;
  olcuBr2: string;
  pay1: number;
  kod1: string;
  kod1Adi?: string;
  kod2: string;
  kod2Adi?: string;
  kod3: string;
  kod4: string;
  kod5: string;
}

export interface BranchErp {
  subeKodu: number;
  unvan: string;
}

export interface CariDto {
  subeKodu: number;
  isletmeKodu: number;
  cariKod: string;
  cariIsim?: string;
  cariTel?: string;
  cariIl?: string;
  cariAdres?: string;
  cariIlce?: string;
  ulkeKodu?: string;
  email?: string;
  web?: string;
  vergiNumarasi?: string;
  vergiDairesi?: string;
  tcknNumber?: string;
}

export interface KurDto {
  dovizTipi: number;
  dovizIsmi: string | null;
  kurDegeri: number | null;
}

export interface StokGroupDto {
  isletmeKodu: number;
  subeKodu: number;
  grupKodu: string | null;
  grupAdi: string | null;
}
