import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * {{FeatureName}} Feature Hook
 * 
 * @description Zustand store for {{featureName}} feature local state
 * @author {{author}}
 * @created {{date}}
 */
export const use{{FeatureName}}Store = create(
  devtools(
    (set, get) => ({
      // Local state
      {{featureName}}List: [],
      selected{{FeatureName}}: null,
      filters: {
        search: '',
        status: 'all',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      },
      pagination: {
        page: 1,
        limit: 10,
        total: 0
      },
      ui: {
        isCreateModalOpen: false,
        isEditModalOpen: false,
        isDeleteModalOpen: false,
        loading: false,
        error: null
      },

      // Actions
      set{{FeatureName}}List: ({{featureName}}List) => set({ {{featureName}}List }),
      
      setSelected{{FeatureName}}: (selected{{FeatureName}}) => set({ selected{{FeatureName}} }),
      
      setFilters: (filters) => set((state) => ({ 
        filters: { ...state.filters, ...filters } 
      })),
      
      setPagination: (pagination) => set((state) => ({ 
        pagination: { ...state.pagination, ...pagination } 
      })),
      
      setUI: (ui) => set((state) => ({ 
        ui: { ...state.ui, ...ui } 
      })),

      // Complex actions
      openCreateModal: () => set({ 
        ui: { isCreateModalOpen: true, isEditModalOpen: false, isDeleteModalOpen: false }
      }),
      
      openEditModal: ({{featureName}}) => set({ 
        selected{{FeatureName}}: {{featureName}},
        ui: { isCreateModalOpen: false, isEditModalOpen: true, isDeleteModalOpen: false }
      }),
      
      openDeleteModal: ({{featureName}}) => set({ 
        selected{{FeatureName}}: {{featureName}},
        ui: { isCreateModalOpen: false, isEditModalOpen: false, isDeleteModalOpen: true }
      }),
      
      closeAllModals: () => set({ 
        selected{{FeatureName}}: null,
        ui: { 
          isCreateModalOpen: false, 
          isEditModalOpen: false, 
          isDeleteModalOpen: false 
        }
      }),

      setLoading: (loading) => set((state) => ({ 
        ui: { ...state.ui, loading } 
      })),
      
      setError: (error) => set((state) => ({ 
        ui: { ...state.ui, error } 
      })),

      // Reset actions
      resetFilters: () => set({
        filters: {
          search: '',
          status: 'all',
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      }),
      
      resetPagination: () => set({
        pagination: {
          page: 1,
          limit: 10,
          total: 0
        }
      }),
      
      reset: () => set({
        {{featureName}}List: [],
        selected{{FeatureName}}: null,
        filters: {
          search: '',
          status: 'all',
          sortBy: 'createdAt',
          sortOrder: 'desc'
        },
        pagination: {
          page: 1,
          limit: 10,
          total: 0
        },
        ui: {
          isCreateModalOpen: false,
          isEditModalOpen: false,
          isDeleteModalOpen: false,
          loading: false,
          error: null
        }
      }),
    }),
    {
      name: '{{featureName}}-store',
    }
  )
);
