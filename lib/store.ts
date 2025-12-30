import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// User role type
type UserRole = 'admin' | 'office' | 'field' | null;

// Auth store
interface AuthState {
  role: UserRole;
  isAuthenticated: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      isAuthenticated: false,
      login: (role) => set({ role, isAuthenticated: true }),
      logout: () => set({ role: null, isAuthenticated: false }),
    }),
    {
      name: 'markpro-auth',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

// UI store for app-wide UI state
interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  isOnline: boolean;
  setOnline: (online: boolean) => void;
  syncStatus: 'idle' | 'syncing' | 'error';
  setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setOnline: (online) => set({ isOnline: online }),
  syncStatus: 'idle',
  setSyncStatus: (status) => set({ syncStatus: status }),
}));

// Field mode store
interface FieldState {
  currentJobId: string | null;
  setCurrentJob: (id: string | null) => void;
  expandedChecklist: string | null;
  setExpandedChecklist: (id: string | null) => void;
}

export const useFieldStore = create<FieldState>((set) => ({
  currentJobId: null,
  setCurrentJob: (id) => set({ currentJobId: id }),
  expandedChecklist: null,
  setExpandedChecklist: (id) => set({ expandedChecklist: id }),
}));

// Admin CRM filters
interface FilterState {
  jobStageFilter: string | null;
  customerTagFilter: string | null;
  searchQuery: string;
  dateRange: { start: Date | null; end: Date | null };
  setJobStageFilter: (stage: string | null) => void;
  setCustomerTagFilter: (tag: string | null) => void;
  setSearchQuery: (query: string) => void;
  setDateRange: (range: { start: Date | null; end: Date | null }) => void;
  clearFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  jobStageFilter: null,
  customerTagFilter: null,
  searchQuery: '',
  dateRange: { start: null, end: null },
  setJobStageFilter: (stage) => set({ jobStageFilter: stage }),
  setCustomerTagFilter: (tag) => set({ customerTagFilter: tag }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setDateRange: (range) => set({ dateRange: range }),
  clearFilters: () => set({
    jobStageFilter: null,
    customerTagFilter: null,
    searchQuery: '',
    dateRange: { start: null, end: null },
  }),
}));
