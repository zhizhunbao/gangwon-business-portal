/**
 * {{FeatureName}} Feature Tests
 * 
 * @description Vitest unit tests for {{feature_name}} feature
 * @author {{author}}
 * @created {{date}}
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { use{{FeatureName}}Store } from '@/features/{{feature_name}}/hooks/use{{FeatureName}}';
import {{FeatureName}} from '@/features/{{feature_name}}/components/{{FeatureName}}View';
import { {{featureName}}Service } from '@/features/{{feature_name}}/services/{{featureName}}.service';
import i18n from '@/shared/i18n';

// Mock services
vi.mock('@/features/{{feature_name}}/services/{{featureName}}.service');
vi.mock('@/shared/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>
}));

vi.mock('@/shared/components/ErrorBoundary', () => ({
  default: ({ error }) => <div data-testid="error-boundary">Error: {error}</div>
}));

// Test wrapper component
const TestWrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
};

// Mock data
const mock{{FeatureName}}Data = [
  {
    id: 1,
    name: 'Test {{FeatureName}} 1',
    description: 'Test description 1',
    code: 'test-1',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Test {{FeatureName}} 2',
    description: 'Test description 2',
    code: 'test-2',
    status: 'inactive',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

describe('{{FeatureName}} Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render the component correctly', async () => {
      // Mock successful API call
      {{featureName}}Service.getAll.mockResolvedValue(mock{{FeatureName}}Data);

      render(
        <TestWrapper>
          <{{FeatureName}} />
        </TestWrapper>
      );

      // Check if the component renders
      expect(screen.getByText('{{FeatureName}}')).toBeInTheDocument();
    });

    it('should show loading state initially', async () => {
      // Mock delayed API call
      {{featureName}}Service.getAll.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <TestWrapper>
          <{{FeatureName}} />
        </TestWrapper>
      );

      // Check if loading spinner is shown
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should display {{feature_name}} data after loading', async () => {
      {{featureName}}Service.getAll.mockResolvedValue(mock{{FeatureName}}Data);

      render(
        <TestWrapper>
          <{{FeatureName}} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test {{FeatureName}} 1')).toBeInTheDocument();
        expect(screen.getByText('Test {{FeatureName}} 2')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      const errorMessage = 'Failed to fetch {{feature_name}}';
      {{featureName}}Service.getAll.mockRejectedValue(new Error(errorMessage));

      render(
        <TestWrapper>
          <{{FeatureName}} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle search functionality', async () => {
      {{featureName}}Service.getAll.mockResolvedValue(mock{{FeatureName}}Data);

      render(
        <TestWrapper>
          <{{FeatureName}} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test {{FeatureName}} 1')).toBeInTheDocument();
      });

      // Find and interact with search input
      const searchInput = screen.getByPlaceholderText('搜索{{feature_name}}...');
      fireEvent.change(searchInput, { target: { value: 'Test 1' } });

      // Verify search functionality
      await waitFor(() => {
        expect({{featureName}}Service.getAll).toHaveBeenCalledWith({
          search: 'Test 1'
        });
      });
    });

    it('should handle filter changes', async () => {
      {{featureName}}Service.getAll.mockResolvedValue(mock{{FeatureName}}Data);

      render(
        <TestWrapper>
          <{{FeatureName}} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test {{FeatureName}} 1')).toBeInTheDocument();
      });

      // Find and interact with status filter
      const statusFilter = screen.getByLabelText('状态筛选');
      fireEvent.change(statusFilter, { target: { value: 'active' } });

      // Verify filter functionality
      await waitFor(() => {
        expect({{featureName}}Service.getAll).toHaveBeenCalledWith({
          status: 'active'
        });
      });
    });
  });
});

describe('{{FeatureName}} Store (Zustand)', () => {
  beforeEach(() => {
    // Reset store state before each test
    use{{FeatureName}}Store.getState().reset();
  });

  it('should initialize with default state', () => {
    const state = use{{FeatureName}}Store.getState();
    
    expect(state.{{featureName}}List).toEqual([]);
    expect(state.selected{{FeatureName}}).toBeNull();
    expect(state.ui.loading).toBe(false);
    expect(state.ui.error).toBeNull();
  });

  it('should update {{feature_name}} list', () => {
    const { set{{FeatureName}}List } = use{{FeatureName}}Store.getState();
    
    set{{FeatureName}}List(mock{{FeatureName}}Data);
    
    const state = use{{FeatureName}}Store.getState();
    expect(state.{{featureName}}List).toEqual(mock{{FeatureName}}Data);
  });

  it('should handle selected {{feature_name}}', () => {
    const { setSelected{{FeatureName}}, selected{{FeatureName}} } = use{{FeatureName}}Store.getState();
    
    setSelected{{FeatureName}}(mock{{FeatureName}}Data[0]);
    
    expect(use{{FeatureName}}Store.getState().selected{{FeatureName}}).toEqual(mock{{FeatureName}}Data[0]);
  });

  it('should handle UI state changes', () => {
    const { setLoading, setError, setUI } = use{{FeatureName}}Store.getState();
    
    setLoading(true);
    expect(use{{FeatureName}}Store.getState().ui.loading).toBe(true);
    
    setError('Test error');
    expect(use{{FeatureName}}Store.getState().ui.error).toBe('Test error');
    
    setUI({ isCreateModalOpen: true });
    expect(use{{FeatureName}}Store.getState().ui.isCreateModalOpen).toBe(true);
  });

  it('should reset state correctly', () => {
    const { set{{FeatureName}}List, setSelected{{FeatureName}}, reset } = use{{FeatureName}}Store.getState();
    
    // Set some state
    set{{FeatureName}}List(mock{{FeatureName}}Data);
    setSelected{{FeatureName}}(mock{{FeatureName}}Data[0]);
    
    // Reset state
    reset();
    
    // Verify reset
    const state = use{{FeatureName}}Store.getState();
    expect(state.{{featureName}}List).toEqual([]);
    expect(state.selected{{FeatureName}}).toBeNull();
    expect(state.ui.loading).toBe(false);
    expect(state.ui.error).toBeNull();
  });
});

describe('{{FeatureName}} Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all {{feature_name}} items', async () => {
    const mockGet = vi.fn().mockResolvedValue({ data: mock{{FeatureName}}Data });
    global.apiClient = { get: mockGet };

    const result = await {{featureName}}Service.getAll();

    expect(mockGet).toHaveBeenCalledWith('/api/{{feature_route}}');
    expect(result).toEqual(mock{{FeatureName}}Data);
  });

  it('should fetch {{feature_name}} by ID', async () => {
    const mockGet = vi.fn().mockResolvedValue({ data: mock{{FeatureName}}Data[0] });
    global.apiClient = { get: mockGet };

    const result = await {{featureName}}Service.getById(1);

    expect(mockGet).toHaveBeenCalledWith('/api/{{feature_route}}/1');
    expect(result).toEqual(mock{{FeatureName}}Data[0]);
  });

  it('should create new {{feature_name}}', async () => {
    const new{{FeatureName}} = {
      name: 'New {{FeatureName}}',
      description: 'New description',
      code: 'new-test'
    };

    const mockPost = vi.fn().mockResolvedValue({ data: { ...new{{FeatureName}}, id: 3 } });
    global.apiClient = { post: mockPost };

    const result = await {{featureName}}Service.create(new{{FeatureName}});

    expect(mockPost).toHaveBeenCalledWith('/api/{{feature_route}}', new{{FeatureName}});
    expect(result.id).toBe(3);
  });

  it('should handle API errors', async () => {
    const mockGet = vi.fn().mockRejectedValue(new Error('API Error'));
    global.apiClient = { get: mockGet };

    await expect({{featureName}}Service.getAll()).rejects.toThrow('API Error');
  });
});
