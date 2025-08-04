import { describe, it, expect } from 'vitest';
import {
  hasProcessingDocuments,
  getProcessingProgress,
  type KnowledgeBaseData
} from './knowledge-base-service';

describe('Knowledge Base Real-time Update Utilities', () => {

  describe('hasProcessingDocuments', () => {
    it('should return true when processing queue > 0', () => {
      const data: KnowledgeBaseData = {
        stats: { totalBases: 1, totalDocuments: 2, storageUsed: 1000, processingQueue: 1 },
        knowledgeBases: [],
        recentDocuments: [],
      };

      expect(hasProcessingDocuments(data)).toBe(true);
    });

    it('should return true when recent documents are processing', () => {
      const data: KnowledgeBaseData = {
        stats: { totalBases: 1, totalDocuments: 2, storageUsed: 1000, processingQueue: 0 },
        knowledgeBases: [],
        recentDocuments: [
          {
            id: '1',
            knowledgeBaseId: 'kb-1',
            filename: 'test.pdf',
            fileSize: 1000,
            status: 'processing',
            chunkCount: 5,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        ],
      };

      expect(hasProcessingDocuments(data)).toBe(true);
    });

    it('should return false when no processing documents', () => {
      const data: KnowledgeBaseData = {
        stats: { totalBases: 1, totalDocuments: 2, storageUsed: 1000, processingQueue: 0 },
        knowledgeBases: [],
        recentDocuments: [
          {
            id: '1',
            knowledgeBaseId: 'kb-1',
            filename: 'test.pdf',
            fileSize: 1000,
            status: 'processed',
            chunkCount: 5,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        ],
      };

      expect(hasProcessingDocuments(data)).toBe(false);
    });
  });

  describe('getProcessingProgress', () => {
    it('should calculate progress correctly', () => {
      const data: KnowledgeBaseData = {
        stats: { totalBases: 1, totalDocuments: 4, storageUsed: 1000, processingQueue: 1 },
        knowledgeBases: [],
        recentDocuments: [
          {
            id: '1',
            knowledgeBaseId: 'kb-1',
            filename: 'test1.pdf',
            fileSize: 1000,
            status: 'processing',
            chunkCount: 5,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
          {
            id: '2',
            knowledgeBaseId: 'kb-1',
            filename: 'test2.pdf',
            fileSize: 1000,
            status: 'processed',
            chunkCount: 5,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
          {
            id: '3',
            knowledgeBaseId: 'kb-1',
            filename: 'test3.pdf',
            fileSize: 1000,
            status: 'error',
            chunkCount: 5,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        ],
      };

      const progress = getProcessingProgress(data);

      expect(progress.total).toBe(4);
      expect(progress.processing).toBe(1);
      expect(progress.completed).toBe(1);
      expect(progress.failed).toBe(1);
      expect(progress.percentage).toBe(50); // (1 completed + 1 failed) / 4 total * 100
    });

    it('should handle empty data', () => {
      const data: KnowledgeBaseData = {
        stats: { totalBases: 0, totalDocuments: 0, storageUsed: 0, processingQueue: 0 },
        knowledgeBases: [],
        recentDocuments: [],
      };

      const progress = getProcessingProgress(data);

      expect(progress.total).toBe(0);
      expect(progress.processing).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.failed).toBe(0);
      expect(progress.percentage).toBe(0);
    });
  });
});

describe('Real-time Update Scenarios', () => {
  describe('No Data Scenario', () => {
    it('should handle empty knowledge bases gracefully', () => {
      const data: KnowledgeBaseData = {
        stats: { totalBases: 0, totalDocuments: 0, storageUsed: 0, processingQueue: 0 },
        knowledgeBases: [],
        recentDocuments: [],
      };

      expect(hasProcessingDocuments(data)).toBe(false);

      const progress = getProcessingProgress(data);
      expect(progress.percentage).toBe(0);
    });
  });

  describe('Some Data Scenario', () => {
    it('should handle mixed processing states', () => {
      const data: KnowledgeBaseData = {
        stats: { totalBases: 2, totalDocuments: 5, storageUsed: 5000, processingQueue: 2 },
        knowledgeBases: [
          {
            id: 'kb-1',
            name: 'Customer Support',
            description: 'Support documentation',
            status: 'active',
            documentCount: 3,
            totalSize: 3000,
            lastUpdated: '2023-01-01T00:00:00Z',
            createdAt: '2023-01-01T00:00:00Z',
            userId: 'user-123',
          },
          {
            id: 'kb-2',
            name: 'Product Docs',
            description: 'Product documentation',
            status: 'processing',
            documentCount: 2,
            totalSize: 2000,
            lastUpdated: '2023-01-01T00:00:00Z',
            createdAt: '2023-01-01T00:00:00Z',
            userId: 'user-123',
          },
        ],
        recentDocuments: [
          {
            id: '1',
            knowledgeBaseId: 'kb-1',
            filename: 'support.pdf',
            fileSize: 1000,
            status: 'processed',
            chunkCount: 10,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
          {
            id: '2',
            knowledgeBaseId: 'kb-2',
            filename: 'product.pdf',
            fileSize: 2000,
            status: 'processing',
            chunkCount: 15,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        ],
      };

      expect(hasProcessingDocuments(data)).toBe(true);

      const progress = getProcessingProgress(data);
      expect(progress.processing).toBe(1);
      expect(progress.completed).toBe(1);
    });
  });

  describe('Lots of Data Scenario', () => {
    it('should handle large datasets efficiently', () => {
      const knowledgeBases = Array.from({ length: 50 }, (_, i) => ({
        id: `kb-${i}`,
        name: `Knowledge Base ${i}`,
        description: `Description ${i}`,
        status: i % 3 === 0 ? 'processing' : 'active' as 'active' | 'processing',
        documentCount: Math.floor(Math.random() * 100),
        totalSize: Math.floor(Math.random() * 10000),
        lastUpdated: '2023-01-01T00:00:00Z',
        createdAt: '2023-01-01T00:00:00Z',
        userId: 'user-123',
      }));

      const recentDocuments = Array.from({ length: 100 }, (_, i) => ({
        id: `doc-${i}`,
        knowledgeBaseId: `kb-${i % 50}`,
        filename: `document-${i}.pdf`,
        fileSize: Math.floor(Math.random() * 5000),
        status: ['processing', 'processed', 'error'][i % 3] as 'processing' | 'processed' | 'error',
        chunkCount: Math.floor(Math.random() * 20),
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }));

      const data: KnowledgeBaseData = {
        stats: {
          totalBases: knowledgeBases.length,
          totalDocuments: recentDocuments.length,
          storageUsed: 500000,
          processingQueue: recentDocuments.filter(d => d.status === 'processing').length
        },
        knowledgeBases,
        recentDocuments,
      };

      const progress = getProcessingProgress(data);

      expect(progress.total).toBe(100);
      expect(progress.processing + progress.completed + progress.failed).toBeLessThanOrEqual(100);
      expect(progress.percentage).toBeGreaterThanOrEqual(0);
      expect(progress.percentage).toBeLessThanOrEqual(100);
    });
  });
});