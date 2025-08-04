import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import KnowledgeBasePage from './KnowledgeBase';
import { KnowledgeBaseServiceError } from '@/lib/knowledge-base-service';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
  }),
}));

vi.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false,
  }),
}));

// Mock the knowledge base service
vi.mock('@/lib/knowledge-base-service', async () => {
  const actual = await vi.importActual('@/lib/knowledge-base-service');
  return {
    ...actual,
    fetchKnowledgeBaseData: vi.fn(),
    retryWithBackoff: vi.fn(),
  };
});

describe('KnowledgeBase Error Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display error state when data fetching fails', async () => {
    const { fetchKnowledgeBaseData } = await import('@/lib/knowledge-base-service');
    
    vi.mocked(fetchKnowledgeBaseData).mockRejectedValue(
      new KnowledgeBaseServiceError({
        type: 'network',
        message: 'Failed to connect to server',
        retryable: true,
      })
    );

    render(<KnowledgeBasePage />);

    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to connect to server')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should retry data fetching when retry button is clicked', async () => {
    const { fetchKnowledgeBaseData, retryWithBackoff } = await import('@/lib/knowledge-base-service');
    
    // First call fails
    vi.mocked(fetchKnowledgeBaseData).mockRejectedValueOnce(
      new KnowledgeBaseServiceError({
        type: 'network',
        message: 'Network error',
        retryable: true,
      })
    );

    // Retry succeeds
    vi.mocked(retryWithBackoff).mockResolvedValue({
      stats: { totalBases: 0, totalDocuments: 0, storageUsed: 0, processingQueue: 0 },
      knowledgeBases: [],
      recentDocuments: [],
    });

    render(<KnowledgeBasePage />);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    // Verify retry was called
    await waitFor(() => {
      expect(retryWithBackoff).toHaveBeenCalled();
    });
  });

  it('should show permission error correctly', async () => {
    const { fetchKnowledgeBaseData } = await import('@/lib/knowledge-base-service');
    
    vi.mocked(fetchKnowledgeBaseData).mockRejectedValue(
      new KnowledgeBaseServiceError({
        type: 'permission',
        message: 'Access denied',
        retryable: false,
      })
    );

    render(<KnowledgeBasePage />);

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    expect(screen.getByText('Access denied')).toBeInTheDocument();
    // Non-retryable errors should still show Try Again button for manual retry
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should show database error correctly', async () => {
    const { fetchKnowledgeBaseData } = await import('@/lib/knowledge-base-service');
    
    vi.mocked(fetchKnowledgeBaseData).mockRejectedValue(
      new KnowledgeBaseServiceError({
        type: 'database',
        message: 'Database connection failed',
        retryable: true,
      })
    );

    render(<KnowledgeBasePage />);

    await waitFor(() => {
      expect(screen.getByText('Database Error')).toBeInTheDocument();
    });

    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    expect(screen.getByText('This is a temporary issue. Please try again in a few moments.')).toBeInTheDocument();
  });

  it('should handle unknown errors gracefully', async () => {
    const { fetchKnowledgeBaseData } = await import('@/lib/knowledge-base-service');
    
    vi.mocked(fetchKnowledgeBaseData).mockRejectedValue(
      new Error('Unknown error occurred')
    );

    render(<KnowledgeBasePage />);

    await waitFor(() => {
      expect(screen.getByText('Unexpected Error')).toBeInTheDocument();
    });

    expect(screen.getByText('Unknown error occurred')).toBeInTheDocument();
  });
});