import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  AgentServiceError,
  getCapabilityLabels,
  getCapabilityIcons,
  formatAgentStatus,
  type AgentCapabilities,
  type UserAgent
} from './agent-service';

describe('Agent Service Utilities', () => {
  describe('getCapabilityLabels', () => {
    it('should return correct labels for enabled capabilities', () => {
      const capabilities: AgentCapabilities = {
        text: { enabled: true, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: true, provider: 'elevenlabs', voiceId: 'default' },
        image: { enabled: false },
        video: { enabled: false },
        tools: []
      };

      const labels = getCapabilityLabels(capabilities);
      expect(labels).toEqual(['Text', 'Voice']);
    });

    it('should return empty array when no capabilities are enabled', () => {
      const capabilities: AgentCapabilities = {
        text: { enabled: false, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: false, provider: 'elevenlabs', voiceId: 'default' },
        image: { enabled: false },
        video: { enabled: false },
        tools: []
      };

      const labels = getCapabilityLabels(capabilities);
      expect(labels).toEqual([]);
    });

    it('should return all labels when all capabilities are enabled', () => {
      const capabilities: AgentCapabilities = {
        text: { enabled: true, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: true, provider: 'elevenlabs', voiceId: 'default' },
        image: { enabled: true, provider: 'openai' },
        video: { enabled: true, provider: 'livekit' },
        tools: []
      };

      const labels = getCapabilityLabels(capabilities);
      expect(labels).toEqual(['Text', 'Voice', 'Image', 'Video']);
    });
  });

  describe('getCapabilityIcons', () => {
    it('should return correct icons for enabled capabilities', () => {
      const capabilities: AgentCapabilities = {
        text: { enabled: true, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: true, provider: 'elevenlabs', voiceId: 'default' },
        image: { enabled: false },
        video: { enabled: false },
        tools: []
      };

      const icons = getCapabilityIcons(capabilities);
      expect(icons).toEqual(['💬', '🎤']);
    });

    it('should return all icons when all capabilities are enabled', () => {
      const capabilities: AgentCapabilities = {
        text: { enabled: true, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: true, provider: 'elevenlabs', voiceId: 'default' },
        image: { enabled: true, provider: 'openai' },
        video: { enabled: true, provider: 'livekit' },
        tools: []
      };

      const icons = getCapabilityIcons(capabilities);
      expect(icons).toEqual(['💬', '🎤', '🖼️', '📹']);
    });
  });

  describe('formatAgentStatus', () => {
    it('should format draft status correctly', () => {
      const status = formatAgentStatus('draft');
      expect(status).toEqual({
        label: 'Draft',
        color: 'gray',
        icon: '📝'
      });
    });

    it('should format active status correctly', () => {
      const status = formatAgentStatus('active');
      expect(status).toEqual({
        label: 'Active',
        color: 'green',
        icon: '✅'
      });
    });

    it('should format testing status correctly', () => {
      const status = formatAgentStatus('testing');
      expect(status).toEqual({
        label: 'Testing',
        color: 'yellow',
        icon: '🧪'
      });
    });

    it('should format paused status correctly', () => {
      const status = formatAgentStatus('paused');
      expect(status).toEqual({
        label: 'Paused',
        color: 'orange',
        icon: '⏸️'
      });
    });

    it('should format error status correctly', () => {
      const status = formatAgentStatus('error');
      expect(status).toEqual({
        label: 'Error',
        color: 'red',
        icon: '❌'
      });
    });

    it('should handle unknown status', () => {
      const status = formatAgentStatus('unknown' as any);
      expect(status).toEqual({
        label: 'Unknown',
        color: 'gray',
        icon: '❓'
      });
    });
  });

  describe('AgentServiceError', () => {
    it('should create error with correct properties', () => {
      const error = new AgentServiceError({
        type: 'network',
        message: 'Network error',
        code: 'NET001',
        retryable: true,
      });

      expect(error.name).toBe('AgentServiceError');
      expect(error.type).toBe('network');
      expect(error.message).toBe('Network error');
      expect(error.code).toBe('NET001');
      expect(error.retryable).toBe(true);
    });

    it('should create error without code', () => {
      const error = new AgentServiceError({
        type: 'validation',
        message: 'Validation failed',
        retryable: false,
      });

      expect(error.name).toBe('AgentServiceError');
      expect(error.type).toBe('validation');
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBeUndefined();
      expect(error.retryable).toBe(false);
    });
  });
});