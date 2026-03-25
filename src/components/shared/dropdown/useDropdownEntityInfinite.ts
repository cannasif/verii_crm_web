import { useMemo } from 'react';
import { useDropdownInfiniteSearch } from '@/hooks/useDropdownInfiniteSearch';
import { dropdownApi } from './dropdown-api';
import { DROPDOWN_MIN_CHARS, DROPDOWN_PAGE_SIZE } from './constants';
import type { ComboboxOption } from '@/components/shared/VoiceSearchCombobox';
import type { CustomerDto } from '@/features/customer-management/types/customer-types';
import type { CountryDto } from '@/features/country-management/types/country-types';
import type { CityDto } from '@/features/city-management/types/city-types';
import type { DistrictDto } from '@/features/district-management/types/district-types';
import type { UserDto } from '@/features/user-management/types/user-types';
import type { ApprovalRoleDto } from '@/features/approval-role-management/types/approval-role-types';
import type { ApprovalRoleGroupDto } from '@/features/approval-role-group-management/types/approval-role-group-types';
import type { TitleDto } from '@/features/title-management/types/title-types';
import type { CustomerTypeDto } from '@/features/customer-type-management/types/customer-type-types';
import type { ActivityTypeDto } from '@/features/activity-type/types/activity-type-types';
import type { PaymentTypeDto } from '@/features/payment-type-management/types/payment-type-types';
import type { SalesTypeGetDto } from '@/features/sales-type-management/types/sales-type-types';

function toCustomerOptions(items: CustomerDto[]): ComboboxOption[] {
  return items.map((c) => ({ value: c.id.toString(), label: c.name }));
}

function toCountryOptions(items: CountryDto[]): ComboboxOption[] {
  return items.map((c) => ({ value: c.id.toString(), label: c.name }));
}

function toCityOptions(items: CityDto[]): ComboboxOption[] {
  return items.map((c) => ({ value: c.id.toString(), label: c.name }));
}

function toDistrictOptions(items: DistrictDto[]): ComboboxOption[] {
  return items.map((d) => ({ value: d.id.toString(), label: d.name }));
}

function toUserOptions(items: UserDto[]): ComboboxOption[] {
  return items.map((u) => ({
    value: u.id.toString(),
    label: u.fullName?.trim() || u.username || u.email,
  }));
}

function toApprovalRoleOptions(items: ApprovalRoleDto[]): ComboboxOption[] {
  return items.map((r) => ({
    value: r.id.toString(),
    label: r.approvalRoleGroupName ? `${r.name} (${r.approvalRoleGroupName})` : r.name,
  }));
}

function toApprovalRoleGroupOptions(items: ApprovalRoleGroupDto[]): ComboboxOption[] {
  return items.map((g) => ({ value: g.id.toString(), label: g.name }));
}

function toTitleOptions(items: TitleDto[]): ComboboxOption[] {
  return items.map((t) => ({ value: t.id.toString(), label: t.titleName }));
}

function toCustomerTypeOptions(items: CustomerTypeDto[]): ComboboxOption[] {
  return items.map((c) => ({ value: c.id.toString(), label: c.name }));
}

function toActivityTypeOptions(items: ActivityTypeDto[]): ComboboxOption[] {
  return items.map((a) => ({ value: a.id.toString(), label: a.name }));
}

function toPaymentTypeOptions(items: PaymentTypeDto[]): ComboboxOption[] {
  return items.map((p) => ({ value: p.id.toString(), label: p.name }));
}

function toSalesTypeOptions(items: SalesTypeGetDto[]): ComboboxOption[] {
  return items.map((s) => ({ value: s.id.toString(), label: s.name }));
}

const COMMON_BUILD_FILTERS = (column: string) => (term: string) =>
  term ? [{ column, operator: 'contains', value: term }] : undefined;

