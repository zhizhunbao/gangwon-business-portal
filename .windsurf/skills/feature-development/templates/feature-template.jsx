import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { use{{FeatureName}}Store } from './hooks/use{{FeatureName}}';
import { {{featureName}}Service } from './services/{{featureName}}.service';
import { LoadingSpinner, ErrorBoundary } from '@/shared/components';
import './styles.css';

/**
 * {{FeatureName}} Feature Component
 * 
 * @description {{description}}
 * @author {{author}}
 * @created {{date}}
 */
const {{FeatureName}} = () => {
  const { t } = useTranslation('{{featureName}}');
  const queryClient = useQueryClient();
  
  // Zustand store for local state
  const { 
    localState, 
    setLocalState, 
    loading, 
    error 
  } = use{{FeatureName}}Store();

  // React Query for server state
  const { 
    data: {{featureName}}Data, 
    isLoading: dataLoading, 
    error: dataError 
  } = useQuery({
    queryKey: ['{{featureName}}'],
    queryFn: () => {{featureName}}Service.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for creating/updating
  const createMutation = useMutation({
    mutationFn: {{featureName}}Service.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{{featureName}}'] });
      // Show success message
    },
    onError: (error) => {
      // Handle error
    },
  });

  useEffect(() => {
    // Component initialization
  }, []);

  if (loading || dataLoading) {
    return <LoadingSpinner />;
  }

  if (error || dataError) {
    return <ErrorBoundary error={error || dataError} />;
  }

  return (
    <div className="{{feature-name}}-container">
      <div className="{{feature-name}}-header">
        <h1>{t('{{featureName}}.title')}</h1>
        <p>{t('{{featureName}}.description')}</p>
      </div>
      
      <div className="{{feature-name}}-content">
        {/* Feature content goes here */}
        {data?.map(item => (
          <div key={item.id} className="{{feature-name}}-item">
            <h3>{item.name}</h3>
            <p>{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default {{FeatureName}};
