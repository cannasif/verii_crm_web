export interface ErpCustomer {
  branchCode: number;
  businessUnit: number;
  customerCode: string;
  customerName: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  address: string;
  countryCode?: string;
  website?: string;
  taxNumber?: string;
  taxOffice?: string;
  tckn?: string;
}
