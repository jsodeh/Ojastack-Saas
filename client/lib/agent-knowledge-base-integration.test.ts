import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  agentKnowledgeBaseIntegration,
  getKnowledgeBaseRequirementsForAgent,
  formatValidationResult,
  type AgentKnowledgeBaseConfig,
  type UploadedDocument,
  type KnowledgeBaseValidationResult
} from './agent-knowledge-base-integration';
import { type AgentCapabilities } from './agent-service';
import { type KnowledgeBase } from './knowledge-base-service';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        in: vi.fn(() => ({})),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      upsert: vi.fn(),
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({
        data: { session: { access_token: 'mock-token' } }
      })),
    },
  },
}));

// Mock knowledge base service
vi.mock('./knowledge-base-service', () => ({
  fetchKnowledgeBases: vi.fn(),
  KnowledgeBaseServiceError: class extends Error {
    constructor(error: any) {
      super(error.message);
      this.type = error.type;
      this.retryable = error.retryable;
    }
  },
  createRealTimeUpdater: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    forceUpdate: vi.fn(),
  })),
}));

// Mock file processing service
vi.mock('./file-processing-service', () => ({
  fileProcessingService: {
    onProcessingUpdate: vi.fn(() => vi.fn()),
  },
}));

describe('AgentKnowledgeBaseIntegration', () => {
  const mockUserId = 'user-123';
  const mockKnowledgeBases: KnowledgeBase[] = [
    {
      id: 'kb-1',
      name: 'Test KB 1',
      description: 'Test knowledge base 1',
      status: 'active',
      documentCount: 5,
      totalSize: 1024 * 1024, // 1MB
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      userId: mockUserId,
    },
    {
      id: 'kb-2',
      name: 'Test KB 2',
      description: 'Test knowledge base 2',
      status: 'processing',
      documentCount: 3,
      totalSize: 2 * 1024 * 1024, // 2MB
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      userId: mockUserId,
    },
  ];

  const mockUploadedDocs: UploadedDocument[] = [
    {
      id: 'doc-1',
      fileName: 'test.pdf',
      fileSize: 500 * 1024, // 500KB
      fileType: 'application/pdf',
      status: 'completed',
      progress: 100,
    },
    {
      id: 'doc-2',
      fileName: 'test.docx',
      fileSize: 300 * 1024, // 300KB
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      status: 'processing',
      progress: 50,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    agentKnowledgeBaseIntegration.cleanup();
  });

  describe('validateKnowledgeBaseSelection', () => {
    it('should validate successful configuration', () => {
      const capabilities: AgentCapabilities = {
        text: { enabled: true, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: false, provider: 'elevenlabs', voiceId: '' },
        image: { enabled: false },
        video: { enabled: false },
        tools: [],
      };

      const requirements = {
        minDocuments: 1,
        maxDocuments: 20,
        maxTotalSize: 10 * 1024 * 1024, // 10MB
      };

      const result = agentKnowledgeBaseIntegration.validateKnowledgeBaseSelection(
        mockKnowledgeBases,
        mockUploadedDocs,
        requirements,
        capabilities
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect minimum documents violation', () => {
      const capabilities: AgentCapabilities = {
        text: { enabled: true, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: false, provider: 'elevenlabs', voiceId: '' },
        image: { enabled: false },
        video: { enabled: false },
        tools: [],
      };

      const requirements = {
        minDocuments: 15, // More than available
        maxTotalSize: 10 * 1024 * 1024,
      };

      const result = agentKnowledgeBaseIntegration.validateKnowledgeBaseSelection(
        mockKnowledgeBases,
        mockUploadedDocs,
        requirements,
        capabilities
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least 15 documents are required. Currently have 10.');
    });

    it('should detect maximum size violation', () => {
      const capabilities: AgentCapabilities = {
        text: { enabled: true, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: false, provider: 'elevenlabs', voiceId: '' },
        image: { enabled: false },
        video: { enabled: false },
        tools: [],
      };

      const requirements = {
        minDocuments: 1,
        maxTotalSize: 1024 * 1024, // 1MB - less than total
      };

      const result = agentKnowledgeBaseIntegration.validateKnowledgeBaseSelection(
        mockKnowledgeBases,
        mockUploadedDocs,
        requirements,
        capabilities
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Maximum'))).toBe(true);
    });

    it('should provide recommendations for image capabilities', () => {
      const capabilities: AgentCapabilities = {
        text: { enabled: true, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: false, provider: 'elevenlabs', voiceId: '' },
        image: { enabled: true }, // Image enabled but no image docs
        video: { enabled: false },
        tools: [],
      };

      const requirements = {
        minDocuments: 1,
        maxTotalSize: 10 * 1024 * 1024,
      };

      const result = agentKnowledgeBaseIntegration.validateKnowledgeBaseSelection(
        mockKnowledgeBases,
        mockUploadedDocs,
        requirements,
        capabilities
      );

      expect(result.recommendations).toContain(
        'Consider adding image documents to enhance visual processing capabilities.'
      );
    });
  });

  describe('getKnowledgeBaseRequirementsForAgent', () => {
    it('should return basic requirements for text-only agent', () => {
      const capabilities: AgentCapabilities = {
        text: { enabled: true, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: false, provider: 'elevenlabs', voiceId: '' },
        image: { enabled: false },
        video: { enabled: false },
        tools: [],
      };

      const requirements = getKnowledgeBaseRequirementsForAgent(capabilities);

      expect(requirements.minDocuments).toBe(1);
      expect(requirements.maxTotalSize).toBe(500 * 1024 * 1024); // 500MB
    });

    it('should adjust requirements for image-enabled agent', () => {
      const capabilities: AgentCapabilities = {
        text: { enabled: true, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: false, provider: 'elevenlabs', voiceId: '' },
        image: { enabled: true },
        video: { enabled: false },
        tools: [],
      };

      const requirements = getKnowledgeBaseRequirementsForAgent(capabilities);

      expect(requirements.requiredFileTypes).toContain('image/jpeg');
      expect(requirements.requiredFileTypes).toContain('image/png');
      expect(requirements.maxTotalSize).toBe(1024 * 1024 * 1024); // 1GB
    });

    it('should adjust requirements for voice-enabled agent', () => {
      const capabilities: AgentCapabilities = {
        text: { enabled: true, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: true, provider: 'elevenlabs', voiceId: 'voice-1' },
        image: { enabled: false },
        video: { enabled: false },
        tools: [],
      };

      const requirements = getKnowledgeBaseRequirementsForAgent(capabilities);

      expect(requirements.minDocuments).toBe(5); // More context for voice
    });

    it('should adjust requirements for video-enabled agent', () => {
      const capabilities: AgentCapabilities = {
        text: { enabled: true, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: false, provider: 'elevenlabs', voiceId: '' },
        image: { enabled: false },
        video: { enabled: true },
        tools: [],
      };

      const requirements = getKnowledgeBaseRequirementsForAgent(capabilities);

      expect(requirements.maxTotalSize).toBe(2 * 1024 * 1024 * 1024); // 2GB
    });
  });

  describe('formatValidationResult', () => {
    it('should format valid result', () => {
      const result: KnowledgeBaseValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        recommendations: [],
      };

      const formatted = formatValidationResult(result);
      expect(formatted).toBe('Configuration is valid');
    });

    it('should format result with errors', () => {
      const result: KnowledgeBaseValidationResult = {
        isValid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: ['Warning 1'],
        recommendations: ['Recommendation 1'],
      };

      const formatted = formatValidationResult(result);
      expect(formatted).toContain('Errors: Error 1, Error 2');
      expect(formatted).toContain('Warnings: Warning 1');
      expect(formatted).toContain('Recommendations: Recommendation 1');
    });

    it('should format result with only warnings', () => {
      const result: KnowledgeBaseValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Warning 1', 'Warning 2'],
        recommendations: [],
      };

      const formatted = formatValidationResult(result);
      expect(formatted).toBe('Warnings: Warning 1, Warning 2');
    });
  });

  describe('real-time monitoring', () => {
    it('should start and stop monitoring', () => {
      const sessionId = 'test-session';
      const onUpdate = vi.fn();
      const onError = vi.fn();

      agentKnowledgeBaseIntegration.startRealTimeMonitoring(
        mockUserId,
        sessionId,
        onUpdate,
        onError
      );

      // Should have started monitoring
      expect(agentKnowledgeBaseIntegration['realTimeUpdaters'].has(sessionId)).toBe(true);

      agentKnowledgeBaseIntegration.stopRealTimeMonitoring(sessionId);

      // Should have stopped monitoring
      expect(agentKnowledgeBaseIntegration['realTimeUpdaters'].has(sessionId)).toBe(false);
    });
  });

  describe('file processing monitoring', () => {
    it('should monitor file processing status', () => {
      const documentId = 'doc-123';
      const onProgress = vi.fn();

      const unsubscribe = agentKnowledgeBaseIntegration.monitorFileProcessing(
        documentId,
        onProgress
      );

      expect(typeof unsubscribe).toBe('function');
      
      // Should have registered listener
      expect(agentKnowledgeBaseIntegration['uploadListeners'].has(documentId)).toBe(true);

      // Cleanup
      unsubscribe();
    });
  });

  describe('processing progress', () => {
    it('should calculate processing progress correctly', async () => {
      // Mock the Supabase response
      const mockSupabase = await import('./supabase');
      vi.mocked(mockSupabase.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'doc-1', status: 'processed' },
              { id: 'doc-2', status: 'processing' },
              { id: 'doc-3', status: 'error' },
              { id: 'doc-4', status: 'processed' },
            ],
            error: null,
          }),
        }),
      } as any);

      const progress = await agentKnowledgeBaseIntegration.getKnowledgeBaseProcessingProgress([
        'kb-1', 'kb-2'
      ]);

      expect(progress.total).toBe(4);
      expect(progress.processing).toBe(1);
      expect(progress.completed).toBe(2);
      expect(progress.failed).toBe(1);
      expect(progress.percentage).toBe(75); // (2 + 1) / 4 * 100
    });
  });
});