export function useCustomerOptionsInfinite(searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<CustomerDto>({
    entityKey: 'customers',
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Name',
    sortDirection: 'asc',
    buildFilters: COMMON_BUILD_FILTERS('name'),
    fetchPage: dropdownApi.getCustomerPage,
  });
  const options = useMemo(() => toCustomerOptions(result.items), [result.items]);
  return { ...result, options };
}

export function useCountryOptionsInfinite(searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<CountryDto>({
    entityKey: 'countries',
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Name',
    sortDirection: 'asc',
    buildFilters: COMMON_BUILD_FILTERS('name'),
    fetchPage: dropdownApi.getCountryPage,
  });
  const options = useMemo(() => toCountryOptions(result.items), [result.items]);
  return { ...result, options };
}

export function useCityOptionsInfinite(searchTerm: string, enabled = true, countryId?: number) {
  const result = useDropdownInfiniteSearch<CityDto>({
    entityKey: ['cities', countryId ?? 'all'],
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Name',
    sortDirection: 'asc',
    filterLogic: 'and',
    buildFilters: (term) => {
      const filters: { column: string; operator: string; value: string }[] = [];
      if (countryId && countryId > 0) {
        filters.push({ column: 'countryId', operator: 'eq', value: countryId.toString() });
      }
      if (term) {
        filters.push({ column: 'name', operator: 'contains', value: term });
      }
      return filters.length > 0 ? filters : undefined;
    },
    fetchPage: dropdownApi.getCityPage,
  });
  const options = useMemo(() => toCityOptions(result.items), [result.items]);
  return { ...result, options };
}

export function useDistrictOptionsInfinite(searchTerm: string, enabled = true, cityId?: number) {
  const result = useDropdownInfiniteSearch<DistrictDto>({
    entityKey: ['districts', cityId ?? 'all'],
    searchTerm,
    enabled: enabled && !!cityId && cityId > 0,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Name',
    sortDirection: 'asc',
    filterLogic: 'and',
    buildFilters: (term) => {
      const filters: { column: string; operator: string; value: string }[] = [];
      if (cityId && cityId > 0) {
        filters.push({ column: 'cityId', operator: 'eq', value: cityId.toString() });
      }
      if (term) {
        filters.push({ column: 'name', operator: 'contains', value: term });
      }
      return filters.length > 0 ? filters : undefined;
    },
    fetchPage: dropdownApi.getDistrictPage,
  });
  const options = useMemo(() => toDistrictOptions(result.items), [result.items]);
  return { ...result, options };
}

export function useUserOptionsInfinite(searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<UserDto>({
    entityKey: 'users',
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'asc',
    filterLogic: 'or',
    buildFilters: COMMON_BUILD_FILTERS('fullName'),
    fetchPage: dropdownApi.getUserPage,
  });
  const options = useMemo(() => toUserOptions(result.items), [result.items]);
  return { ...result, options };
}

export function useApprovalRoleOptionsInfinite(searchTerm: string, enabled = true, roleGroupId?: number) {
  const result = useDropdownInfiniteSearch<ApprovalRoleDto>({
    entityKey: ['approvalRoles', roleGroupId ?? 'all'],
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'asc',
    filterLogic: 'and',
    buildFilters: (term) => {
      const filters: { column: string; operator: string; value: string }[] = [];
      if (roleGroupId && roleGroupId > 0) {
        filters.push({ column: 'approvalRoleGroupId', operator: 'eq', value: roleGroupId.toString() });
      }
      if (term) {
        filters.push({ column: 'name', operator: 'contains', value: term });
      }
      return filters.length > 0 ? filters : undefined;
    },
    fetchPage: dropdownApi.getApprovalRolePage,
  });
  const options = useMemo(() => toApprovalRoleOptions(result.items), [result.items]);
  return { ...result, options };
}

export function useApprovalRoleGroupOptionsInfinite(searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<ApprovalRoleGroupDto>({
    entityKey: 'approvalRoleGroups',
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'asc',
    buildFilters: COMMON_BUILD_FILTERS('name'),
    fetchPage: dropdownApi.getApprovalRoleGroupPage,
  });
  const options = useMemo(() => toApprovalRoleGroupOptions(result.items), [result.items]);
  return { ...result, options };
}

