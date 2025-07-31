/**
 * Multimodal Conversation Manager
 * Handles seamless switching between text, voice, and video conversations
 */

import { videoConversationManager } from './video-conversation-manager';
import { voiceConversationManager } from './voice-conversation-manager';
import { conversationManager } from './conversation-manager';
import { enhancedAIService, type AIMessage } from './enhanced-ai-service';

type ConversationMode = 'text' | 'voice' | 'video';

interface MultimodalSession {
  id: string;
  currentMode: ConversationMode;
  availableModes: ConversationMode[];
  conversationHistory: AIMessage[];
  context: {
    agentConfig: {
      name: string;
      personality: string;
      voice?: string;
      avatar?: string;
    };
    userPreferences: {
      preferredMode: ConversationMode;
      autoSwitch: boolean;
      qualityAdaptation: boolean;
    };
  };
  activeConnections: {
    text?: string; // conversation ID
    voice?: string; // session ID
    video?: string; // room name
  };
  metrics: {
    startTime: Date;
    modeChanges: number;
    totalMessages: number;
    averageResponseTime: number;
    qualityScore: number;
  };
}

class MultimodalConversationManager {
  private activeSessions: Map<string, MultimodalSession> = new Map();
  private modeTransitionCallbacks: Map<string, (from: ConversationMode, to: ConversationMode) => void> = new Map();

