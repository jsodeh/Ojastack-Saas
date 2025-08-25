import { supabase } from './supabase';

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'processing' | 'error';
  documentCount: number;
  totalSize: number;
  lastUpdated: string;
  createdAt: string;
  userId: string;
}

export interface Document {
  id: string;
  knowledgeBaseId: string;
  filename: string;
  fileSize: number;
  status: 'processing' | 'processed' | 'error';
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  knowledgeBaseName?: string;
}

export interface KnowledgeBaseStats {
  totalBases: number;
  totalDocuments: number;
  storageUsed: number;
  processingQueue: number;
}

export interface KnowledgeBaseData {
  stats: KnowledgeBaseStats;
  knowledgeBases: KnowledgeBase[];
  recentDocuments: Document[];
}

export interface KnowledgeBaseError {
  type: 'network' | 'database' | 'permission' | 'unknown';
  message: string;
  code?: string;
  retryable: boolean;
}

export class KnowledgeBaseServiceError extends Error {
  public readonly type: KnowledgeBaseError['type'];
  public readonly code?: string;
  public readonly retryable: boolean;

  constructor(error: KnowledgeBaseError) {
    super(error.message);
    this.name = 'KnowledgeBaseServiceError';
    this.type = error.type;
    this.code = error.code;
    this.retryable = error.retryable;
  }
}

/**
 * Convert Supabase error to KnowledgeBaseServiceError
 */
function handleSupabaseError(error: any, operation: string): KnowledgeBaseServiceError {
  console.error(`Error in ${operation}:`, error);

  // Network/connection errors
  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    return new KnowledgeBaseServiceError({
      type: 'network',
      message: 'Unable to connect to the server. Please check your internet connection.',
      retryable: true,
    });
  }

  // Permission errors
  if (error.code === 'PGRST301' || error.message?.includes('permission')) {
    return new KnowledgeBaseServiceError({
      type: 'permission',
      message: 'You do not have permission to access this data.',
      code: error.code,
      retryable: false,
    });
  }

  // Database errors
  if (error.code?.startsWith('PGRST') || error.code?.startsWith('23')) {
    return new KnowledgeBaseServiceError({
      type: 'database',
      message: 'Database error occurred. Please try again later.',
      code: error.code,
      retryable: true,
    });
  }

  // Unknown errors
  return new KnowledgeBaseServiceError({
    type: 'unknown',
    message: error.message || 'An unexpected error occurred.',
    code: error.code,
    retryable: true,
  });
}

/**
 * Fetch knowledge base statistics for a user
 */
export async function fetchKnowledgeBaseStats(userId: string): Promise<KnowledgeBaseStats> {
  if (!userId) {
    throw new KnowledgeBaseServiceError({
      type: 'permission',
      message: 'User ID is required to fetch knowledge base statistics.',
      retryable: false,
    });
  }

  try {
    // Fetch knowledge bases count - use basic fields first
    const { data: knowledgeBases, error: kbError } = await supabase
      .from('knowledge_bases')
      .select('id, documents_count, created_at')
      .eq('user_id', userId);

    if (kbError) {
      throw handleSupabaseError(kbError, 'fetchKnowledgeBaseStats - knowledge_bases');
    }

    // Fetch documents count and processing status
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, size_bytes, status, knowledge_base_id')
      .in('knowledge_base_id', knowledgeBases?.map(kb => kb.id) || []);

    if (docsError) {
      throw handleSupabaseError(docsError, 'fetchKnowledgeBaseStats - documents');
    }

    // Calculate statistics
    const totalBases = knowledgeBases?.length || 0;
    const totalDocuments = documents?.length || 0;
    const storageUsed = documents?.reduce((sum, doc) => sum + (doc.size_bytes || 0), 0) || 0;
    const processingQueue = documents?.filter(doc => doc.status === 'processing').length || 0;

    return {
      totalBases,
      totalDocuments,
      storageUsed,
      processingQueue,
    };
  } catch (error) {
    if (error instanceof KnowledgeBaseServiceError) {
      throw error;
    }
    throw handleSupabaseError(error, 'fetchKnowledgeBaseStats');
  }
}

/**
 * Fetch user's knowledge bases with document counts
 */