export function useTitleOptionsInfinite(searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<TitleDto>({
    entityKey: 'titles',
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'asc',
    buildFilters: (term) =>
      term ? [{ column: 'titleName', operator: 'contains', value: term }] : undefined,
    fetchPage: dropdownApi.getTitlePage,
  });
  const options = useMemo(() => toTitleOptions(result.items), [result.items]);
  return { ...result, options };
}

export function useCustomerTypeOptionsInfinite(searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<CustomerTypeDto>({
    entityKey: 'customerTypes',
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'asc',
    buildFilters: COMMON_BUILD_FILTERS('name'),
    fetchPage: dropdownApi.getCustomerTypePage,
  });
  const options = useMemo(() => toCustomerTypeOptions(result.items), [result.items]);
  return { ...result, options };
}

export function useActivityTypeOptionsInfinite(searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<ActivityTypeDto>({
    entityKey: 'activityTypes',
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'asc',
    buildFilters: COMMON_BUILD_FILTERS('name'),
    fetchPage: dropdownApi.getActivityTypePage,
  });
  const options = useMemo(() => toActivityTypeOptions(result.items), [result.items]);
  return { ...result, options };
}

export function usePaymentTypeOptionsInfinite(searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<PaymentTypeDto>({
    entityKey: 'paymentTypes',
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Name',
    sortDirection: 'asc',
    buildFilters: COMMON_BUILD_FILTERS('name'),
    fetchPage: dropdownApi.getPaymentTypePage,
  });
  const options = useMemo(() => toPaymentTypeOptions(result.items), [result.items]);
  return { ...result, options };
}

export function useActivityMeetingTypeOptionsInfinite(searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<ActivityTypeDto>({
    entityKey: 'activityMeetingTypes',
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'asc',
    buildFilters: COMMON_BUILD_FILTERS('name'),
    fetchPage: dropdownApi.getActivityMeetingTypePage,
  });
  const options = useMemo(() => toActivityTypeOptions(result.items), [result.items]);
  return { ...result, options };
}

export function useActivityTopicPurposeOptionsInfinite(searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<ActivityTypeDto>({
    entityKey: 'activityTopicPurposes',
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'asc',
    buildFilters: COMMON_BUILD_FILTERS('name'),
    fetchPage: dropdownApi.getActivityTopicPurposePage,
  });
  const options = useMemo(() => toActivityTypeOptions(result.items), [result.items]);
  return { ...result, options };
}

export function useActivityShippingOptionsInfinite(searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<ActivityTypeDto>({
    entityKey: 'activityShippings',
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'asc',
    buildFilters: COMMON_BUILD_FILTERS('name'),
    fetchPage: dropdownApi.getActivityShippingPage,
  });
  const options = useMemo(() => toActivityTypeOptions(result.items), [result.items]);
  return { ...result, options };
}

export function useSalesTypeOptionsInfinite(
  searchTerm: string,
  enabled = true,
  offerType?: string | null
) {
  const result = useDropdownInfiniteSearch<SalesTypeGetDto>({
    entityKey: ['salesTypes', offerType ?? 'all'],
    searchTerm,
    enabled: enabled && !!offerType,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'asc',
    filterLogic: 'and',
    buildFilters: (term) => {
      const filters: { column: string; operator: string; value: string }[] = [];
      if (offerType) {
        filters.push({ column: 'salesType', operator: 'equals', value: offerType });
      }
      if (term) {
        filters.push({ column: 'name', operator: 'contains', value: term });
      }
      return filters.length > 0 ? filters : undefined;
    },
    fetchPage: dropdownApi.getSalesTypePage,
  });
  const options = useMemo(() => toSalesTypeOptions(result.items), [result.items]);
  return { ...result, options };
}
