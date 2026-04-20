import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Bu cihazda saklanır; API ile senkronize edilmez (ileride bağlanabilir). */
export interface LineFormUiPreferences {
  showDescriptionFieldsSection: boolean;
  customDescriptionLabel1: string;
  customDescriptionLabel2: string;
  customDescriptionLabel3: string;
}

interface LineFormUiPreferencesState extends LineFormUiPreferences {
  setShowDescriptionFieldsSection: (value: boolean) => void;
  setCustomDescriptionLabel1: (value: string) => void;
  setCustomDescriptionLabel2: (value: string) => void;
  setCustomDescriptionLabel3: (value: string) => void;
}

const DEFAULTS: LineFormUiPreferences = {
  showDescriptionFieldsSection: true,
  customDescriptionLabel1: '',
  customDescriptionLabel2: '',
  customDescriptionLabel3: '',
};

export const useLineFormUiPreferencesStore = create<LineFormUiPreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setShowDescriptionFieldsSection: (showDescriptionFieldsSection) => set({ showDescriptionFieldsSection }),
      setCustomDescriptionLabel1: (customDescriptionLabel1) => set({ customDescriptionLabel1 }),
      setCustomDescriptionLabel2: (customDescriptionLabel2) => set({ customDescriptionLabel2 }),
      setCustomDescriptionLabel3: (customDescriptionLabel3) => set({ customDescriptionLabel3 }),
    }),
    {
      name: 'verii-line-form-ui-preferences-v2',
      partialize: (s) => ({
        showDescriptionFieldsSection: s.showDescriptionFieldsSection,
        customDescriptionLabel1: s.customDescriptionLabel1,
        customDescriptionLabel2: s.customDescriptionLabel2,
        customDescriptionLabel3: s.customDescriptionLabel3,
      }),
    }
  )
);