  /**
   * Start a new multimodal conversation session
   */
  async startSession(config: {
    agentConfig: MultimodalSession['context']['agentConfig'];
    userPreferences: MultimodalSession['context']['userPreferences'];
    initialMode?: ConversationMode;
  }): Promise<string> {
    const sessionId = `multimodal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session: MultimodalSession = {
      id: sessionId,
      currentMode: config.initialMode || config.userPreferences.preferredMode,
      availableModes: await this.getAvailableModes(),
      conversationHistory: [{
        role: 'system',
        content: `You are ${config.agentConfig.name}, a ${config.agentConfig.personality} AI assistant. You can communicate through text, voice, and video. Adapt your responses based on the current communication mode.`
      }],
      context: {
        agentConfig: config.agentConfig,
        userPreferences: config.userPreferences
      },
      activeConnections: {},
      metrics: {
        startTime: new Date(),
        modeChanges: 0,
        totalMessages: 0,
        averageResponseTime: 0,
        qualityScore: 1.0
      }
    };

    this.activeSessions.set(sessionId, session);

    // Initialize the first mode
    await this.switchMode(sessionId, session.currentMode);

    return sessionId;
  }

  /**
   * Switch conversation mode
   */
  async switchMode(sessionId: string, newMode: ConversationMode): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!session.availableModes.includes(newMode)) {
      throw new Error(`Mode ${newMode} not available`);
    }

    const oldMode = session.currentMode;
    
    try {
      // Preserve conversation context
      const contextMessage = this.createModeTransitionContext(oldMode, newMode);
      session.conversationHistory.push({
        role: 'system',
        content: contextMessage
      });

      // Stop current mode
      await this.stopCurrentMode(session);

      // Start new mode
      await this.startMode(session, newMode);

      // Update session
      session.currentMode = newMode;
      session.metrics.modeChanges++;

      // Notify callbacks
      const callback = this.modeTransitionCallbacks.get(sessionId);
      if (callback) {
        callback(oldMode, newMode);
      }

      console.log(`Switched from ${oldMode} to ${newMode} for session ${sessionId}`);
    } catch (error) {
      console.error(`Failed to switch mode from ${oldMode} to ${newMode}:`, error);
      throw error;
    }
  }

  /**
   * Send message in current mode
   */
  async sendMessage(sessionId: string, message: string, metadata?: Record<string, any>): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const startTime = Date.now();

    try {
      // Add user message to history
      session.conversationHistory.push({
        role: 'user',
        content: message
      });

      // Route to appropriate mode handler
      switch (session.currentMode) {
        case 'text':
          await this.handleTextMessage(session, message, metadata);
          break;
        case 'voice':
          await this.handleVoiceMessage(session, message, metadata);
          break;
        case 'video':
          await this.handleVideoMessage(session, message, metadata);
          break;
      }

      // Update metrics
      const responseTime = Date.now() - startTime;
      session.metrics.totalMessages++;
      session.metrics.averageResponseTime = 
        (session.metrics.averageResponseTime * (session.metrics.totalMessages - 1) + responseTime) / 
        session.metrics.totalMessages;

      // Check for auto-mode switching
      if (session.context.userPreferences.autoSwitch) {
        await this.checkAutoModeSwitch(session, message, metadata);
      }

    } catch (error) {
      console.error(`Failed to send message in ${session.currentMode} mode:`, error);
      throw error;
    }
  }

  /**
   * Get session status
   */
  getSessionStatus(sessionId: string): {
    currentMode: ConversationMode;
    availableModes: ConversationMode[];
    isActive: boolean;
    metrics: MultimodalSession['metrics'];
    qualityInfo: {
      connectionQuality: string;
      adaptiveQuality: boolean;
      recommendedMode: ConversationMode;
    };
  } | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      currentMode: session.currentMode,
      availableModes: session.availableModes,
      isActive: true,
      metrics: session.metrics,
      qualityInfo: {
        connectionQuality: this.assessConnectionQuality(session),
        adaptiveQuality: session.context.userPreferences.qualityAdaptation,
        recommendedMode: this.getRecommendedMode(session)
      }
    };
  }

  /**
   * End multimodal session
   */
  async endSession(sessionId: string): Promise<{
    duration: number;
    totalMessages: number;
    modeChanges: number;
    finalMode: ConversationMode;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      // Stop current mode
      await this.stopCurrentMode(session);

      // Calculate session stats
      const duration = Date.now() - session.metrics.startTime.getTime();
      const stats = {
        duration,
        totalMessages: session.metrics.totalMessages,
        modeChanges: session.metrics.modeChanges,
        finalMode: session.currentMode
      };

      // Cleanup
      this.activeSessions.delete(sessionId);
      this.modeTransitionCallbacks.delete(sessionId);

      return stats;
    } catch (error) {
      console.error(`Failed to end session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Set mode transition callback
   */
  onModeTransition(sessionId: string, callback: (from: ConversationMode, to: ConversationMode) => void): void {
    this.modeTransitionCallbacks.set(sessionId, callback);
  }

  /**
   * Get available modes based on system capabilities
   */
  private async getAvailableModes(): Promise<ConversationMode[]> {
    const modes: ConversationMode[] = ['text']; // Text is always available

    // Check voice capabilities
    if (voiceConversationManager.isAvailable()) {
      modes.push('voice');
    }

    // Check video capabilities
    if (videoConversationManager.isAvailable()) {
      modes.push('video');
    }

    return modes;
  }

  /**
   * Start a specific mode
   */
  private async startMode(session: MultimodalSession, mode: ConversationMode): Promise<void> {
    switch (mode) {
      case 'text':
        // Text mode is always ready
        break;
      
      case 'voice':
        const voiceSessionId = await voiceConversationManager.startConversation({
          agentConfig: {
            name: session.context.agentConfig.name,
            personality: session.context.agentConfig.personality,
            voice: session.context.agentConfig.voice || 'default'
          },
          features: {
            speechToText: true,
            textToSpeech: true,
            realTimeProcessing: true
          }
        });
        session.activeConnections.voice = voiceSessionId;
        break;
      
      case 'video':
        const roomName = await videoConversationManager.startConversation({
          roomName: `multimodal-${session.id}`,
          agentConfig: {
            name: session.context.agentConfig.name,
            personality: session.context.agentConfig.personality,
            voice: session.context.agentConfig.voice,
            avatar: session.context.agentConfig.avatar
          },
          userConfig: {
            name: 'User',
            enableVideo: true,
            enableAudio: true
          },
          features: {
            voiceResponse: true,
            screenSharing: true,
            recording: false,
            chatOverlay: true
          }
        });
        session.activeConnections.video = roomName;
        break;
    }
  }

  /**
   * Stop current mode
   */
  private async stopCurrentMode(session: MultimodalSession): Promise<void> {
    switch (session.currentMode) {
      case 'text':
        // Nothing to stop for text mode
        break;
      
      case 'voice':
        if (session.activeConnections.voice) {
          await voiceConversationManager.endConversation(session.activeConnections.voice);
          session.activeConnections.voice = undefined;
        }
        break;
      
      case 'video':
        if (session.activeConnections.video) {
          await videoConversationManager.endConversation(session.activeConnections.video);
          session.activeConnections.video = undefined;
        }
        break;
    }
  }

  /**
   * Handle text message
   */
  private async handleTextMessage(session: MultimodalSession, message: string, metadata?: Record<string, any>): Promise<void> {
    // Generate AI response
    const response = await enhancedAIService.generateResponse(
      session.conversationHistory,
      {
        provider: 'auto',
        temperature: 0.7,
        maxTokens: 500
      }
    );

    // Add response to history
    session.conversationHistory.push({
      role: 'assistant',
      content: response.content
    });

    // In a real implementation, you would send this to the UI
    console.log('Text response:', response.content);
  }

  /**
   * Handle voice message
   */
  private async handleVoiceMessage(session: MultimodalSession, message: string, metadata?: Record<string, any>): Promise<void> {
    if (!session.activeConnections.voice) {
      throw new Error('Voice connection not active');
    }

    await voiceConversationManager.sendUserMessage(session.activeConnections.voice, message);
  }

  /**
   * Handle video message
   */
  private async handleVideoMessage(session: MultimodalSession, message: string, metadata?: Record<string, any>): Promise<void> {
    if (!session.activeConnections.video) {
      throw new Error('Video connection not active');
    }

    await videoConversationManager.sendUserMessage(session.activeConnections.video, message);
  }

  /**
   * Create mode transition context message
   */
  private createModeTransitionContext(fromMode: ConversationMode, toMode: ConversationMode): string {
    const transitions = {
      'text-voice': 'The user is now switching to voice conversation. Respond naturally as if continuing the same conversation through speech.',
      'text-video': 'The user is now switching to video conversation. You can now see and interact with them visually while maintaining the conversation context.',
      'voice-text': 'The user is now switching back to text conversation. Continue the conversation in written form.',
      'voice-video': 'The user is now switching to video conversation. You can now see them while continuing to speak.',
      'video-text': 'The user is now switching to text conversation. Continue the conversation in written form.',
      'video-voice': 'The user is now switching to voice-only conversation. Continue speaking but without visual interaction.'
    };

    const key = `${fromMode}-${toMode}` as keyof typeof transitions;
    return transitions[key] || `Switching from ${fromMode} to ${toMode} mode. Continue the conversation naturally.`;
  }

  /**
   * Check for automatic mode switching based on context
   */
  private async checkAutoModeSwitch(session: MultimodalSession, message: string, metadata?: Record<string, any>): Promise<void> {
    // Analyze message for mode switch triggers
    const lowerMessage = message.toLowerCase();
    
    // Switch to video for visual requests
    if (session.currentMode !== 'video' && 
        (lowerMessage.includes('show me') || lowerMessage.includes('can you see') || lowerMessage.includes('look at'))) {
      if (session.availableModes.includes('video')) {
        await this.switchMode(session.id, 'video');
        return;
      }
    }

    // Switch to voice for audio requests
    if (session.currentMode !== 'voice' && 
        (lowerMessage.includes('tell me') || lowerMessage.includes('speak') || lowerMessage.includes('say'))) {
      if (session.availableModes.includes('voice')) {
        await this.switchMode(session.id, 'voice');
        return;
      }
    }

    // Quality-based switching
    if (session.context.userPreferences.qualityAdaptation) {
      const recommendedMode = this.getRecommendedMode(session);
      if (recommendedMode !== session.currentMode && session.availableModes.includes(recommendedMode)) {
        await this.switchMode(session.id, recommendedMode);
      }
    }
  }

  /**
   * Assess connection quality
   */
  private assessConnectionQuality(session: MultimodalSession): string {
    // Simplified quality assessment
    if (session.metrics.averageResponseTime < 1000) {
      return 'excellent';
    } else if (session.metrics.averageResponseTime < 2000) {
      return 'good';
    } else if (session.metrics.averageResponseTime < 5000) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * Get recommended mode based on current conditions
   */
  private getRecommendedMode(session: MultimodalSession): ConversationMode {
    const quality = this.assessConnectionQuality(session);
    
    // Recommend based on quality and capabilities
    if (quality === 'excellent' && session.availableModes.includes('video')) {
      return 'video';
    } else if (quality !== 'poor' && session.availableModes.includes('voice')) {
      return 'voice';
    } else {
      return 'text';
    }
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Get session conversation history
   */
  getConversationHistory(sessionId: string): AIMessage[] {
    const session = this.activeSessions.get(sessionId);
    return session?.conversationHistory || [];
  }
}

// Export singleton instance
export const multimodalConversationManager = new MultimodalConversationManager();
export default multimodalConversationManager;

// Export types
export type { ConversationMode, MultimodalSession };