export async function fetchKnowledgeBases(userId: string): Promise<KnowledgeBase[]> {
  if (!userId) {
    throw new KnowledgeBaseServiceError({
      type: 'permission',
      message: 'User ID is required to fetch knowledge bases.',
      retryable: false,
    });
  }

  try {
    const { data: knowledgeBases, error: kbError } = await supabase
      .from('knowledge_bases')
      .select(`
        id,
        name,
        description,
        status,
        documents_count,
        created_at,
        updated_at,
        user_id
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (kbError) {
      throw handleSupabaseError(kbError, 'fetchKnowledgeBases - knowledge_bases');
    }

    if (!knowledgeBases || knowledgeBases.length === 0) {
      return [];
    }

    // Calculate total size from documents for each knowledge base
    const kbsWithSize = await Promise.all(
      knowledgeBases.map(async (kb) => {
        const { data: docs } = await supabase
          .from('documents')
          .select('size_bytes')
          .eq('knowledge_base_id', kb.id);
        
        const totalSize = docs?.reduce((sum, doc) => sum + (doc.size_bytes || 0), 0) || 0;
        
        return {
          id: kb.id,
          name: kb.name,
          description: kb.description || '',
          status: (kb.status as 'active' | 'processing' | 'error') || 'active',
          documentCount: kb.documents_count || 0,
          totalSize,
          lastUpdated: kb.updated_at,
          createdAt: kb.created_at,
          userId: kb.user_id,
        };
      })
    );

    return kbsWithSize;
  } catch (error) {
    if (error instanceof KnowledgeBaseServiceError) {
      throw error;
    }
    throw handleSupabaseError(error, 'fetchKnowledgeBases');
  }
}

/**
 * Fetch recent documents across all user's knowledge bases
 */
export async function fetchRecentDocuments(userId: string, limit: number = 10): Promise<Document[]> {
  if (!userId) {
    throw new KnowledgeBaseServiceError({
      type: 'permission',
      message: 'User ID is required to fetch recent documents.',
      retryable: false,
    });
  }

  try {
    // First get user's knowledge base IDs
    const { data: knowledgeBases, error: kbError } = await supabase
      .from('knowledge_bases')
      .select('id, name')
      .eq('user_id', userId);

    if (kbError) {
      throw handleSupabaseError(kbError, 'fetchRecentDocuments - knowledge_bases');
    }

    if (!knowledgeBases || knowledgeBases.length === 0) {
      return [];
    }

    const knowledgeBaseIds = knowledgeBases.map(kb => kb.id);
    const kbNameMap = knowledgeBases.reduce((acc, kb) => {
      acc[kb.id] = kb.name;
      return acc;
    }, {} as Record<string, string>);

    // Fetch recent documents
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select(`
        id,
        knowledge_base_id,
        name,
        size_bytes,
        status,
        created_at
      `)
      .in('knowledge_base_id', knowledgeBaseIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (docsError) {
      throw handleSupabaseError(docsError, 'fetchRecentDocuments - documents');
    }

    if (!documents) return [];

    return documents.map(doc => ({
      id: doc.id,
      knowledgeBaseId: doc.knowledge_base_id,
      filename: doc.name,
      fileSize: doc.size_bytes || 0,
      status: (doc.status as 'processing' | 'error' | 'processed') || 'processing',
      chunkCount: 0, // We don't have chunk count in this schema
      createdAt: doc.created_at,
      updatedAt: doc.created_at,
      knowledgeBaseName: kbNameMap[doc.knowledge_base_id],
    }));
  } catch (error) {
    if (error instanceof KnowledgeBaseServiceError) {
      throw error;
    }
    throw handleSupabaseError(error, 'fetchRecentDocuments');
  }
}

/**
 * Fetch all knowledge base data for the dashboard
 */
export async function fetchKnowledgeBaseData(userId: string): Promise<KnowledgeBaseData> {
  if (!userId) {
    throw new KnowledgeBaseServiceError({
      type: 'permission',
      message: 'User ID is required to fetch knowledge base data.',
      retryable: false,
    });
  }

  try {
    const [stats, knowledgeBases, recentDocuments] = await Promise.all([
      fetchKnowledgeBaseStats(userId),
      fetchKnowledgeBases(userId),
      fetchRecentDocuments(userId),
    ]);

    return {
      stats,
      knowledgeBases,
      recentDocuments,
    };
  } catch (error) {
    if (error instanceof KnowledgeBaseServiceError) {
      throw error;
    }
    throw handleSupabaseError(error, 'fetchKnowledgeBaseData');
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry non-retryable errors
      if (error instanceof KnowledgeBaseServiceError && !error.retryable) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format time ago for display
 */
export function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * Get status color for knowledge base or document status
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'processed':
      return 'bg-green-100 text-green-700';
    case 'processing':
      return 'bg-yellow-100 text-yellow-700';
    case 'error':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Get status icon for knowledge base or document status
 */
export function getStatusIcon(status: string): string {
  switch (status) {
    case 'active':
    case 'processed':
      return '✓';
    case 'processing':
      return '⏳';
    case 'error':
      return '⚠️';
    default:
      return '○';
  }
}

/**
 * Real-time update configuration
 */
export interface RealTimeUpdateConfig {
  enabled: boolean;
  interval: number; // milliseconds
  maxRetries: number;
  onUpdate?: (data: KnowledgeBaseData) => void;
  onError?: (error: KnowledgeBaseServiceError) => void;
}

/**
 * Real-time data updater class
 */
export class KnowledgeBaseRealTimeUpdater {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private retryCount = 0;
  private lastUpdateTime = 0;
  private config: RealTimeUpdateConfig;
  private userId: string;
  private knowledgeBaseIds?: string[];

  constructor(userId: string, config: RealTimeUpdateConfig, knowledgeBaseIds?: string[]) {
    this.userId = userId;
    this.config = config;
    this.knowledgeBaseIds = knowledgeBaseIds;
  }

  /**
   * Start real-time updates
   */
  start(): void {
    if (this.isRunning || !this.config.enabled) return;

    this.isRunning = true;
    this.retryCount = 0;
    this.scheduleNextUpdate();
  }

  /**
   * Stop real-time updates
   */
  stop(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.retryCount = 0;
  }

  /**
   * Force an immediate update
   */
  async forceUpdate(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const data = await fetchKnowledgeBaseData(this.userId);
      this.lastUpdateTime = Date.now();
      this.retryCount = 0;
      this.config.onUpdate?.(data);
    } catch (error) {
      const serviceError = error instanceof KnowledgeBaseServiceError 
        ? error 
        : handleSupabaseError(error, 'forceUpdate');
      
      this.handleUpdateError(serviceError);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RealTimeUpdateConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current status
   */
  getStatus(): {
    isRunning: boolean;
    retryCount: number;
    lastUpdateTime: number;
    nextUpdateIn: number;
  } {
    const nextUpdateIn = this.intervalId 
      ? Math.max(0, this.config.interval - (Date.now() - this.lastUpdateTime))
      : 0;

    return {
      isRunning: this.isRunning,
      retryCount: this.retryCount,
      lastUpdateTime: this.lastUpdateTime,
      nextUpdateIn,
    };
  }

  private scheduleNextUpdate(): void {
    if (!this.isRunning) return;

    this.intervalId = setTimeout(async () => {
      await this.performUpdate();
      this.scheduleNextUpdate();
    }, this.config.interval);
  }

  private async performUpdate(): Promise<void> {
    try {
      // Use the new real-time endpoint for better performance
      const response = await this.fetchRealTimeStatus();
      this.lastUpdateTime = Date.now();
      this.retryCount = 0;
      this.config.onUpdate?.(response);
    } catch (error) {
      const serviceError = error instanceof KnowledgeBaseServiceError 
        ? error 
        : handleSupabaseError(error, 'performUpdate');
      
      this.handleUpdateError(serviceError);
    }
  }

  private async fetchRealTimeStatus(): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new KnowledgeBaseServiceError({
        type: 'permission',
        message: 'Authentication required for real-time updates',
        retryable: false,
      });
    }

    const params = new URLSearchParams({
      userId: this.userId,
    });

    if (this.knowledgeBaseIds && this.knowledgeBaseIds.length > 0) {
      params.append('knowledgeBaseIds', this.knowledgeBaseIds.join(','));
    }

    const response = await fetch(`/.netlify/functions/knowledge-base-status?${params}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  private handleUpdateError(error: KnowledgeBaseServiceError): void {
    this.retryCount++;
    
    if (this.retryCount >= this.config.maxRetries) {
      this.stop();
    }
    
    this.config.onError?.(error);
  }
}

/**
 * Hook for managing real-time updates
 */
export function createRealTimeUpdater(
  userId: string, 
  config: RealTimeUpdateConfig,
  knowledgeBaseIds?: string[]
): KnowledgeBaseRealTimeUpdater {
  return new KnowledgeBaseRealTimeUpdater(userId, config, knowledgeBaseIds);
}

/**
 * Check if documents are currently processing
 */
export function hasProcessingDocuments(data: KnowledgeBaseData): boolean {
  return data.stats.processingQueue > 0 || 
         data.recentDocuments.some(doc => doc.status === 'processing');
}

/**
 * Get processing progress information
 */
export function getProcessingProgress(data: KnowledgeBaseData): {
  total: number;
  processing: number;
  completed: number;
  failed: number;
  percentage: number;
} {
  const processing = data.recentDocuments.filter(doc => doc.status === 'processing').length;
  const completed = data.recentDocuments.filter(doc => doc.status === 'processed').length;
  const failed = data.recentDocuments.filter(doc => doc.status === 'error').length;
  const total = data.stats.totalDocuments;
  
  const percentage = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

  return {
    total,
    processing,
    completed,
    failed,
    percentage,
  };
}