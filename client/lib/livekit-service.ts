/**
 * LiveKit Video Service
 * Real-time video conferencing and conversational video integration
 */

import {
  Room,
  RoomEvent,
  RemoteParticipant,
  LocalParticipant,
  Track,
  TrackPublication,
  VideoPresets,
  AudioPresets,
  RoomOptions,
  ConnectOptions,
  DataPacket_Kind,
  Participant
} from 'livekit-client';

interface LiveKitConfig {
  serverUrl: string;
  apiKey: string;
  apiSecret: string;
}

interface RoomConfig {
  name: string;
  maxParticipants?: number;
  videoQuality?: 'low' | 'medium' | 'high' | 'ultra';
  audioQuality?: 'speech' | 'music';
  recordingEnabled?: boolean;
  features?: {
    screenSharing?: boolean;
    chatOverlay?: boolean;
    virtualBackground?: boolean;
    noiseCancellation?: boolean;
  };
}

interface ParticipantInfo {
  id: string;
  name: string;
  role: 'agent' | 'user' | 'moderator';
  metadata?: Record<string, any>;
}

interface ConversationSession {
  roomName: string;
  room: Room;
  participants: Map<string, Participant>;
  isRecording: boolean;
  startTime: Date;
  agentParticipant?: LocalParticipant;
}

