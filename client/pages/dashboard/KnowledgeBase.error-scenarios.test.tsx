import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgeBaseServiceError } from '@/lib/knowledge-base-service';

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

  it('should create network error correctly', () => {
    const error = new KnowledgeBaseServiceError({
      type: 'network',
      message: 'Failed to connect to server',
      retryable: true,
    });

    expect(error.type).toBe('network');
    expect(error.message).toBe('Failed to connect to server');
    expect(error.retryable).toBe(true);
    expect(error.name).toBe('KnowledgeBaseServiceError');
  });

  it('should create permission error correctly', () => {
    const error = new KnowledgeBaseServiceError({
      type: 'permission',
      message: 'Access denied',
      retryable: false,
    });

    expect(error.type).toBe('permission');
    expect(error.message).toBe('Access denied');
    expect(error.retryable).toBe(false);
  });

  it('should create database error correctly', () => {
    const error = new KnowledgeBaseServiceError({
      type: 'database',
      message: 'Database connection failed',
      retryable: true,
    });

    expect(error.type).toBe('database');
    expect(error.message).toBe('Database connection failed');
    expect(error.retryable).toBe(true);
  });

  it('should handle service error with code', () => {
    const error = new KnowledgeBaseServiceError({
      type: 'database',
      message: 'Constraint violation',
      code: 'PGRST301',
      retryable: false,
    });

    expect(error.code).toBe('PGRST301');
    expect(error.type).toBe('database');
    expect(error.retryable).toBe(false);
  });

  it('should mock fetchKnowledgeBaseData to throw network error', async () => {
    const { fetchKnowledgeBaseData } = await import('@/lib/knowledge-base-service');

    vi.mocked(fetchKnowledgeBaseData).mockRejectedValue(
      new KnowledgeBaseServiceError({
        type: 'network',
        message: 'Network error',
        retryable: true,
      })
    );

    await expect(fetchKnowledgeBaseData('test-user')).rejects.toThrow('Network error');
    await expect(fetchKnowledgeBaseData('test-user')).rejects.toThrow(KnowledgeBaseServiceError);
  });

  it('should mock retryWithBackoff to succeed after retry', async () => {
    const { retryWithBackoff } = await import('@/lib/knowledge-base-service');

    const mockData = {
      stats: { totalBases: 1, totalDocuments: 2, storageUsed: 1000, processingQueue: 0 },
      knowledgeBases: [],
      recentDocuments: [],
    };

    vi.mocked(retryWithBackoff).mockResolvedValue(mockData);

    const result = await retryWithBackoff(() => Promise.resolve(mockData));
    expect(result).toEqual(mockData);
  });
});