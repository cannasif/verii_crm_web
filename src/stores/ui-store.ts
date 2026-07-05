import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  isAiAssistantInSidebar: boolean;
  setAiAssistantInSidebar: (enabled: boolean) => void;
  isAiAssistantWidgetVisible: boolean;
  setAiAssistantWidgetVisible: (visible: boolean) => void;
  toggleAiAssistantWidgetVisible: () => void;
  pageTitle: string | null;
  setPageTitle: (title: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      isAiAssistantInSidebar: false,
      setAiAssistantInSidebar: (enabled) => set({ isAiAssistantInSidebar: enabled }),
      isAiAssistantWidgetVisible: true,
      setAiAssistantWidgetVisible: (visible) => set({ isAiAssistantWidgetVisible: visible }),
      toggleAiAssistantWidgetVisible: () =>
        set((state) => ({ isAiAssistantWidgetVisible: !state.isAiAssistantWidgetVisible })),
      pageTitle: null,
      setPageTitle: (title) => set({ pageTitle: title }),

      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
        isAiAssistantInSidebar: state.isAiAssistantInSidebar,
        isAiAssistantWidgetVisible: state.isAiAssistantWidgetVisible,
      }),
    }
  )
);