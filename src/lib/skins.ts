export const CRM_SKIN_STORAGE_KEY = 'vite-ui-crm-skin';

export const crmSkinIds = ['terminal', 'premium'] as const;

export type CrmSkin = (typeof crmSkinIds)[number];

export const DEFAULT_CRM_SKIN: CrmSkin = 'terminal';

/** Terminal is the existing CRM experience, so it intentionally has no extra class. */
export const CRM_SKIN_CLASS_MAP: Record<CrmSkin, string | null> = {
  terminal: null,
  premium: 'skin-premium',
};

const skinIdSet = new Set<string>(crmSkinIds);

export function isCrmSkin(value: string | null | undefined): value is CrmSkin {
  return Boolean(value && skinIdSet.has(value));
}

export function readStoredCrmSkin(storageKey = CRM_SKIN_STORAGE_KEY): CrmSkin {
  const stored = localStorage.getItem(storageKey);
  return isCrmSkin(stored) ? stored : DEFAULT_CRM_SKIN;
}
