import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fileProcessingService, FileProcessingService } from './file-processing-service';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      upsert: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => ({ data: null, error: null })) })) })),
    })),
  },
}));

describe('FileProcessingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSupportedFileTypes', () => {
    it('should return all supported file types', () => {
      const supportedTypes = fileProcessingService.getSupportedFileTypes();
      
      expect(supportedTypes).toHaveLength(5);
      expect(supportedTypes.map(t => t.type)).toEqual(['pdf', 'docx', 'xlsx', 'image', 'text']);
    });
  });

  describe('isFileTypeSupported', () => {
    it('should return true for supported file extensions', () => {
      expect(fileProcessingService.isFileTypeSupported('document.pdf')).toBe(true);
      expect(fileProcessingService.isFileTypeSupported('document.docx')).toBe(true);
      expect(fileProcessingService.isFileTypeSupported('spreadsheet.xlsx')).toBe(true);
      expect(fileProcessingService.isFileTypeSupported('image.jpg')).toBe(true);
      expect(fileProcessingService.isFileTypeSupported('text.txt')).toBe(true);
    });

    it('should return false for unsupported file extensions', () => {
      expect(fileProcessingService.isFileTypeSupported('video.mp4')).toBe(false);
      expect(fileProcessingService.isFileTypeSupported('audio.mp3')).toBe(false);
      expect(fileProcessingService.isFileTypeSupported('archive.zip')).toBe(false);
    });

    it('should support MIME type checking', () => {
      expect(fileProcessingService.isFileTypeSupported('document', 'application/pdf')).toBe(true);
      expect(fileProcessingService.isFileTypeSupported('document', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
      expect(fileProcessingService.isFileTypeSupported('document', 'video/mp4')).toBe(false);
    });
  });

  describe('getProcessorForFile', () => {
    it('should return correct processor for file types', () => {
      const pdfProcessor = fileProcessingService.getProcessorForFile('document.pdf');
      expect(pdfProcessor?.type).toBe('pdf');

      const docxProcessor = fileProcessingService.getProcessorForFile('document.docx');
      expect(docxProcessor?.type).toBe('docx');

      const xlsxProcessor = fileProcessingService.getProcessorForFile('spreadsheet.xlsx');
      expect(xlsxProcessor?.type).toBe('xlsx');

      const imageProcessor = fileProcessingService.getProcessorForFile('image.jpg');
      expect(imageProcessor?.type).toBe('image');

      const textProcessor = fileProcessingService.getProcessorForFile('text.txt');
      expect(textProcessor?.type).toBe('text');
    });

    it('should return null for unsupported file types', () => {
      const processor = fileProcessingService.getProcessorForFile('video.mp4');
      expect(processor).toBeNull();
    });
  });

  describe('processFile', () => {
    it('should process a text file successfully', async () => {
      const textContent = 'This is a test document with some content that should be processed and chunked appropriately.';
      const file = new File([textContent], 'test.txt', { type: 'text/plain' });
      
      const result = await fileProcessingService.processFile('doc-123', file, 'test.txt');
      
      expect(result.text).toBe(textContent);
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].content).toBe(textContent);
      expect(result.metadata.fileName).toBe('test.txt');
      expect(result.metadata.mimeType).toBe('text/plain');
    });

    it('should handle processing errors gracefully', async () => {
      const file = new File(['content'], 'unsupported.xyz', { type: 'application/xyz' });
      
      await expect(
        fileProcessingService.processFile('doc-123', file, 'unsupported.xyz')
      ).rejects.toThrow('Unsupported file type: unsupported.xyz');
    });

    it('should update processing status during processing', async () => {
      const textContent = 'Test content';
      const file = new File([textContent], 'test.txt', { type: 'text/plain' });
      
      const statusUpdates: any[] = [];
      const onProgress = vi.fn((status) => statusUpdates.push(status));
      
      await fileProcessingService.processFile('doc-123', file, 'test.txt', {
        onProgress,
      });
      
      expect(onProgress).toHaveBeenCalled();
      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(statusUpdates[statusUpdates.length - 1].status).toBe('completed');
    });
  });

  describe('processing status tracking', () => {
    it('should track processing status', async () => {
      const documentId = 'doc-123';
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      // Start processing
      const processPromise = fileProcessingService.processFile(documentId, file, 'test.txt');
      
      // Check initial status
      const initialStatus = fileProcessingService.getProcessingStatus(documentId);
      expect(initialStatus).toBeDefined();
      expect(initialStatus?.documentId).toBe(documentId);
      expect(initialStatus?.fileName).toBe('test.txt');
      
      await processPromise;
      
      // Check final status
      const finalStatus = fileProcessingService.getProcessingStatus(documentId);
      expect(finalStatus?.status).toBe('completed');
    });

    it('should support status update subscriptions', async () => {
      const documentId = 'doc-456';
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      const statusUpdates: any[] = [];
      const unsubscribe = fileProcessingService.onProcessingUpdate(documentId, (status) => {
        statusUpdates.push(status);
      });
      
      await fileProcessingService.processFile(documentId, file, 'test.txt');
      
      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(statusUpdates[statusUpdates.length - 1].status).toBe('completed');
      
      unsubscribe();
    });
  });

  describe('chunk creation', () => {
    it('should create appropriate chunks for long text', async () => {
      // Create a long text that should be split into multiple chunks
      const longText = 'word '.repeat(2000); // 2000 words
      const file = new File([longText], 'long.txt', { type: 'text/plain' });
      
      const result = await fileProcessingService.processFile('doc-789', file, 'long.txt');
      
      expect(result.chunks.length).toBeGreaterThan(1);
      
      // Check that chunks have reasonable sizes
      result.chunks.forEach(chunk => {
        expect(chunk.tokens).toBeGreaterThan(0);
        expect(chunk.tokens).toBeLessThanOrEqual(1000); // Should not exceed chunk size
        expect(chunk.content.length).toBeGreaterThan(0);
      });
    });

    it('should create chunks with proper metadata', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      const result = await fileProcessingService.processFile('doc-abc', file, 'test.txt');
      
      expect(result.chunks[0]).toMatchObject({
        id: expect.stringContaining('test.txt-chunk-'),
        content: 'test content',
        startIndex: 0,
        endIndex: expect.any(Number),
        tokens: expect.any(Number),
        metadata: {
          type: 'text',
          confidence: 1.0,
        },
      });
    });
  });

  describe('error handling', () => {
    it('should handle file processing errors', async () => {
      // Mock a processing error
      const originalConsoleError = console.error;
      console.error = vi.fn();
      
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      // Mock the processor to throw an error
      const service = new (FileProcessingService as any)();
      const originalProcessor = service.getProcessorForFile('test.txt', 'text/plain');
      if (originalProcessor) {
        originalProcessor.processor = vi.fn().mockRejectedValue(new Error('Processing failed'));
      }
      
      const onError = vi.fn();
      
      await expect(
        service.processFile('doc-error', file, 'test.txt', { onError })
      ).rejects.toThrow('Processing failed');
      
      expect(onError).toHaveBeenCalledWith({
        code: 'PROCESSING_FAILED',
        message: 'Processing failed',
        retryable: true,
      });
      
      console.error = originalConsoleError;
    });

    it('should set error status on processing failure', async () => {
      const file = new File(['content'], 'error.txt', { type: 'text/plain' });
      
      // Create a new service instance to avoid affecting other tests
      const service = new (FileProcessingService as any)();
      const processor = service.getProcessorForFile('error.txt', 'text/plain');
      if (processor) {
        processor.processor = vi.fn().mockRejectedValue(new Error('Test error'));
      }
      
      try {
        await service.processFile('doc-error', file, 'error.txt');
      } catch (error) {
        // Expected to throw
      }
      
      const status = service.getProcessingStatus('doc-error');
      expect(status?.status).toBe('error');
      expect(status?.error?.message).toBe('Test error');
    });
  });
});

describe('Utility functions', () => {
  describe('formatProcessingTime', () => {
    it('should format processing time correctly', async () => {
      const { formatProcessingTime } = await import('./file-processing-service');
      
      const start = new Date('2024-01-01T10:00:00Z');
      const end = new Date('2024-01-01T10:00:30Z');
      
      expect(formatProcessingTime(start, end)).toBe('30s');
      
      const longEnd = new Date('2024-01-01T10:02:30Z');
      expect(formatProcessingTime(start, longEnd)).toBe('2m 30s');
    });
  });

  describe('estimateProcessingTime', () => {
    it('should estimate processing time based on file size and type', async () => {
      const { estimateProcessingTime } = await import('./file-processing-service');
      
      const pdfTime = estimateProcessingTime(20 * 1024 * 1024, 'pdf'); // 20MB PDF
      const textTime = estimateProcessingTime(10 * 1024 * 1024, 'text'); // 10MB text
      const imageTime = estimateProcessingTime(5 * 1024 * 1024, 'image'); // 5MB image
      
      expect(pdfTime).toBeGreaterThan(0);
      expect(textTime).toBeGreaterThan(0);
      expect(imageTime).toBeGreaterThan(0);
      
      // Images should take longer due to OCR (per MB)
      expect(imageTime).toBeGreaterThan(5); // Should be more than minimum
      
      // Larger files should take longer
      expect(pdfTime).toBeGreaterThan(5); // Should be more than minimum
    });
  });

  describe('getFileTypeIcon', () => {
    it('should return correct icons for file types', async () => {
      const { getFileTypeIcon } = await import('./file-processing-service');
      
      expect(getFileTypeIcon('document.pdf')).toBe('📄');
      expect(getFileTypeIcon('document.docx')).toBe('📝');
      expect(getFileTypeIcon('spreadsheet.xlsx')).toBe('📊');
      expect(getFileTypeIcon('image.jpg')).toBe('🖼️');
      expect(getFileTypeIcon('text.txt')).toBe('📄');
      expect(getFileTypeIcon('unknown.xyz')).toBe('📄'); // Default
    });
  });
});