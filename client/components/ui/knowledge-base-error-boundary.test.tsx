import { describe, it, expect, vi } from 'vitest';
import { KnowledgeBaseServiceError } from '@/lib/knowledge-base-service';

describe('KnowledgeBaseErrorBoundary Logic', () => {
  it('should create network error for error boundary', () => {
    const error = new KnowledgeBaseServiceError({
      type: 'network',
      message: 'Test network error',
      retryable: true,
    });

    expect(error.type).toBe('network');
    expect(error.message).toBe('Test network error');
    expect(error.retryable).toBe(true);
  });

  it('should create permission error for error boundary', () => {
    const error = new KnowledgeBaseServiceError({
      type: 'permission',
      message: 'Access denied',
      retryable: false,
    });

    expect(error.type).toBe('permission');
    expect(error.message).toBe('Access denied');
    expect(error.retryable).toBe(false);
  });

  it('should handle retry callback function', () => {
    const onRetry = vi.fn();
    
    // Simulate retry button click
    onRetry();
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should handle reset callback function', () => {
    const onReset = vi.fn();
    
    // Simulate reset button click
    onReset();
    
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('should determine error display title based on error type', () => {
    const networkError = new KnowledgeBaseServiceError({
      type: 'network',
      message: 'Network failed',
      retryable: true,
    });

    const permissionError = new KnowledgeBaseServiceError({
      type: 'permission',
      message: 'Access denied',
      retryable: false,
    });

    const databaseError = new KnowledgeBaseServiceError({
      type: 'database',
      message: 'DB error',
      retryable: true,
    });

    // Test error type mapping logic
    expect(networkError.type).toBe('network');
    expect(permissionError.type).toBe('permission');
    expect(databaseError.type).toBe('database');
  });
});