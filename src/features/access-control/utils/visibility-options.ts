export const VISIBILITY_SCOPE_OPTIONS = [
  { value: 1, labelKey: 'visibilityPolicies.scope.self', fallback: 'Sadece kendisi' },
  { value: 2, labelKey: 'visibilityPolicies.scope.managerHierarchy', fallback: 'Yönetici hiyerarşisi' },
  { value: 3, labelKey: 'visibilityPolicies.scope.permissionGroup', fallback: 'İzin grubu' },
  { value: 4, labelKey: 'visibilityPolicies.scope.company', fallback: 'Şirket geneli' },
] as const;

export const VISIBILITY_ENTITY_OPTIONS = [
  { value: 'Activity', labelKey: 'visibilityPolicies.entity.activity', fallback: 'Aktivite' },
  { value: 'Quotation', labelKey: 'visibilityPolicies.entity.quotation', fallback: 'Teklif' },
  { value: 'Demand', labelKey: 'visibilityPolicies.entity.demand', fallback: 'Talep' },
  { value: 'Order', labelKey: 'visibilityPolicies.entity.order', fallback: 'Sipariş' },
] as const;

export function getVisibilityScopeMeta(scopeType: number): (typeof VISIBILITY_SCOPE_OPTIONS)[number] | undefined {
  return VISIBILITY_SCOPE_OPTIONS.find((item) => item.value === scopeType);
}

export function getVisibilityEntityMeta(entityType: string): (typeof VISIBILITY_ENTITY_OPTIONS)[number] | undefined {
  return VISIBILITY_ENTITY_OPTIONS.find((item) => item.value === entityType);
}
