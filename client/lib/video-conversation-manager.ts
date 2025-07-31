/**
 * Video Conversation Manager
 * Orchestrates video conversations with AI agents using LiveKit and AI services
 */

import { Room, LocalParticipant, RemoteParticipant } from 'livekit-client';
import { liveKitService, type RoomConfig, type ParticipantInfo } from './livekit-service';
import { enhancedAIService, type AIMessage } from './enhanced-ai-service';
import { elevenLabsService } from './elevenlabs-service';

interface VideoConversationConfig {
  roomName: string;
  agentConfig: {
    name: string;
    personality: string;
    voice?: string;
    avatar?: string;
    systemPrompt?: string;
  };
  userConfig: {
    name: string;
    enableVideo?: boolean;
    enableAudio?: boolean;
  };
  features: {
    voiceResponse?: boolean;
    screenSharing?: boolean;
    recording?: boolean;
    chatOverlay?: boolean;
  };
}

interface ConversationState {
  room: Room;
  agentParticipant?: LocalParticipant;
  conversationHistory: AIMessage[];
  isRecording: boolean;
  startTime: Date;
  stats: {
    messagesExchanged: number;
    averageResponseTime: number;
    participantCount: number;
  };
}

class VideoConversationManager {
  private activeConversations: Map<string, ConversationState> = new Map();
  private speechRecognition: SpeechRecognition | null = null;
  private speechSynthesis: SpeechSynthesis | null = null;

  constructor() {
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'en-US';
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  /**
   * Start a new video conversation with an AI agent
   */
  async startConversation(config: VideoConversationConfig): Promise<string> {
    const { roomName, agentConfig, userConfig, features } = config;

    try {
      // Create room configuration
      const roomConfig: RoomConfig = {
        name: roomName,
        maxParticipants: 10,
        videoQuality: 'high',
        audioQuality: 'speech',
        recordingEnabled: features.recording,
        features: {
          screenSharing: features.screenSharing,
          chatOverlay: features.chatOverlay,
          virtualBackground: true,
          noiseCancellation: true
        }
      };

      // Create the room
      await liveKitService.createRoom(roomConfig);

      // Join as user
      const room = await liveKitService.joinRoom(roomName, {
        id: `user-${Date.now()}`,
        name: userConfig.name,
        role: 'user'
      }, {
        video: userConfig.enableVideo,
        audio: userConfig.enableAudio,
        screenShare: features.screenSharing
      });

      // Create AI agent participant
      const agentParticipant = await liveKitService.createAgentParticipant(roomName, {
        name: agentConfig.name,
        avatar: agentConfig.avatar || '🤖',
        voice: agentConfig.voice,
        personality: agentConfig.personality
      });

      // Initialize conversation state
      const conversationState: ConversationState = {
        room,
        agentParticipant,
        conversationHistory: agentConfig.systemPrompt ? [{
          role: 'system',
          content: agentConfig.systemPrompt
        }] : [],
        isRecording: features.recording || false,
        startTime: new Date(),
        stats: {
          messagesExchanged: 0,
          averageResponseTime: 0,
          participantCount: 1
        }
      };

      this.activeConversations.set(roomName, conversationState);

      // Set up event listeners
      this.setupConversationEventListeners(roomName, conversationState);

      // Start recording if enabled
      if (features.recording) {
        await liveKitService.startRecording(roomName);
      }

      // Send welcome message from agent
      await this.sendAgentMessage(roomName, 
        `Hello ${userConfig.name}! I'm ${agentConfig.name}. How can I help you today?`
      );

      return roomName;
    } catch (error) {
      console.error('Failed to start video conversation:', error);
      throw error;
    }
  }

  /**
   * Send a message from the user to the AI agent
   */
  async sendUserMessage(roomName: string, message: string): Promise<void> {
    const conversation = this.activeConversations.get(roomName);
    if (!conversation) {
      throw new Error(`Conversation ${roomName} not found`);
    }

    const startTime = Date.now();

    try {
      // Add user message to history
      conversation.conversationHistory.push({
        role: 'user',
        content: message
      });

      // Send to AI service for response
      const aiResponse = await enhancedAIService.generateResponse(
        conversation.conversationHistory,
        {
          provider: 'auto',
          temperature: 0.7,
          maxTokens: 500
        }
      );

      // Add AI response to history
      conversation.conversationHistory.push({
        role: 'assistant',
        content: aiResponse.content
      });

      // Send agent response
      await this.sendAgentMessage(roomName, aiResponse.content);

      // Update stats
      const responseTime = Date.now() - startTime;
      conversation.stats.messagesExchanged++;
      conversation.stats.averageResponseTime = 
        (conversation.stats.averageResponseTime * (conversation.stats.messagesExchanged - 1) + responseTime) / 
        conversation.stats.messagesExchanged;

    } catch (error) {
      console.error('Failed to process user message:', error);
      await this.sendAgentMessage(roomName, 
        "I'm sorry, I encountered an error processing your message. Could you please try again?"
      );
    }
  }

  /**
   * Send a message from the AI agent
   */
  private async sendAgentMessage(roomName: string, message: string): Promise<void> {
    const conversation = this.activeConversations.get(roomName);
    if (!conversation) {
      throw new Error(`Conversation ${roomName} not found`);
    }

    try {
      // Send text message via data channel
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({
        type: 'agent_message',
        message,
        timestamp: new Date().toISOString(),
        sender: 'agent'
      }));

      await conversation.room.localParticipant.publishData(data);

      // Generate voice response if enabled and ElevenLabs is available
      if (elevenLabsService.isAvailable()) {
        await this.generateVoiceResponse(roomName, message);
      }

    } catch (error) {
      console.error('Failed to send agent message:', error);
      throw error;
    }
  }

