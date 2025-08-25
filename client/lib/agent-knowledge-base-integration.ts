import { supabase } from './supabase';
import { 
  KnowledgeBase, 
  fetchKnowledgeBases,
  KnowledgeBaseServiceError,
  createRealTimeUpdater,
  type RealTimeUpdateConfig
} from './knowledge-base-service';
import { fileProcessingService, type ProcessingStatus } from './file-processing-service';
import { type UserAgent, type AgentCapabilities } from './agent-service';

// Types for agent-specific knowledge base integration
export interface AgentKnowledgeBaseRequirement {
  minDocuments?: number;
  maxDocuments?: number;
  requiredFileTypes?: string[];
  maxTotalSize?: number; // in bytes
  requiredCapabilities?: string[];
}

export interface KnowledgeBaseValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface AgentKnowledgeBaseConfig {
  selectedKnowledgeBases: string[];
  uploadedDocuments: UploadedDocument[];
  requirements: AgentKnowledgeBaseRequirement;
  validationResult: KnowledgeBaseValidationResult;
}

export interface UploadedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  knowledgeBaseId?: string;
  processingStatus?: ProcessingStatus;
  error?: string;
}

export interface KnowledgeBasePermission {
  id: string;
  knowledgeBaseId: string;
  userId: string;
  permission: 'read' | 'write' | 'admin';
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
}

export interface SharedKnowledgeBase extends KnowledgeBase {
  permission: 'read' | 'write' | 'admin';
  sharedBy: string;
  sharedAt: string;
}

/**
 * Agent Knowledge Base Integration Service
 * Handles the integration between agent creation and knowledge base management
 */
export class AgentKnowledgeBaseIntegration {
  private static instance: AgentKnowledgeBaseIntegration;
  private realTimeUpdaters: Map<string, any> = new Map();
  private uploadListeners: Map<string, ((status: ProcessingStatus) => void)[]> = new Map();

  private constructor() {}

  public static getInstance(): AgentKnowledgeBaseIntegration {
    if (!AgentKnowledgeBaseIntegration.instance) {
      AgentKnowledgeBaseIntegration.instance = new AgentKnowledgeBaseIntegration();
    }
    return AgentKnowledgeBaseIntegration.instance;
  }

  /**
   * Get knowledge bases available for agent creation
   * Includes both owned and shared knowledge bases
   */
  async getAvailableKnowledgeBases(userId: string): Promise<{
    owned: KnowledgeBase[];
    shared: SharedKnowledgeBase[];
  }> {
    try {
      // Get owned knowledge bases
      const owned = await fetchKnowledgeBases(userId);

      // Shared knowledge bases feature is disabled due to schema limitations
      // TODO: Implement when knowledge_base_permissions table is created
      const shared: SharedKnowledgeBase[] = [];

      return { owned, shared };
    } catch (error) {
      throw new KnowledgeBaseServiceError({
        type: 'database',
        message: 'Failed to fetch available knowledge bases',
        retryable: true,
      });
    }
  }

  /**
   * Validate knowledge base selection for agent requirements
   */
  validateKnowledgeBaseSelection(
    selectedKBs: KnowledgeBase[],
    uploadedDocs: UploadedDocument[],
    requirements: AgentKnowledgeBaseRequirement,
    capabilities: AgentCapabilities
  ): KnowledgeBaseValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const totalDocuments = selectedKBs.reduce((sum, kb) => sum + kb.documentCount, 0) + uploadedDocs.length;
    const totalSize = selectedKBs.reduce((sum, kb) => sum + kb.totalSize, 0) + 
                     uploadedDocs.reduce((sum, doc) => sum + doc.fileSize, 0);

    // Check minimum documents requirement
    if (requirements.minDocuments && totalDocuments < requirements.minDocuments) {
      errors.push(`At least ${requirements.minDocuments} documents are required. Currently have ${totalDocuments}.`);
    }

    // Check maximum documents requirement
    if (requirements.maxDocuments && totalDocuments > requirements.maxDocuments) {
      errors.push(`Maximum ${requirements.maxDocuments} documents allowed. Currently have ${totalDocuments}.`);
    }

    // Check maximum total size
    if (requirements.maxTotalSize && totalSize > requirements.maxTotalSize) {
      const maxSizeMB = Math.round(requirements.maxTotalSize / (1024 * 1024));
      const currentSizeMB = Math.round(totalSize / (1024 * 1024));
      errors.push(`Maximum ${maxSizeMB}MB total size allowed. Currently have ${currentSizeMB}MB.`);
    }

    // Check required file types
    if (requirements.requiredFileTypes && requirements.requiredFileTypes.length > 0) {
      const uploadedFileTypes = [...new Set(uploadedDocs.map(doc => doc.fileType))];
      const missingTypes = requirements.requiredFileTypes.filter(type => 
        !uploadedFileTypes.includes(type)
      );
      
      if (missingTypes.length > 0) {
        warnings.push(`Consider adding files of type: ${missingTypes.join(', ')}`);
      }
    }

