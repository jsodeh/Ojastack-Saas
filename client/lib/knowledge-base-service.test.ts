import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  fetchKnowledgeBaseStats, 
  fetchKnowledgeBases, 
  fetchRecentDocuments,
  fetchKnowledgeBaseData,
  retryWithBackoff,
  KnowledgeBaseServiceError,
  handleSupabaseError
} from './knowledge-base-service';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

describe('Knowledge Base Service Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('KnowledgeBaseServiceError', () => {
    it('should create error with correct properties', () => {
      const error = new KnowledgeBaseServiceError({
        type: 'network',
        message: 'Network error',
        code: 'NET001',
        retryable: true,
      });

      expect(error.name).toBe('KnowledgeBaseServiceError');
      expect(error.type).toBe('network');
      expect(error.message).toBe('Network error');
      expect(error.code).toBe('NET001');
      expect(error.retryable).toBe(true);
    });
  });

  describe('fetchKnowledgeBaseStats', () => {
    it('should throw error for missing userId', async () => {
      await expect(fetchKnowledgeBaseStats('')).rejects.toThrow(KnowledgeBaseServiceError);
      await expect(fetchKnowledgeBaseStats('')).rejects.toThrow('User ID is required');
    });

    it('should handle network errors', async () => {
      const { supabase } = await import('./supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'Failed to fetch' } 
          })),
        })),
      } as any);

      await expect(fetchKnowledgeBaseStats('user123')).rejects.toThrow(KnowledgeBaseServiceError);
    });
  });

  describe('fetchKnowledgeBases', () => {
    it('should throw error for missing userId', async () => {
      await expect(fetchKnowledgeBases('')).rejects.toThrow(KnowledgeBaseServiceError);
      await expect(fetchKnowledgeBases('')).rejects.toThrow('User ID is required');
    });

    it('should return empty array when no knowledge bases exist', async () => {
      const { supabase } = await import('./supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      } as any);

      const result = await fetchKnowledgeBases('user123');
      expect(result).toEqual([]);
    });
  });

  describe('fetchRecentDocuments', () => {
    it('should throw error for missing userId', async () => {
      await expect(fetchRecentDocuments('')).rejects.toThrow(KnowledgeBaseServiceError);
      await expect(fetchRecentDocuments('')).rejects.toThrow('User ID is required');
    });

    it('should return empty array when no knowledge bases exist', async () => {
      const { supabase } = await import('./supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      } as any);

      const result = await fetchRecentDocuments('user123');
      expect(result).toEqual([]);
    });
  });

  describe('fetchKnowledgeBaseData', () => {
    it('should throw error for missing userId', async () => {
      await expect(fetchKnowledgeBaseData('')).rejects.toThrow(KnowledgeBaseServiceError);
      await expect(fetchKnowledgeBaseData('')).rejects.toThrow('User ID is required');
    });
  });

  describe('retryWithBackoff', () => {
    it('should retry retryable errors', async () => {
      let attempts = 0;
      const mockFn = vi.fn(() => {
        attempts++;
        if (attempts < 3) {
          throw new KnowledgeBaseServiceError({
            type: 'network',
            message: 'Network error',
            retryable: true,
          });
        }
        return Promise.resolve('success');
      });

      const result = await retryWithBackoff(mockFn, 3, 10);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should not retry non-retryable errors', async () => {
      let attempts = 0;
      const mockFn = vi.fn(() => {
        attempts++;
        throw new KnowledgeBaseServiceError({
          type: 'permission',
          message: 'Permission denied',
          retryable: false,
        });
      });

      await expect(retryWithBackoff(mockFn, 3, 10)).rejects.toThrow('Permission denied');
      expect(attempts).toBe(1);
    });

    it('should throw last error after max retries', async () => {
      const mockFn = vi.fn(() => {
        throw new KnowledgeBaseServiceError({
          type: 'network',
          message: 'Network error',
          retryable: true,
        });
      });

      await expect(retryWithBackoff(mockFn, 2, 10)).rejects.toThrow('Network error');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial call + 2 retries
    });
  });
});