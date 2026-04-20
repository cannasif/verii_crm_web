type WithDescriptions = {
  description1?: string | null;
  description2?: string | null;
  description3?: string | null;
};

export interface LineDescriptionSavePolicyInput {
  showDescriptionFieldsSection: boolean;
  slotEnabled: readonly [boolean, boolean, boolean];
}

/** API'ye gitmeden önce: bölüm kapalı veya tik kapalı slotların metnini null yapar. */
export function applyLineDescriptionSavePolicy<T extends WithDescriptions>(
  data: T,
  policy: LineDescriptionSavePolicyInput
): T {
  if (!policy.showDescriptionFieldsSection) {
    return {
      ...data,
      description1: null,
      description2: null,
      description3: null,
    };
  }
  return {
    ...data,
    description1: policy.slotEnabled[0] ? data.description1 ?? null : null,
    description2: policy.slotEnabled[1] ? data.description2 ?? null : null,
    description3: policy.slotEnabled[2] ? data.description3 ?? null : null,
  };
}
