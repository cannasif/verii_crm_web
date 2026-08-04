import type { DropdownSearchFieldOption } from './DropdownSearchFieldSelector';

export const STOCK_DROPDOWN_DEFAULT_SEARCH_FIELDS = ['ErpStockCode', 'StockName'] as const;
export const STOCK_DROPDOWN_SEARCH_FIELD_OPTIONS: readonly DropdownSearchFieldOption[] = [
  { key: 'Id', label: 'Kayıt ID' },
  { key: 'ErpStockCode', label: 'Stok kodu' }, { key: 'StockName', label: 'Stok adı' },
  { key: 'EnglishStockName', label: 'İngilizce stok adı' }, { key: 'UreticiKodu', label: 'Üretici kodu' },
  { key: 'Unit', label: 'Birim' },
  { key: 'GrupKodu', label: 'Grup kodu' }, { key: 'GrupAdi', label: 'Grup adı' },
  { key: 'Kod1', label: 'Kod 1' }, { key: 'Kod1Adi', label: 'Kod 1 adı' },
  { key: 'Kod2', label: 'Kod 2' }, { key: 'Kod2Adi', label: 'Kod 2 adı' },
  { key: 'Kod3', label: 'Kod 3' }, { key: 'Kod3Adi', label: 'Kod 3 adı' },
  { key: 'Kod4', label: 'Kod 4' }, { key: 'Kod4Adi', label: 'Kod 4 adı' },
  { key: 'Kod5', label: 'Kod 5' }, { key: 'Kod5Adi', label: 'Kod 5 adı' },
];
export const STOCK_DROPDOWN_AVAILABLE_SEARCH_FIELDS = STOCK_DROPDOWN_SEARCH_FIELD_OPTIONS.map((option) => option.key);

export const CUSTOMER_DROPDOWN_DEFAULT_SEARCH_FIELDS = ['CustomerCode', 'CustomerName'] as const;
export const CUSTOMER_DROPDOWN_SEARCH_FIELD_OPTIONS: readonly DropdownSearchFieldOption[] = [
  { key: 'Id', label: 'Kayıt ID' },
  { key: 'CustomerCode', label: 'Müşteri kodu' }, { key: 'CustomerName', label: 'Müşteri adı' },
  { key: 'Email', label: 'E-posta' }, { key: 'Phone1', label: 'Telefon' },
  { key: 'Phone2', label: 'Telefon 2' }, { key: 'TaxNumber', label: 'Vergi no' },
  { key: 'TcknNumber', label: 'TCKN' }, { key: 'TaxOffice', label: 'Vergi dairesi' },
  { key: 'SalesRepCode', label: 'Plasiyer kodu' }, { key: 'GroupCode', label: 'Grup kodu' },
  { key: 'AccountingCode', label: 'Muhasebe kodu' }, { key: 'Website', label: 'Web sitesi' },
  { key: 'Address', label: 'Adres' }, { key: 'PostalCode', label: 'Posta kodu' },
  { key: 'Country.Name', label: 'Ülke' }, { key: 'City.Name', label: 'Şehir' },
  { key: 'District.Name', label: 'İlçe' }, { key: 'CustomerType.Name', label: 'Müşteri tipi' },
  { key: 'Notes', label: 'Notlar' },
];
export const CUSTOMER_DROPDOWN_AVAILABLE_SEARCH_FIELDS = CUSTOMER_DROPDOWN_SEARCH_FIELD_OPTIONS.map((option) => option.key);
