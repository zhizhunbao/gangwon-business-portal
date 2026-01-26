import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * {{StoreName}} Store
 * 
 * @description {{description}}
 * @author {{author}}
 * @created {{date}}
 */
export const use{{StoreName}}Store = create(
  devtools(
    (set, get) => ({
      // State
      {{stateName}}: [],
      loading: false,
      error: null,

      // Actions
      set{{StateName}}: ({{stateName}}) => set({ {{stateName}} }),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      // Async actions
      fetch{{StateName}}: async () => {
        set({ loading: true, error: null });
        try {
          // Fetch logic here
          const data = await /* your fetch function */();
          set({ {{stateName}}: data, loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },
      
      reset: () => set({
        {{stateName}}: [],
        loading: false,
        error: null,
      }),
    }),
    {
      name: '{{storeName}}-store',
    }
  )
);