class LiveKitService {
  private config: LiveKitConfig;
  private activeSessions: Map<string, ConversationSession> = new Map();
  private defaultRoomOptions: RoomOptions = {
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: VideoPresets.h720.resolution,
      facingMode: 'user'
    },
    audioCaptureDefaults: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true
    }
  };

  constructor() {
    this.config = {
      serverUrl: import.meta.env.VITE_LIVEKIT_SERVER_URL || 'wss://your-livekit-server.com',
      apiKey: import.meta.env.VITE_LIVEKIT_API_KEY || '',
      apiSecret: import.meta.env.VITE_LIVEKIT_API_SECRET || ''
    };

    if (!this.config.apiKey || !this.config.apiSecret) {
      console.warn('LiveKit credentials not found. Video features will not work.');
    }
  }

  /**
   * Check if LiveKit is available
   */
  isAvailable(): boolean {
    return !!(this.config.apiKey && this.config.apiSecret);
  }

  /**
   * Create a new video conversation room
   */
  async createRoom(config: RoomConfig): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('LiveKit credentials not configured');
    }

    try {
      // Generate room token (in production, this should be done server-side)
      const roomToken = await this.generateRoomToken(config.name, {
        id: 'system',
        name: 'System',
        role: 'moderator'
      });

      // Create room configuration
      const roomOptions: RoomOptions = {
        ...this.defaultRoomOptions,
        videoCaptureDefaults: {
          ...this.defaultRoomOptions.videoCaptureDefaults,
          resolution: this.getVideoResolution(config.videoQuality || 'medium')
        }
      };

      const room = new Room(roomOptions);
      
      // Set up room event listeners
      this.setupRoomEventListeners(room, config.name);

      // Connect to room
      await room.connect(this.config.serverUrl, roomToken);

      // Create session
      const session: ConversationSession = {
        roomName: config.name,
        room,
        participants: new Map(),
        isRecording: config.recordingEnabled || false,
        startTime: new Date()
      };

      this.activeSessions.set(config.name, session);

      return config.name;
    } catch (error) {
      console.error('Failed to create LiveKit room:', error);
      throw error;
    }
  }

  /**
   * Join an existing room
   */
  async joinRoom(
    roomName: string,
    participant: ParticipantInfo,
    options: {
      video?: boolean;
      audio?: boolean;
      screenShare?: boolean;
    } = {}
  ): Promise<Room> {
    if (!this.isAvailable()) {
      throw new Error('LiveKit credentials not configured');
    }

    try {
      const token = await this.generateRoomToken(roomName, participant);
      
      const room = new Room(this.defaultRoomOptions);
      this.setupRoomEventListeners(room, roomName);

      await room.connect(this.config.serverUrl, token);

      // Enable tracks based on options
      if (options.video !== false) {
        await room.localParticipant.setCameraEnabled(true);
      }
      if (options.audio !== false) {
        await room.localParticipant.setMicrophoneEnabled(true);
      }
      if (options.screenShare) {
        await room.localParticipant.setScreenShareEnabled(true);
      }

      // Update session
      const session = this.activeSessions.get(roomName);
      if (session) {
        session.participants.set(participant.id, room.localParticipant);
      }

      return room;
    } catch (error) {
      console.error('Failed to join LiveKit room:', error);
      throw error;
    }
  }

  /**
   * Create an agent participant for AI video conversations
   */
  async createAgentParticipant(
    roomName: string,
    agentConfig: {
      name: string;
      avatar?: string;
      voice?: string;
      personality?: string;
    }
  ): Promise<LocalParticipant> {
    const session = this.activeSessions.get(roomName);
    if (!session) {
      throw new Error(`Room ${roomName} not found`);
    }

    try {
      // Create agent token
      const agentToken = await this.generateRoomToken(roomName, {
        id: `agent-${Date.now()}`,
        name: agentConfig.name,
        role: 'agent',
        metadata: {
          avatar: agentConfig.avatar,
          voice: agentConfig.voice,
          personality: agentConfig.personality
        }
      });

      // Create agent room connection
      const agentRoom = new Room(this.defaultRoomOptions);
      await agentRoom.connect(this.config.serverUrl, agentToken);

      // Configure agent for video output (no camera/mic input)
      await agentRoom.localParticipant.setCameraEnabled(false);
      await agentRoom.localParticipant.setMicrophoneEnabled(false);

      session.agentParticipant = agentRoom.localParticipant;
      session.participants.set('agent', agentRoom.localParticipant);

      return agentRoom.localParticipant;
    } catch (error) {
      console.error('Failed to create agent participant:', error);
      throw error;
    }
  }

  /**
   * Send agent video/audio response
   */
  async sendAgentResponse(
    roomName: string,
    response: {
      type: 'video' | 'audio' | 'screen';
      data: ArrayBuffer | MediaStream;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const session = this.activeSessions.get(roomName);
    if (!session || !session.agentParticipant) {
      throw new Error(`Agent not found in room ${roomName}`);
    }

    try {
      if (response.type === 'video' && response.data instanceof MediaStream) {
        // Publish video track
        const videoTrack = response.data.getVideoTracks()[0];
        if (videoTrack) {
          await session.agentParticipant.publishTrack(videoTrack, {
            name: 'agent-video',
            source: Track.Source.Camera
          });
        }
      } else if (response.type === 'audio' && response.data instanceof MediaStream) {
        // Publish audio track
        const audioTrack = response.data.getAudioTracks()[0];
        if (audioTrack) {
          await session.agentParticipant.publishTrack(audioTrack, {
            name: 'agent-audio',
            source: Track.Source.Microphone
          });
        }
      }

      // Send metadata if provided
      if (response.metadata) {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(response.metadata));
        await session.room.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);
      }
    } catch (error) {
      console.error('Failed to send agent response:', error);
      throw error;
    }
  }

  /**
   * Start recording a conversation
   */
  async startRecording(roomName: string): Promise<void> {
    const session = this.activeSessions.get(roomName);
    if (!session) {
      throw new Error(`Room ${roomName} not found`);
    }

    try {
      // In production, this would call LiveKit's recording API
      // For now, we'll mark the session as recording
      session.isRecording = true;
      
      // Send recording start event
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({
        type: 'recording_started',
        timestamp: new Date().toISOString()
      }));
      await session.room.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording a conversation
   */
  async stopRecording(roomName: string): Promise<string | null> {
    const session = this.activeSessions.get(roomName);
    if (!session) {
      throw new Error(`Room ${roomName} not found`);
    }

    try {
      session.isRecording = false;
      
      // Send recording stop event
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({
        type: 'recording_stopped',
        timestamp: new Date().toISOString()
      }));
      await session.room.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);

      // Return recording URL (would be provided by LiveKit in production)
      return `recording-${roomName}-${Date.now()}.mp4`;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Leave a room
   */
  async leaveRoom(roomName: string): Promise<void> {
    const session = this.activeSessions.get(roomName);
    if (!session) {
      return;
    }

    try {
      await session.room.disconnect();
      this.activeSessions.delete(roomName);
    } catch (error) {
      console.error('Failed to leave room:', error);
      throw error;
    }
  }

  /**
   * Get room statistics
   */
  getRoomStats(roomName: string): {
    participants: number;
    duration: number;
    isRecording: boolean;
    quality: string;
  } | null {
    const session = this.activeSessions.get(roomName);
    if (!session) {
      return null;
    }

    return {
      participants: session.participants.size,
      duration: Date.now() - session.startTime.getTime(),
      isRecording: session.isRecording,
      quality: this.getConnectionQuality(session.room)
    };
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Setup room event listeners
   */
  private setupRoomEventListeners(room: Room, roomName: string): void {
    room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log(`Participant ${participant.identity} connected to ${roomName}`);
      
      // Subscribe to participant tracks
      participant.on('trackSubscribed', (track: Track, publication: TrackPublication) => {
        if (track.kind === Track.Kind.Video) {
          // Handle video track
          const videoElement = document.createElement('video');
          videoElement.srcObject = new MediaStream([track.mediaStreamTrack]);
          videoElement.play();
        } else if (track.kind === Track.Kind.Audio) {
          // Handle audio track
          const audioElement = document.createElement('audio');
          audioElement.srcObject = new MediaStream([track.mediaStreamTrack]);
          audioElement.play();
        }
      });
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log(`Participant ${participant.identity} disconnected from ${roomName}`);
    });

    room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
      const decoder = new TextDecoder();
      const message = decoder.decode(payload);
      
      try {
        const data = JSON.parse(message);
        this.handleDataMessage(roomName, data, participant);
      } catch (error) {
        console.warn('Failed to parse data message:', error);
      }
    });

    room.on(RoomEvent.ConnectionQualityChanged, (quality: string, participant: Participant) => {
      console.log(`Connection quality for ${participant.identity}: ${quality}`);
    });

    room.on(RoomEvent.Disconnected, () => {
      console.log(`Disconnected from room ${roomName}`);
      this.activeSessions.delete(roomName);
    });
  }

  /**
   * Handle data messages
   */
  private handleDataMessage(
    roomName: string,
    data: any,
    participant?: RemoteParticipant
  ): void {
    switch (data.type) {
      case 'chat_message':
        // Handle chat messages
        console.log(`Chat message in ${roomName}:`, data.message);
        break;
      case 'agent_response':
        // Handle agent responses
        console.log(`Agent response in ${roomName}:`, data);
        break;
      case 'recording_started':
      case 'recording_stopped':
        // Handle recording events
        console.log(`Recording event in ${roomName}:`, data.type);
        break;
      default:
        console.log(`Unknown data message in ${roomName}:`, data);
    }
  }

  /**
   * Generate room token (simplified - should be done server-side in production)
   */
  private async generateRoomToken(
    roomName: string,
    participant: ParticipantInfo
  ): Promise<string> {
    // This is a simplified token generation
    // In production, use LiveKit's server SDK to generate proper JWT tokens
    const payload = {
      iss: this.config.apiKey,
      sub: participant.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      room: roomName,
      participant: participant.name,
      metadata: JSON.stringify(participant.metadata || {})
    };

    // This is a placeholder - use proper JWT signing in production
    return btoa(JSON.stringify(payload));
  }

  /**
   * Get video resolution based on quality setting
   */
  private getVideoResolution(quality: string): { width: number; height: number } {
    switch (quality) {
      case 'low':
        return { width: 320, height: 240 };
      case 'medium':
        return { width: 640, height: 480 };
      case 'high':
        return { width: 1280, height: 720 };
      case 'ultra':
        return { width: 1920, height: 1080 };
      default:
        return { width: 640, height: 480 };
    }
  }

  /**
   * Get connection quality
   */
  private getConnectionQuality(room: Room): string {
    // Simplified quality assessment
    const stats = room.engine.getConnectedServerAddress();
    return stats ? 'good' : 'poor';
  }

  /**
   * Test LiveKit connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'LiveKit credentials not configured' };
    }

    try {
      // Create a test room
      const testRoomName = `test-${Date.now()}`;
      const room = new Room();
      
      const token = await this.generateRoomToken(testRoomName, {
        id: 'test-user',
        name: 'Test User',
        role: 'user'
      });

      await room.connect(this.config.serverUrl, token);
      await room.disconnect();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get service capabilities
   */
  getCapabilities(): {
    maxParticipants: number;
    supportedFormats: string[];
    features: string[];
  } {
    return {
      maxParticipants: 50,
      supportedFormats: ['webm', 'mp4', 'h264', 'vp8', 'vp9'],
      features: [
        'HD Video',
        'Screen Sharing',
        'Recording',
        'Real-time Chat',
        'Adaptive Streaming',
        'Noise Cancellation',
        'Virtual Backgrounds'
      ]
    };
  }
}

// Export singleton instance
export const liveKitService = new LiveKitService();
export default liveKitService;

// Export types
export type {
  LiveKitConfig,
  RoomConfig,
  ParticipantInfo,
  ConversationSession
};