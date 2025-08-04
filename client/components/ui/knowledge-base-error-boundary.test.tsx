import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { KnowledgeBaseErrorBoundary } from './knowledge-base-error-boundary';
import { KnowledgeBaseServiceError } from '@/lib/knowledge-base-service';

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new KnowledgeBaseServiceError({
      type: 'network',
      message: 'Test network error',
      retryable: true,
    });
  }
  return <div>No error</div>;
}

describe('KnowledgeBaseErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    render(
      <KnowledgeBaseErrorBoundary>
        <ThrowError shouldThrow={false} />
      </KnowledgeBaseErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error state when error occurs', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <KnowledgeBaseErrorBoundary>
        <ThrowError shouldThrow={true} />
      </KnowledgeBaseErrorBoundary>
    );

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText('Test network error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('should call onRetry when retry button is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onRetry = vi.fn();

    render(
      <KnowledgeBaseErrorBoundary onRetry={onRetry}>
        <ThrowError shouldThrow={true} />
      </KnowledgeBaseErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });

  it('should render custom fallback when provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const customFallback = <div>Custom error message</div>;

    render(
      <KnowledgeBaseErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </KnowledgeBaseErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('should show different error types correctly', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function ThrowPermissionError() {
      throw new KnowledgeBaseServiceError({
        type: 'permission',
        message: 'Access denied',
        retryable: false,
      });
    }

    render(
      <KnowledgeBaseErrorBoundary>
        <ThrowPermissionError />
      </KnowledgeBaseErrorBoundary>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument(); // Non-retryable error

    consoleSpy.mockRestore();
  });
});