import React, { useState, useEffect, useRef } from 'react';
import { Room, RemoteParticipant, LocalParticipant, Track, TrackPublication } from 'livekit-client';
import { liveKitService } from '../lib/livekit-service';
import { videoEffectsManager, type VideoEffectsConfig } from '../lib/video-effects';
import { screenSharingManager } from '../lib/screen-sharing';

interface VideoChatProps {
  roomName?: string;
  participantName?: string;
  agentEnabled?: boolean;
  onRoomJoined?: (room: Room) => void;
  onRoomLeft?: () => void;
  onError?: (error: Error) => void;
}

interface ParticipantVideoProps {
  participant: RemoteParticipant | LocalParticipant;
  isLocal?: boolean;
}

const ParticipantVideo: React.FC<ParticipantVideoProps> = ({ participant, isLocal = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => {
    const handleTrackSubscribed = (track: Track, publication: TrackPublication) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        setHasVideo(true);
      } else if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.attach(audioRef.current);
        setHasAudio(true);
      }
    };

    const handleTrackUnsubscribed = (track: Track) => {
      track.detach();
      if (track.kind === Track.Kind.Video) {
        setHasVideo(false);
      } else if (track.kind === Track.Kind.Audio) {
        setHasAudio(false);
      }
    };

    // Subscribe to existing tracks
    participant.tracks.forEach((publication) => {
      if (publication.track) {
        handleTrackSubscribed(publication.track, publication);
      }
    });

    // Listen for new tracks
    participant.on('trackSubscribed', handleTrackSubscribed);
    participant.on('trackUnsubscribed', handleTrackUnsubscribed);

    return () => {
      participant.off('trackSubscribed', handleTrackSubscribed);
      participant.off('trackUnsubscribed', handleTrackUnsubscribed);
    };
  }, [participant]);

  return (
    <div className={`relative ${isLocal ? 'w-32 h-24' : 'w-full h-full'} bg-gray-900 rounded-lg overflow-hidden`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${!hasVideo ? 'hidden' : ''}`}
      />
      <audio ref={audioRef} autoPlay />
      
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {participant.identity.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {participant.identity} {isLocal && '(You)'}
      </div>
      
      <div className="absolute bottom-2 right-2 flex space-x-1">
        {!hasAudio && (
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

const VideoChat: React.FC<VideoChatProps> = ({
  roomName = `room-${Date.now()}`,
  participantName = 'User',
  agentEnabled = false,
  onRoomJoined,
  onRoomLeft,
  onError
}) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; message: string; timestamp: Date }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [videoEffects, setVideoEffects] = useState<VideoEffectsConfig>({
    virtualBackground: { enabled: false, type: 'blur', intensity: 5 },
    noiseCancellation: { enabled: false, intensity: 0.5 },
    videoEnhancement: { brightness: 100, contrast: 100, saturation: 100 }
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const joinRoom = async () => {
    if (!liveKitService.isAvailable()) {
      const errorMsg = 'LiveKit service is not available. Please check your configuration.';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const newRoom = await liveKitService.joinRoom(roomName, {
        id: `user-${Date.now()}`,
        name: participantName,
        role: 'user'
      }, {
        video: isVideoEnabled,
        audio: isAudioEnabled
      });

      setRoom(newRoom);
      setLocalParticipant(newRoom.localParticipant);
      setIsConnected(true);
      setIsConnecting(false);

      // Set up event listeners
      newRoom.on('participantConnected', (participant: RemoteParticipant) => {
        setParticipants(prev => [...prev, participant]);
      });

      newRoom.on('participantDisconnected', (participant: RemoteParticipant) => {
        setParticipants(prev => prev.filter(p => p.sid !== participant.sid));
      });

      newRoom.on('dataReceived', (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const decoder = new TextDecoder();
          const data = JSON.parse(decoder.decode(payload));
          
          if (data.type === 'chat_message') {
            setChatMessages(prev => [...prev, {
              sender: participant?.identity || 'System',
              message: data.message,
              timestamp: new Date()
            }]);
          }
        } catch (error) {
          console.warn('Failed to parse data message:', error);
        }
      });

      // Initialize participants
      setParticipants(Array.from(newRoom.participants.values()));

      // Create agent if enabled
      if (agentEnabled) {
        await liveKitService.createAgentParticipant(roomName, {
          name: 'AI Assistant',
          avatar: '🤖',
          personality: 'helpful'
        });
      }

      onRoomJoined?.(newRoom);
    } catch (error) {
      console.error('Failed to join room:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to join room';
      setError(errorMsg);
      setIsConnecting(false);
      onError?.(new Error(errorMsg));
    }
  };

  const leaveRoom = async () => {
    if (room) {
      try {
        await liveKitService.leaveRoom(roomName);
        setRoom(null);
        setIsConnected(false);
        setLocalParticipant(null);
        setParticipants([]);
        onRoomLeft?.();
      } catch (error) {
        console.error('Failed to leave room:', error);
      }
    }
  };

  const toggleVideo = async () => {
    if (localParticipant) {
      const enabled = !isVideoEnabled;
      await localParticipant.setCameraEnabled(enabled);
      setIsVideoEnabled(enabled);
    }
  };

  const toggleAudio = async () => {
    if (localParticipant) {
      const enabled = !isAudioEnabled;
      await localParticipant.setMicrophoneEnabled(enabled);
      setIsAudioEnabled(enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!localParticipant) return;

    try {
      if (isScreenSharing) {
        // Stop screen sharing
        screenSharingManager.stopScreenShare();
        await localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        const screenStream = await screenSharingManager.startScreenShare({
          video: { width: 1920, height: 1080, frameRate: 30 },
          audio: true
        });
        
        await localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);

        // Listen for screen share end
        screenSharingManager.onStreamEnded(() => {
          setIsScreenSharing(false);
          localParticipant.setScreenShareEnabled(false);
        });
      }
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
      setError('Failed to toggle screen sharing. Please check permissions.');
    }
  };

  const toggleVideoEffects = () => {
    setShowEffectsPanel(!showEffectsPanel);
  };

  const applyVideoEffect = async (effectType: keyof VideoEffectsConfig, config: any) => {
    const newEffects = { ...videoEffects, [effectType]: config };
    setVideoEffects(newEffects);

    if (localParticipant && room) {
      try {
        // Apply effects to local video stream
        const videoTrack = localParticipant.videoTracks.values().next().value?.track;
        if (videoTrack) {
          // This would require more complex implementation to modify the actual stream
          console.log('Applying video effect:', effectType, config);
        }
      } catch (error) {
        console.error('Failed to apply video effect:', error);
      }
    }
  };

  const startRecording = async () => {
    if (!room) return;

    try {
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // In a real implementation, you would start actual recording here
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    try {
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      console.log('Recording stopped, duration:', recordingDuration);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const sendChatMessage = async () => {
    if (room && newMessage.trim()) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify({
          type: 'chat_message',
          message: newMessage,
          timestamp: new Date().toISOString()
        }));
        
        await room.localParticipant.publishData(data);
        
        setChatMessages(prev => [...prev, {
          sender: 'You',
          message: newMessage,
          timestamp: new Date()
        }]);
        
        setNewMessage('');
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (room) {
        leaveRoom();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      videoEffectsManager.stopProcessing();
      screenSharingManager.stopScreenShare();
    };
  }, []);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Conversation</h3>
          <p className="text-gray-600">Join the video room to start your conversation</p>
        </div>

        <div className="flex space-x-4 mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isVideoEnabled}
              onChange={(e) => setIsVideoEnabled(e.target.checked)}
              className="mr-2"
            />
            Enable Video
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isAudioEnabled}
              onChange={(e) => setIsAudioEnabled(e.target.checked)}
              className="mr-2"
            />
            Enable Audio
          </label>
        </div>

        <button
          onClick={joinRoom}
          disabled={isConnecting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? 'Connecting...' : 'Join Video Call'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96 bg-gray-900 rounded-lg overflow-hidden">
      {/* Video Grid */}
      <div className="flex-1 relative">
        {/* Main video area */}
        <div className="w-full h-full">
          {participants.length > 0 ? (
            <div className={`grid gap-2 p-2 h-full ${
              participants.length === 1 ? 'grid-cols-1' :
              participants.length <= 4 ? 'grid-cols-2' :
              'grid-cols-3'
            }`}>
              {participants.map((participant) => (
                <ParticipantVideo
                  key={participant.sid}
                  participant={participant}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👋</span>
                </div>
                <p>Waiting for others to join...</p>
              </div>
            </div>
          )}
        </div>

        {/* Local video (picture-in-picture) */}
        {localParticipant && (
          <div className="absolute bottom-4 right-4">
            <ParticipantVideo
              participant={localParticipant}
              isLocal={true}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={toggleVideo}
            className={`p-2 rounded-full ${
              isVideoEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
            } text-white`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              {isVideoEnabled ? (
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              ) : (
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A2 2 0 0018 13V7a1 1 0 00-1.447-.894l-2 1A1 1 0 0014 8v.879l-2-2V6a2 2 0 00-2-2H5.121l-1.414-1.414zM2 6a2 2 0 012-2h.879L2 6.879V6z" clipRule="evenodd" />
              )}
            </svg>
          </button>

          <button
            onClick={toggleAudio}
            className={`p-2 rounded-full ${
              isAudioEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
            } text-white`}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              {isAudioEnabled ? (
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              )}
            </svg>
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-2 rounded-full ${
              isScreenSharing ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'
            } text-white`}
            title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            onClick={toggleVideoEffects}
            className={`p-2 rounded-full ${
              showEffectsPanel ? 'bg-purple-600 hover:bg-purple-500' : 'bg-gray-600 hover:bg-gray-500'
            } text-white`}
            title="Video effects"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 rounded-full ${
              isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-600 hover:bg-gray-500'
            } text-white`}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v6a1 1 0 11-2 0V7zM12 7a1 1 0 10-2 0v6a1 1 0 102 0V7z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {isRecording && (
            <div className="flex items-center space-x-2 text-red-400">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                REC {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
          
          <span className="text-white text-sm">
            {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
          </span>
          
          <button
            onClick={leaveRoom}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Leave Call
          </button>
        </div>
      </div>

      {/* Video Effects Panel */}
      {showEffectsPanel && (
        <div className="bg-gray-700 p-4 border-t border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Virtual Background */}
            <div className="space-y-2">
              <h4 className="text-white font-semibold text-sm">Virtual Background</h4>
              <div className="space-y-2">
                <label className="flex items-center text-white text-sm">
                  <input
                    type="checkbox"
                    checked={videoEffects.virtualBackground?.enabled}
                    onChange={(e) => applyVideoEffect('virtualBackground', {
                      ...videoEffects.virtualBackground,
                      enabled: e.target.checked
                    })}
                    className="mr-2"
                  />
                  Enable
                </label>
                {videoEffects.virtualBackground?.enabled && (
                  <div className="space-y-2">
                    <select
                      value={videoEffects.virtualBackground.type}
                      onChange={(e) => applyVideoEffect('virtualBackground', {
                        ...videoEffects.virtualBackground,
                        type: e.target.value as 'blur' | 'image' | 'video'
                      })}
                      className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                    >
                      <option value="blur">Blur</option>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                    {videoEffects.virtualBackground.type === 'blur' && (
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={videoEffects.virtualBackground.intensity || 5}
                        onChange={(e) => applyVideoEffect('virtualBackground', {
                          ...videoEffects.virtualBackground,
                          intensity: parseInt(e.target.value)
                        })}
                        className="w-full"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Noise Cancellation */}
            <div className="space-y-2">
              <h4 className="text-white font-semibold text-sm">Noise Cancellation</h4>
              <div className="space-y-2">
                <label className="flex items-center text-white text-sm">
                  <input
                    type="checkbox"
                    checked={videoEffects.noiseCancellation?.enabled}
                    onChange={(e) => applyVideoEffect('noiseCancellation', {
                      ...videoEffects.noiseCancellation,
                      enabled: e.target.checked
                    })}
                    className="mr-2"
                  />
                  Enable
                </label>
                {videoEffects.noiseCancellation?.enabled && (
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={videoEffects.noiseCancellation.intensity || 0.5}
                    onChange={(e) => applyVideoEffect('noiseCancellation', {
                      ...videoEffects.noiseCancellation,
                      intensity: parseFloat(e.target.value)
                    })}
                    className="w-full"
                  />
                )}
              </div>
            </div>

            {/* Video Enhancement */}
            <div className="space-y-2">
              <h4 className="text-white font-semibold text-sm">Video Enhancement</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-white text-xs">Brightness</label>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={videoEffects.videoEnhancement?.brightness || 100}
                    onChange={(e) => applyVideoEffect('videoEnhancement', {
                      ...videoEffects.videoEnhancement,
                      brightness: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-white text-xs">Contrast</label>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={videoEffects.videoEnhancement?.contrast || 100}
                    onChange={(e) => applyVideoEffect('videoEnhancement', {
                      ...videoEffects.videoEnhancement,
                      contrast: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-white text-xs">Saturation</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={videoEffects.videoEnhancement?.saturation || 100}
                    onChange={(e) => applyVideoEffect('videoEnhancement', {
                      ...videoEffects.videoEnhancement,
                      saturation: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Panel (if messages exist) */}
      {chatMessages.length > 0 && (
        <div className="bg-gray-700 p-4 max-h-32 overflow-y-auto">
          <div className="space-y-2">
            {chatMessages.slice(-3).map((msg, index) => (
              <div key={index} className="text-sm">
                <span className="text-blue-300 font-semibold">{msg.sender}:</span>
                <span className="text-white ml-2">{msg.message}</span>
              </div>
            ))}
          </div>
          
          <div className="flex mt-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-1 bg-gray-600 text-white rounded-l border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendChatMessage}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-r"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoChat;