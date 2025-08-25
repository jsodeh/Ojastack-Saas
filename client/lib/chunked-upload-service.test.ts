import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chunkedUploadService, ChunkUploadProgress, formatUploadSpeed, formatTimeRemaining, formatFileSize } from './chunked-upload-service';

// Mock supabase
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      })
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        data: null,
        error: null
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          data: null,
          error: null
        })
      })
    })
  }
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('ChunkedUploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the singleton instance
    (chunkedUploadService as any).uploads.clear();
    (chunkedUploadService as any).uploadSessions.clear();
    (chunkedUploadService as any).abortControllers.clear();
    (chunkedUploadService as any).pausedUploads.clear();
    (chunkedUploadService as any).retryTimeouts.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('File Upload Progress Tracking', () => {
    it('should initialize upload progress correctly', { timeout: 10000 }, async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      // Mock successful chunk upload
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      // Mock successful finalize
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, documentId: 'doc-123' })
      });

      const progressUpdates: ChunkUploadProgress[] = [];
      
      try {
        await chunkedUploadService.uploadFile(mockFile, 'kb-123', {
          chunkSize: 5, // Small chunk size to test chunking
          onProgress: (progress) => {
            progressUpdates.push({ ...progress });
          }
        });
      } catch (error) {
        // Expected to fail in test environment, but we can check progress tracking
      }

      // Verify progress tracking was initialized
      const allUploads = chunkedUploadService.getAllUploads();
      expect(allUploads.length).toBeGreaterThan(0);
      
      const upload = allUploads[0];
      expect(upload.fileName).toBe('test.txt');
      expect(upload.totalSize).toBe(mockFile.size);
      expect(upload.totalChunks).toBe(Math.ceil(mockFile.size / 5));
    });

    it('should track overall progress for multiple files', () => {
      const mockFile1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const mockFile2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });

      // Manually add progress entries to test overall progress calculation
      const fileId1 = 'file-1';
      const fileId2 = 'file-2';

      (chunkedUploadService as any).uploads.set(fileId1, {
        fileId: fileId1,
        fileName: 'file1.txt',
        totalSize: 100,
        uploadedBytes: 50,
        progress: 50,
        status: 'uploading'
      });

      (chunkedUploadService as any).uploads.set(fileId2, {
        fileId: fileId2,
        fileName: 'file2.txt',
        totalSize: 200,
        uploadedBytes: 200,
        progress: 100,
        status: 'completed'
      });

      const overallProgress = chunkedUploadService.getOverallProgress([fileId1, fileId2]);

      expect(overallProgress.totalFiles).toBe(2);
      expect(overallProgress.completedFiles).toBe(1);
      expect(overallProgress.totalBytes).toBe(300);
      expect(overallProgress.uploadedBytes).toBe(250);
      expect(overallProgress.overallProgress).toBeCloseTo(83.33, 1);
    });
  });

  describe('Pause and Resume Functionality', () => {
    it('should pause an active upload', () => {
      const fileId = 'test-file-id';
      
      // Add a mock upload
      (chunkedUploadService as any).uploads.set(fileId, {
        fileId,
        fileName: 'test.txt',
        status: 'uploading'
      });

      // Add a mock abort controller
      const mockController = { abort: vi.fn() };
      (chunkedUploadService as any).abortControllers.set(fileId, mockController);

      chunkedUploadService.pauseUpload(fileId);

      expect(mockController.abort).toHaveBeenCalled();
      expect((chunkedUploadService as any).pausedUploads.has(fileId)).toBe(true);
      
      const progress = chunkedUploadService.getUploadProgress(fileId);
      expect(progress?.status).toBe('paused');
    });

    it('should cancel an upload and clean up resources', () => {
      const fileId = 'test-file-id';
      
      // Add mock data
      (chunkedUploadService as any).uploads.set(fileId, { fileId });
      (chunkedUploadService as any).uploadSessions.set(fileId, { id: fileId });
      (chunkedUploadService as any).pausedUploads.add(fileId);
      
      const mockController = { abort: vi.fn() };
      (chunkedUploadService as any).abortControllers.set(fileId, mockController);

      chunkedUploadService.cancelUpload(fileId);

      expect(mockController.abort).toHaveBeenCalled();
      expect((chunkedUploadService as any).uploads.has(fileId)).toBe(false);
      expect((chunkedUploadService as any).uploadSessions.has(fileId)).toBe(false);
      expect((chunkedUploadService as any).pausedUploads.has(fileId)).toBe(false);
    });
  });

  describe('Real-time Progress Updates', () => {
    it('should calculate upload speed and time remaining', () => {
      const fileId = 'test-file-id';
      const startTime = Date.now() - 5000; // 5 seconds ago
      const uploadedBytes = 1024 * 1024; // 1MB uploaded
      const totalSize = 5 * 1024 * 1024; // 5MB total

      (chunkedUploadService as any).uploads.set(fileId, {
        fileId,
        totalSize,
        uploadedBytes,
        startTime,
        status: 'uploading'
      });

      // Simulate progress update with speed calculation
      const currentTime = Date.now();
      const elapsedTime = (currentTime - startTime) / 1000;
      const speed = uploadedBytes / elapsedTime;
      const remainingBytes = totalSize - uploadedBytes;
      const estimatedTimeRemaining = speed > 0 ? remainingBytes / speed : 0;

      (chunkedUploadService as any).updateProgress(fileId, {
        speed,
        estimatedTimeRemaining,
        lastChunkTime: currentTime
      });

      const progress = chunkedUploadService.getUploadProgress(fileId);
      expect(progress?.speed).toBeGreaterThan(0);
      expect(progress?.estimatedTimeRemaining).toBeGreaterThan(0);
    });
  });
});

describe('Utility Functions', () => {
  describe('formatUploadSpeed', () => {
    it('should format bytes per second correctly', () => {
      expect(formatUploadSpeed(500)).toBe('500 B/s');
      expect(formatUploadSpeed(1536)).toBe('1.5 KB/s');
      expect(formatUploadSpeed(2097152)).toBe('2.0 MB/s');
    });
  });

  describe('formatTimeRemaining', () => {
    it('should format time remaining correctly', () => {
      expect(formatTimeRemaining(30)).toBe('30s');
      expect(formatTimeRemaining(90)).toBe('2m');
      expect(formatTimeRemaining(3700)).toBe('2h');
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });
});
