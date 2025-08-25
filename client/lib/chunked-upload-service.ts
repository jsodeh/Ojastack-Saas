import { supabase } from './supabase';

export interface ChunkUploadProgress {
  fileId: string;
  fileName: string;
  totalSize: number;
  uploadedBytes: number;
  totalChunks: number;
  uploadedChunks: number;
  currentChunk: number;
  progress: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error' | 'processing';
  error?: string;
  speed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
  startTime?: number;
  lastChunkTime?: number;
}

export interface ChunkUploadOptions {
  chunkSize?: number; // Default 1MB
  maxRetries?: number; // Default 3
  retryDelay?: number; // Default 1000ms
  onProgress?: (progress: ChunkUploadProgress) => void;
  onComplete?: (fileId: string, result: any) => void;
  onError?: (fileId: string, error: Error) => void;
  onPaused?: (fileId: string) => void;
  onResumed?: (fileId: string) => void;
}

export interface UploadSession {
  id: string;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: string[]; // Array of chunk IDs that have been uploaded
  createdAt: number;
  knowledgeBaseId?: string;
}

export class ChunkedUploadService {
  private static instance: ChunkedUploadService;
  private uploads: Map<string, ChunkUploadProgress> = new Map();
  private uploadSessions: Map<string, UploadSession> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private pausedUploads: Set<string> = new Set();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  public static getInstance(): ChunkedUploadService {
    if (!ChunkedUploadService.instance) {
      ChunkedUploadService.instance = new ChunkedUploadService();
    }
    return ChunkedUploadService.instance;
  }