    // Check capability-specific requirements
    if (capabilities.image?.enabled && totalDocuments > 0) {
      const hasImageDocs = uploadedDocs.some(doc => doc.fileType.startsWith('image/'));
      if (!hasImageDocs) {
        recommendations.push('Consider adding image documents to enhance visual processing capabilities.');
      }
    }

    if (capabilities.text?.enabled && totalDocuments === 0) {
      warnings.push('No documents selected. Agent will have limited contextual knowledge.');
    }

    // Performance recommendations
    if (totalDocuments > 100) {
      recommendations.push('Large number of documents may impact response time. Consider organizing into focused knowledge bases.');
    }

    if (totalSize > 100 * 1024 * 1024) { // 100MB
      recommendations.push('Large knowledge base size may impact processing time. Consider optimizing document sizes.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  }

  /**
   * Create a new knowledge base from uploaded documents during agent creation
   */
  async createKnowledgeBaseFromUploads(
    userId: string,
    agentName: string,
    uploadedDocs: UploadedDocument[]
  ): Promise<string> {
    try {
      // Create knowledge base
      const { data: kb, error: kbError } = await supabase
        .from('knowledge_bases')
        .insert({
          name: `${agentName} Knowledge Base`,
          description: `Knowledge base created for agent: ${agentName}`,
          user_id: userId,
          status: 'processing',
          documents_count: uploadedDocs.length,
        })
        .select()
        .single();

      if (kbError) {
        throw new KnowledgeBaseServiceError({
          type: 'database',
          message: 'Failed to create knowledge base',
          retryable: true,
        });
      }

      // Link uploaded documents to the knowledge base
      // Note: This is a simplified approach due to schema limitations
      for (const doc of uploadedDocs) {
        try {
          await supabase
            .from('documents')
            .update({ knowledge_base_id: kb.id })
            .eq('id', doc.id);
        } catch (updateError) {
          console.warn(`Failed to link document ${doc.id} to knowledge base:`, updateError);
        }
      }

      return kb.id;
    } catch (error) {
      if (error instanceof KnowledgeBaseServiceError) {
        throw error;
      }
      throw new KnowledgeBaseServiceError({
        type: 'database',
        message: 'Failed to create knowledge base from uploads',
        retryable: true,
      });
    }
  }

  /**
   * Start real-time monitoring for knowledge base updates during agent creation
   */
  startRealTimeMonitoring(
    userId: string,
    sessionId: string,
    onUpdate: (data: any) => void,
    onError: (error: KnowledgeBaseServiceError) => void
  ): void {
    const config: RealTimeUpdateConfig = {
      enabled: true,
      interval: 2000, // 2 seconds for agent creation
      maxRetries: 5,
      onUpdate,
      onError,
    };

    const updater = createRealTimeUpdater(userId, config);
    updater.start();
    
    this.realTimeUpdaters.set(sessionId, updater);
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring(sessionId: string): void {
    const updater = this.realTimeUpdaters.get(sessionId);
    if (updater) {
      updater.stop();
      this.realTimeUpdaters.delete(sessionId);
    }
  }

  /**
   * Monitor file processing status for uploaded documents
   */
  monitorFileProcessing(
    documentId: string,
    onProgress: (status: ProcessingStatus) => void
  ): () => void {
    const unsubscribe = fileProcessingService.onProcessingUpdate(documentId, onProgress);
    
    // Store listener for cleanup
    if (!this.uploadListeners.has(documentId)) {
      this.uploadListeners.set(documentId, []);
    }
    this.uploadListeners.get(documentId)!.push(onProgress);

    return () => {
      unsubscribe();
      const listeners = this.uploadListeners.get(documentId);
      if (listeners) {
        const index = listeners.indexOf(onProgress);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Check if knowledge bases are ready for agent deployment
   */
  async checkKnowledgeBaseReadiness(knowledgeBaseIds: string[]): Promise<{
    ready: boolean;
    processing: string[];
    errors: string[];
  }> {
    try {
      const { data: kbs, error } = await supabase
        .from('knowledge_bases')
        .select('id, name, status')
        .in('id', knowledgeBaseIds);

      if (error) {
        throw new KnowledgeBaseServiceError({
          type: 'database',
          message: 'Failed to check knowledge base readiness',
          retryable: true,
        });
      }

      const processing = kbs?.filter(kb => kb.status === 'processing').map(kb => kb.name) || [];
      const errors = kbs?.filter(kb => kb.status === 'error').map(kb => kb.name) || [];
      const ready = processing.length === 0 && errors.length === 0;

      return { ready, processing, errors };
    } catch (error) {
      if (error instanceof KnowledgeBaseServiceError) {
        throw error;
      }
      throw new KnowledgeBaseServiceError({
        type: 'database',
        message: 'Failed to check knowledge base readiness',
        retryable: true,
      });
    }
  }

  /**
   * Share knowledge base with another user
   */
  async shareKnowledgeBase(
    knowledgeBaseId: string,
    targetUserId: string,
    permission: 'read' | 'write',
    grantedBy: string
  ): Promise<void> {
    // Knowledge base sharing is disabled due to schema limitations
    // TODO: Implement when knowledge_base_permissions table is created
    throw new KnowledgeBaseServiceError({
      type: 'database',
      message: 'Knowledge base sharing is not available yet',
      retryable: false,
    });
  }

  /**
   * Get knowledge base permissions for a user
   */
  async getKnowledgeBasePermissions(userId: string): Promise<KnowledgeBasePermission[]> {
    // Knowledge base permissions are disabled due to schema limitations
    // TODO: Implement when knowledge_base_permissions table is created
    return [];
  }

  /**
   * Validate agent knowledge base configuration
   */
  async validateAgentKnowledgeBaseConfig(
    userId: string,
    config: AgentKnowledgeBaseConfig
  ): Promise<KnowledgeBaseValidationResult> {
    try {
      // Get selected knowledge bases
      const { data: kbs, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .in('id', config.selectedKnowledgeBases);

      if (error) {
        throw new KnowledgeBaseServiceError({
          type: 'database',
          message: 'Failed to validate knowledge base configuration',
          retryable: true,
        });
      }

      const knowledgeBases: KnowledgeBase[] = await Promise.all((kbs || []).map(async kb => {
        // Calculate total size from documents
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
      }));

      // Simplified validation - only check if user owns the knowledge bases
      const accessErrors: string[] = [];
      for (const kb of knowledgeBases) {
        if (kb.userId !== userId) {
          accessErrors.push(`No permission to access knowledge base: ${kb.name}`);
        }
      }

      if (accessErrors.length > 0) {
        return {
          isValid: false,
          errors: accessErrors,
          warnings: [],
          recommendations: [],
        };
      }

      // Perform standard validation
      return this.validateKnowledgeBaseSelection(
        knowledgeBases,
        config.uploadedDocuments,
        config.requirements,
        { text: { enabled: true, provider: 'openai', model: 'gpt-4' } } as AgentCapabilities
      );
    } catch (error) {
      if (error instanceof KnowledgeBaseServiceError) {
        throw error;
      }
      throw new KnowledgeBaseServiceError({
        type: 'database',
        message: 'Failed to validate agent knowledge base configuration',
        retryable: true,
      });
    }
  }

  /**
   * Get processing progress for all documents in knowledge bases
   */
  async getKnowledgeBaseProcessingProgress(knowledgeBaseIds: string[]): Promise<{
    total: number;
    processing: number;
    completed: number;
    failed: number;
    percentage: number;
  }> {
    try {
      const { data: documents, error } = await supabase
        .from('documents')
        .select('id, status')
        .in('knowledge_base_id', knowledgeBaseIds);

      if (error) {
        throw new KnowledgeBaseServiceError({
          type: 'database',
          message: 'Failed to get processing progress',
          retryable: true,
        });
      }

      const total = documents?.length || 0;
      const processing = documents?.filter(doc => doc.status === 'processing').length || 0;
      const completed = documents?.filter(doc => doc.status === 'processed').length || 0;
      const failed = documents?.filter(doc => doc.status === 'error').length || 0;
      const percentage = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

      return { total, processing, completed, failed, percentage };
    } catch (error) {
      if (error instanceof KnowledgeBaseServiceError) {
        throw error;
      }
      throw new KnowledgeBaseServiceError({
        type: 'database',
        message: 'Failed to get processing progress',
        retryable: true,
      });
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Stop all real-time updaters
    this.realTimeUpdaters.forEach(updater => updater.stop());
    this.realTimeUpdaters.clear();

    // Clear upload listeners
    this.uploadListeners.clear();
  }
}

// Export singleton instance
export const agentKnowledgeBaseIntegration = AgentKnowledgeBaseIntegration.getInstance();

// Utility functions
export function getKnowledgeBaseRequirementsForAgent(capabilities: AgentCapabilities): AgentKnowledgeBaseRequirement {
  const requirements: AgentKnowledgeBaseRequirement = {
    minDocuments: 1,
    maxTotalSize: 500 * 1024 * 1024, // 500MB default
  };

  // Adjust requirements based on capabilities
  if (capabilities.image?.enabled) {
    requirements.requiredFileTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    requirements.maxTotalSize = 1024 * 1024 * 1024; // 1GB for image processing
  }

  if (capabilities.voice?.enabled) {
    requirements.minDocuments = 5; // More context needed for voice interactions
  }

  if (capabilities.video?.enabled) {
    requirements.maxTotalSize = 2 * 1024 * 1024 * 1024; // 2GB for video processing
  }

  return requirements;
}

export function formatValidationResult(result: KnowledgeBaseValidationResult): string {
  const messages: string[] = [];
  
  if (result.errors.length > 0) {
    messages.push(`Errors: ${result.errors.join(', ')}`);
  }
  
  if (result.warnings.length > 0) {
    messages.push(`Warnings: ${result.warnings.join(', ')}`);
  }
  
  if (result.recommendations.length > 0) {
    messages.push(`Recommendations: ${result.recommendations.join(', ')}`);
  }

  return messages.join(' | ') || 'Configuration is valid';
}