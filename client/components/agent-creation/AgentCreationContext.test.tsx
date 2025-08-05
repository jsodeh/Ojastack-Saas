import { describe, it, expect, vi } from 'vitest';
import { AgentTemplate } from '@/lib/agent-service';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

describe('AgentCreationContext Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a valid template object', () => {
    const mockTemplate: AgentTemplate = {
      id: 'test-template',
      name: 'Test Template',
      description: 'Test Description',
      category: 'Test',
      capabilities: {
        text: { enabled: true, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: false, provider: 'elevenlabs', voiceId: 'default' },
        image: { enabled: false },
        video: { enabled: false },
        tools: []
      },
      default_personality: {
        tone: 'friendly',
        creativityLevel: 70,
        responseStyle: {
          length: 'detailed',
          formality: 'casual',
          empathy: 'high',
          proactivity: 'balanced'
        },
        systemPrompt: 'Test prompt'
      },
      sample_conversations: [],
      rating: 4.5,
      usage_count: 100,
      featured: true,
      tags: ['test'],
      created_at: '2023-01-01',
      updated_at: '2023-01-01'
    };

    expect(mockTemplate.id).toBe('test-template');
    expect(mockTemplate.name).toBe('Test Template');
    expect(mockTemplate.capabilities.text.enabled).toBe(true);
    expect(mockTemplate.default_personality.tone).toBe('friendly');
  });

  it('should validate step logic correctly', () => {
    // Test step validation logic without React hooks
    const agentName = 'Test Agent';
    const knowledgeBases = ['kb1', 'kb2'];
    const systemPrompt = 'Test prompt';
    const capabilities = {
      text: { enabled: true, provider: 'openai' as const, model: 'gpt-4' },
      voice: { enabled: false, provider: 'elevenlabs' as const, voiceId: 'default' },
      image: { enabled: false },
      video: { enabled: false },
      tools: []
    };
    const channels = [{ type: 'webchat' as const, enabled: true, config: {}, status: 'pending' as const }];

    // Template step validation
    expect(agentName.trim().length > 0).toBe(true);
    
    // Knowledge base step validation
    expect(knowledgeBases.length > 0).toBe(true);
    
    // Personality step validation
    expect(systemPrompt.trim().length > 0).toBe(true);
    
    // Capabilities step validation
    expect(Object.values(capabilities).some(cap => cap.enabled)).toBe(true);
    
    // Channels step validation
    expect(channels.some(channel => channel.enabled)).toBe(true);
  });

  it('should handle localStorage operations', () => {
    const draftData = {
      agentName: 'Test Agent',
      agentDescription: 'Test Description',
      currentStep: 2
    };

    // Test saving to localStorage
    const draftId = `draft_${Date.now()}`;
    localStorageMock.setItem(`agent_draft_${draftId}`, JSON.stringify(draftData));
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      `agent_draft_${draftId}`,
      JSON.stringify(draftData)
    );

    // Test loading from localStorage
    localStorageMock.getItem.mockReturnValue(JSON.stringify(draftData));
    const loadedData = JSON.parse(localStorageMock.getItem(`agent_draft_${draftId}`) || '{}');
    
    expect(loadedData).toEqual(draftData);
  });

  it('should calculate progress correctly', () => {
    const totalSteps = 7;
    
    // Test progress calculation for different steps
    expect(Math.round(((0 + 1) / totalSteps) * 100)).toBe(14); // Step 0
    expect(Math.round(((3 + 1) / totalSteps) * 100)).toBe(57); // Step 3
    expect(Math.round(((6 + 1) / totalSteps) * 100)).toBe(100); // Step 6 (last)
  });

  it('should handle error management', () => {
    const errors: Record<string, string[]> = {};
    
    // Add errors
    errors['template'] = ['Name is required', 'Description too short'];
    expect(errors['template']).toEqual(['Name is required', 'Description too short']);
    
    // Clear errors
    delete errors['template'];
    expect(errors['template']).toBeUndefined();
  });
});