  /**
   * Start uploading a file with chunked upload
   */
  public async uploadFile(
    file: File,
    knowledgeBaseId: string,
    options: ChunkUploadOptions = {}
  ): Promise<string> {
    const fileId = this.generateFileId(file);
    const chunkSize = options.chunkSize || 1024 * 1024; // 1MB default
    const totalChunks = Math.ceil(file.size / chunkSize);

    // Initialize upload progress
    const progress: ChunkUploadProgress = {
      fileId,
      fileName: file.name,
      totalSize: file.size,
      uploadedBytes: 0,
      totalChunks,
      uploadedChunks: 0,
      currentChunk: 0,
      progress: 0,
      status: 'pending',
      startTime: Date.now(),
    };

    this.uploads.set(fileId, progress);

    // Create upload session
    const session: UploadSession = {
      id: fileId,
      fileName: file.name,
      fileSize: file.size,
      chunkSize,
      totalChunks,
      uploadedChunks: [],
      createdAt: Date.now(),
      knowledgeBaseId,
    };

    this.uploadSessions.set(fileId, session);

    try {
      // Initialize upload session on server
      await this.initializeUploadSession(session);

      // Start uploading chunks
      await this.uploadChunks(file, session, options);

      // Finalize upload
      const result = await this.finalizeUpload(session);

      // Update progress to completed
      this.updateProgress(fileId, {
        status: 'completed',
        progress: 100,
      });

      options.onComplete?.(fileId, result);
      return result.id;

    } catch (error) {
      this.updateProgress(fileId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      });

      options.onError?.(fileId, error instanceof Error ? error : new Error('Upload failed'));
      throw error;
    }
  }

  /**
   * Pause an ongoing upload
   */
  public pauseUpload(fileId: string): void {
    const controller = this.abortControllers.get(fileId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(fileId);
    }

    this.pausedUploads.add(fileId);
    this.updateProgress(fileId, { status: 'paused' });

    const progress = this.uploads.get(fileId);
    if (progress) {
      const options = this.getOptionsForUpload(fileId);
      options?.onPaused?.(fileId);
    }
  }

  /**
   * Resume a paused upload
   */
  public async resumeUpload(fileId: string, file: File, options: ChunkUploadOptions = {}): Promise<void> {
    if (!this.pausedUploads.has(fileId)) {
      throw new Error('Upload is not paused');
    }

    const session = this.uploadSessions.get(fileId);
    if (!session) {
      throw new Error('Upload session not found');
    }

    this.pausedUploads.delete(fileId);
    this.updateProgress(fileId, { status: 'uploading' });

    try {
      await this.uploadChunks(file, session, options);
      const result = await this.finalizeUpload(session);

      this.updateProgress(fileId, {
        status: 'completed',
        progress: 100,
      });

      options.onComplete?.(fileId, result);
      options.onResumed?.(fileId);

    } catch (error) {
      this.updateProgress(fileId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Resume failed',
      });

      options.onError?.(fileId, error instanceof Error ? error : new Error('Resume failed'));
      throw error;
    }
  }

  /**
   * Cancel an upload
   */
  public cancelUpload(fileId: string): void {
    const controller = this.abortControllers.get(fileId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(fileId);
    }

    // Clear retry timeout if exists
    const retryTimeout = this.retryTimeouts.get(fileId);
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      this.retryTimeouts.delete(fileId);
    }

    this.uploads.delete(fileId);
    this.uploadSessions.delete(fileId);
    this.pausedUploads.delete(fileId);
  }

  /**
   * Get upload progress for a file
   */
  public getUploadProgress(fileId: string): ChunkUploadProgress | undefined {
    return this.uploads.get(fileId);
  }

  /**
   * Get all active uploads
   */
  public getAllUploads(): ChunkUploadProgress[] {
    return Array.from(this.uploads.values());
  }

  /**
   * Get overall upload progress for multiple files
   */
  public getOverallProgress(fileIds: string[]): {
    totalFiles: number;
    completedFiles: number;
    totalBytes: number;
    uploadedBytes: number;
    overallProgress: number;
    averageSpeed: number;
  } {
    const uploads = fileIds.map(id => this.uploads.get(id)).filter(Boolean) as ChunkUploadProgress[];
    
    const totalFiles = uploads.length;
    const completedFiles = uploads.filter(u => u.status === 'completed').length;
    const totalBytes = uploads.reduce((sum, u) => sum + u.totalSize, 0);
    const uploadedBytes = uploads.reduce((sum, u) => sum + u.uploadedBytes, 0);
    const overallProgress = totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0;
    const averageSpeed = uploads.reduce((sum, u) => sum + (u.speed || 0), 0) / uploads.length;

    return {
      totalFiles,
      completedFiles,
      totalBytes,
      uploadedBytes,
      overallProgress,
      averageSpeed,
    };
  }

  private generateFileId(file: File): string {
    return `${Date.now()}-${file.name}-${file.size}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeUploadSession(session: UploadSession): Promise<void> {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User must be authenticated to upload files');
    }

    const { data, error } = await supabase
      .from('upload_sessions')
      .insert({
        id: session.id,
        file_name: session.fileName,
        file_size: session.fileSize,
        chunk_size: session.chunkSize,
        total_chunks: session.totalChunks,
        knowledge_base_id: session.knowledgeBaseId,
        user_id: user.id,
        status: 'pending',
        created_at: new Date(session.createdAt).toISOString(),
      });

    if (error) {
      throw new Error(`Failed to initialize upload session: ${error.message}`);
    }
  }

  private async uploadChunks(
    file: File,
    session: UploadSession,
    options: ChunkUploadOptions
  ): Promise<void> {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;

    for (let chunkIndex = session.uploadedChunks.length; chunkIndex < session.totalChunks; chunkIndex++) {
      // Check if upload is paused
      if (this.pausedUploads.has(session.id)) {
        return;
      }

      const start = chunkIndex * session.chunkSize;
      const end = Math.min(start + session.chunkSize, file.size);
      const chunk = file.slice(start, end);

      let retryCount = 0;
      let chunkUploaded = false;

      while (!chunkUploaded && retryCount <= maxRetries) {
        try {
          // Check if upload is paused before each retry
          if (this.pausedUploads.has(session.id)) {
            return;
          }

          await this.uploadChunk(session.id, chunkIndex, chunk, options);
          
          session.uploadedChunks.push(`chunk-${chunkIndex}`);
          chunkUploaded = true;

          // Update progress
          const uploadedBytes = (chunkIndex + 1) * session.chunkSize;
          const progress = Math.min((uploadedBytes / session.fileSize) * 100, 100);
          const currentTime = Date.now();
          const elapsedTime = (currentTime - (this.uploads.get(session.id)?.startTime || currentTime)) / 1000;
          const speed = elapsedTime > 0 ? uploadedBytes / elapsedTime : 0;
          const remainingBytes = session.fileSize - uploadedBytes;
          const estimatedTimeRemaining = speed > 0 ? remainingBytes / speed : 0;

          this.updateProgress(session.id, {
            uploadedBytes: Math.min(uploadedBytes, session.fileSize),
            uploadedChunks: chunkIndex + 1,
            currentChunk: chunkIndex,
            progress,
            status: 'uploading',
            speed,
            estimatedTimeRemaining,
            lastChunkTime: currentTime,
          });

          options.onProgress?.(this.uploads.get(session.id)!);

        } catch (error) {
          retryCount++;
          
          if (retryCount > maxRetries) {
            throw new Error(`Failed to upload chunk ${chunkIndex} after ${maxRetries} retries: ${error}`);
          }

          // Wait before retrying with exponential backoff
          const delay = retryDelay * Math.pow(2, retryCount - 1);
          await new Promise(resolve => {
            const timeout = setTimeout(resolve, delay);
            this.retryTimeouts.set(session.id, timeout);
          });
        }
      }
    }
  }

  private async uploadChunk(
    sessionId: string,
    chunkIndex: number,
    chunk: Blob,
    options: ChunkUploadOptions
  ): Promise<void> {
    const controller = new AbortController();
    this.abortControllers.set(sessionId, controller);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('sessionId', sessionId);

    try {
      const response = await fetch('/api/upload-chunk', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Chunk upload failed');
      }

    } finally {
      this.abortControllers.delete(sessionId);
    }
  }

  private async finalizeUpload(session: UploadSession): Promise<any> {
    this.updateProgress(session.id, { status: 'processing' });

    const { data, error } = await supabase
      .from('upload_sessions')
      .update({
        status: 'processing',
        completed_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (error) {
      throw new Error(`Failed to finalize upload: ${error.message}`);
    }

    // Call finalize endpoint
    const response = await fetch('/api/finalize-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: session.id,
        knowledgeBaseId: session.knowledgeBaseId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to finalize upload: ${response.statusText}`);
    }

    return await response.json();
  }

  private updateProgress(fileId: string, updates: Partial<ChunkUploadProgress>): void {
    const current = this.uploads.get(fileId);
    if (current) {
      this.uploads.set(fileId, { ...current, ...updates });
    }
  }

  private getOptionsForUpload(fileId: string): ChunkUploadOptions | undefined {
    // This would need to be stored if we want to access options later
    // For now, return undefined
    return undefined;
  }
}

// Export singleton instance
export const chunkedUploadService = ChunkedUploadService.getInstance();

// Utility functions
export function formatUploadSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.ceil(seconds / 3600)}h`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}