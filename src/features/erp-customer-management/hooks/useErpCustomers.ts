import { useQuery } from '@tanstack/react-query';
import { erpCommonApi } from '@/services/erp-common-api';
import type { CariDto } from '@/services/erp-types';
import type { ErpCustomer } from '../types/erp-customer-types';

const mapToErpCustomer = (data: CariDto[]): ErpCustomer[] => {
  return data.map(item => ({
    branchCode: item.subeKodu,
    businessUnit: item.isletmeKodu,
    customerCode: item.cariKod,
    customerName: item.cariIsim || '',
    phone: item.cariTel || '',
    email: item.email || '',
    city: item.cariIl || '',
    district: item.cariIlce || '',
    address: item.cariAdres || '',
    countryCode: item.ulkeKodu,
    website: item.web,
    taxNumber: item.vergiNumarasi,
    taxOffice: item.vergiDairesi,
    tckn: item.tcknNumber
  }));
};

export const useErpCustomers = (cariKodu?: string | null) => {
  return useQuery({
    queryKey: ['erpCustomers', cariKodu || 'all'],
    queryFn: async () => {
      const data = await erpCommonApi.getCaris(cariKodu);
      return mapToErpCustomer(data);
    },
    staleTime: 5 * 60 * 1000,
  });
};