  /**
   * Generate and send voice response from agent
   */
  private async generateVoiceResponse(roomName: string, text: string): Promise<void> {
    const conversation = this.activeConversations.get(roomName);
    if (!conversation) return;

    try {
      // Get available voices and select appropriate one
      const voices = await elevenLabsService.getVoices();
      const selectedVoice = voices.find(v => v.name.toLowerCase().includes('professional')) || voices[0];

      if (!selectedVoice) {
        console.warn('No voices available for speech synthesis');
        return;
      }

      // Generate speech
      const audioBuffer = await elevenLabsService.generateSpeech({
        voice_id: selectedVoice.voice_id,
        text,
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true
        }
      });

      // Convert to audio stream and send via LiveKit
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Create MediaStream from audio
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audio);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);

      // Send audio via LiveKit
      await liveKitService.sendAgentResponse(roomName, {
        type: 'audio',
        data: destination.stream,
        metadata: {
          text,
          voice: selectedVoice.name,
          duration: audio.duration
        }
      });

      // Clean up
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      });

    } catch (error) {
      console.error('Failed to generate voice response:', error);
    }
  }

  /**
   * Start speech recognition for user input
   */
  async startSpeechRecognition(roomName: string): Promise<void> {
    if (!this.speechRecognition) {
      throw new Error('Speech recognition not supported');
    }

    const conversation = this.activeConversations.get(roomName);
    if (!conversation) {
      throw new Error(`Conversation ${roomName} not found`);
    }

    let finalTranscript = '';

    this.speechRecognition.onresult = (event) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Send interim results for real-time feedback
      if (interimTranscript) {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify({
          type: 'speech_interim',
          transcript: interimTranscript,
          timestamp: new Date().toISOString()
        }));
        conversation.room.localParticipant.publishData(data);
      }

      // Process final transcript
      if (finalTranscript) {
        this.sendUserMessage(roomName, finalTranscript);
        finalTranscript = '';
      }
    };

    this.speechRecognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };

    this.speechRecognition.start();
  }

  /**
   * Stop speech recognition
   */
  stopSpeechRecognition(): void {
    if (this.speechRecognition) {
      this.speechRecognition.stop();
    }
  }

  /**
   * End a conversation
   */
  async endConversation(roomName: string): Promise<{
    duration: number;
    messagesExchanged: number;
    recordingUrl?: string;
  }> {
    const conversation = this.activeConversations.get(roomName);
    if (!conversation) {
      throw new Error(`Conversation ${roomName} not found`);
    }

    try {
      const duration = Date.now() - conversation.startTime.getTime();
      let recordingUrl: string | undefined;

      // Stop recording if active
      if (conversation.isRecording) {
        recordingUrl = await liveKitService.stopRecording(roomName) || undefined;
      }

      // Leave room
      await liveKitService.leaveRoom(roomName);

      // Clean up
      this.activeConversations.delete(roomName);

      return {
        duration,
        messagesExchanged: conversation.stats.messagesExchanged,
        recordingUrl
      };
    } catch (error) {
      console.error('Failed to end conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(roomName: string): ConversationState['stats'] | null {
    const conversation = this.activeConversations.get(roomName);
    return conversation?.stats || null;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(roomName: string): AIMessage[] {
    const conversation = this.activeConversations.get(roomName);
    return conversation?.conversationHistory || [];
  }

  /**
   * Setup event listeners for conversation
   */
  private setupConversationEventListeners(
    roomName: string, 
    conversation: ConversationState
  ): void {
    const { room } = conversation;

    // Handle participant connections
    room.on('participantConnected', (participant: RemoteParticipant) => {
      console.log(`Participant ${participant.identity} joined ${roomName}`);
      conversation.stats.participantCount++;
    });

    room.on('participantDisconnected', (participant: RemoteParticipant) => {
      console.log(`Participant ${participant.identity} left ${roomName}`);
      conversation.stats.participantCount--;
    });

    // Handle data messages
    room.on('dataReceived', (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload));

        switch (data.type) {
          case 'user_message':
            this.sendUserMessage(roomName, data.message);
            break;
          case 'speech_command':
            this.handleSpeechCommand(roomName, data.command);
            break;
          default:
            console.log(`Unknown data message in ${roomName}:`, data);
        }
      } catch (error) {
        console.warn('Failed to parse data message:', error);
      }
    });

    // Handle connection quality changes
    room.on('connectionQualityChanged', (quality: string, participant) => {
      console.log(`Connection quality for ${participant.identity}: ${quality}`);
    });
  }

  /**
   * Handle speech commands
   */
  private async handleSpeechCommand(roomName: string, command: string): Promise<void> {
    switch (command.toLowerCase()) {
      case 'start_listening':
        await this.startSpeechRecognition(roomName);
        break;
      case 'stop_listening':
        this.stopSpeechRecognition();
        break;
      case 'end_conversation':
        await this.endConversation(roomName);
        break;
      default:
        console.log(`Unknown speech command: ${command}`);
    }
  }

  /**
   * Get active conversations
   */
  getActiveConversations(): string[] {
    return Array.from(this.activeConversations.keys());
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return liveKitService.isAvailable();
  }

  /**
   * Test video conversation capabilities
   */
  async testCapabilities(): Promise<{
    livekit: { success: boolean; error?: string };
    ai: Record<string, any>;
    voice: { success: boolean; error?: string };
    speechRecognition: boolean;
  }> {
    const results = {
      livekit: await liveKitService.testConnection(),
      ai: await enhancedAIService.testProviders(),
      voice: await elevenLabsService.testConnection(),
      speechRecognition: !!this.speechRecognition
    };

    return results;
  }
}

// Export singleton instance
export const videoConversationManager = new VideoConversationManager();
export default videoConversationManager;

// Export types
export type { VideoConversationConfig, ConversationState };