describe('Integration with Agent Creation', () => {
  const testUploadedDocs: UploadedDocument[] = [
    {
      id: 'doc-1',
      fileName: 'test.pdf',
      fileSize: 500 * 1024,
      fileType: 'application/pdf',
      status: 'completed',
      progress: 100,
    },
  ];

  it('should integrate with agent creation workflow', async () => {
    const mockConfig: AgentKnowledgeBaseConfig = {
      selectedKnowledgeBases: ['kb-1', 'kb-2'],
      uploadedDocuments: testUploadedDocs,
      requirements: {
        minDocuments: 1,
        maxTotalSize: 10 * 1024 * 1024,
      },
      validationResult: {
        isValid: true,
        errors: [],
        warnings: [],
        recommendations: [],
      },
    };

    // Mock successful validation
    const testKnowledgeBases = [
      {
        id: 'kb-1',
        name: 'Test KB 1',
        description: 'Test knowledge base 1',
        status: 'active',
        documents_count: 5,
        total_size_bytes: 1024 * 1024,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'user-123',
      },
    ];

    const mockSupabase = await import('./supabase');
    vi.mocked(mockSupabase.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: testKnowledgeBases,
          error: null,
        }),
      }),
    } as any);

    const result = await agentKnowledgeBaseIntegration.validateAgentKnowledgeBaseConfig(
      'user-123',
      mockConfig
    );

    expect(result.isValid).toBe(true);
  });

  it('should handle permission validation', async () => {
    const mockConfig: AgentKnowledgeBaseConfig = {
      selectedKnowledgeBases: ['kb-other-user'],
      uploadedDocuments: [],
      requirements: {
        minDocuments: 1,
      },
      validationResult: {
        isValid: false,
        errors: [],
        warnings: [],
        recommendations: [],
      },
    };

    // Mock knowledge base owned by different user
    const mockSupabase = await import('./supabase');
    const mockFrom = vi.fn();
    const mockSelect = vi.fn();
    const mockIn = vi.fn();
    const mockEq = vi.fn();
    const mockSingle = vi.fn();

    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ in: mockIn });
    mockIn.mockResolvedValue({
      data: [{
        id: 'kb-other-user',
        name: 'Other User KB',
        description: 'KB owned by another user',
        status: 'active',
        documents_count: 5,
        total_size_bytes: 1024 * 1024,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'other-user-id',
      }],
      error: null,
    });

    // Mock the permission check to return no permission
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });

    vi.mocked(mockSupabase.supabase.from).mockImplementation(mockFrom);

    try {
      await agentKnowledgeBaseIntegration.validateAgentKnowledgeBaseConfig(
        'user-123',
        mockConfig
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Failed to validate');
    }
  });
});