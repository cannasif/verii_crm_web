import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MyReportsViewLayout = 'cards' | 'list';

interface ReportsState {
  search: string;
  setSearch: (v: string) => void;
  myReportsViewLayout: MyReportsViewLayout;
  setMyReportsViewLayout: (v: MyReportsViewLayout) => void;
}

export const useReportsStore = create<ReportsState>()(
  persist(
    (set) => ({
      search: '',
      setSearch: (v) => set({ search: v }),
      myReportsViewLayout: 'cards',
      setMyReportsViewLayout: (v) => set({ myReportsViewLayout: v }),
    }),
    {
      name: 'reports-ui-storage',
      partialize: (state) => ({ myReportsViewLayout: state.myReportsViewLayout }),
    },
  ),
);
