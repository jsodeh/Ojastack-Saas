import React, { useState, useEffect, useRef } from 'react';
import VideoChat from './VideoChat';
import VoiceChat from './VoiceChat';
import ChatWidget from './ChatWidget';
import { multimodalConversationManager, type ConversationMode } from '../lib/multimodal-conversation';

interface MultimodalConversationProps {
  agentConfig: {
    name: string;
    personality: string;
    voice?: string;
    avatar?: string;
  };
  userPreferences?: {
    preferredMode?: ConversationMode;
    autoSwitch?: boolean;
    qualityAdaptation?: boolean;
  };
  onModeChange?: (mode: ConversationMode) => void;
  onSessionEnd?: (stats: any) => void;
}

const MultimodalConversation: React.FC<MultimodalConversationProps> = ({
  agentConfig,
  userPreferences = {
    preferredMode: 'text',
    autoSwitch: true,
    qualityAdaptation: true
  },
  onModeChange,
  onSessionEnd
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<ConversationMode>('text');
  const [availableModes, setAvailableModes] = useState<ConversationMode[]>(['text']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);

  // Initialize session
  useEffect(() => {
    initializeSession();
    return () => {
      if (sessionId) {
        endSession();
      }
    };
  }, []);

  // Update session status periodically
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      const status = multimodalConversationManager.getSessionStatus(sessionId);
      if (status) {
        setSessionStats(status);
        setAvailableModes(status.availableModes);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const initializeSession = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const newSessionId = await multimodalConversationManager.startSession({
        agentConfig,
        userPreferences,
        initialMode: userPreferences.preferredMode || 'text'
      });

      setSessionId(newSessionId);
      setCurrentMode(userPreferences.preferredMode || 'text');

      // Set up mode transition callback
      multimodalConversationManager.onModeTransition(newSessionId, (from, to) => {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentMode(to);
          setIsTransitioning(false);
          onModeChange?.(to);
        }, 500); // Smooth transition delay
      });

      // Get initial status
      const status = multimodalConversationManager.getSessionStatus(newSessionId);
      if (status) {
        setAvailableModes(status.availableModes);
        setSessionStats(status);
      }

    } catch (error) {
      console.error('Failed to initialize multimodal session:', error);
      setError('Failed to start conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = async (newMode: ConversationMode) => {
    if (!sessionId || currentMode === newMode || isTransitioning) return;

    setIsTransitioning(true);
    setError(null);

    try {
      await multimodalConversationManager.switchMode(sessionId, newMode);
      // Mode change will be handled by the callback
    } catch (error) {
      console.error('Failed to switch mode:', error);
      setError(`Failed to switch to ${newMode} mode. Please try again.`);
      setIsTransitioning(false);
    }
  };

  const sendMessage = async (message: string, metadata?: Record<string, any>) => {
    if (!sessionId) return;

    try {
      await multimodalConversationManager.sendMessage(sessionId, message, metadata);
      
      // Update conversation history
      const history = multimodalConversationManager.getConversationHistory(sessionId);
      setConversationHistory(history);
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  const endSession = async () => {
    if (!sessionId) return;

    try {
      const stats = await multimodalConversationManager.endSession(sessionId);
      setSessionId(null);
      onSessionEnd?.(stats);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const getModeIcon = (mode: ConversationMode) => {
    switch (mode) {
      case 'text':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
        );
      case 'voice':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        );
      case 'video':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        );
    }
  };

  const getModeLabel = (mode: ConversationMode) => {
    switch (mode) {
      case 'text': return 'Text Chat';
      case 'voice': return 'Voice Call';
      case 'video': return 'Video Call';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={initializeSession}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Mode Selector Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Conversation with {agentConfig.name}
            </h3>
            {sessionStats && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Quality:</span>
                <span className={`font-medium ${getQualityColor(sessionStats.qualityInfo?.connectionQuality)}`}>
                  {sessionStats.qualityInfo?.connectionQuality || 'unknown'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {availableModes.map((mode) => (
              <button
                key={mode}
                onClick={() => switchMode(mode)}
                disabled={isTransitioning || currentMode === mode}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={`Switch to ${getModeLabel(mode)}`}
              >
                {getModeIcon(mode)}
                <span>{getModeLabel(mode)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Transition Indicator */}
        {isTransitioning && (
          <div className="mt-3 flex items-center space-x-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Switching conversation mode...</span>
          </div>
        )}

        {/* Session Stats */}
        {sessionStats && !isTransitioning && (
          <div className="mt-3 flex items-center space-x-6 text-sm text-gray-500">
            <span>Messages: {sessionStats.metrics.totalMessages}</span>
            <span>Mode Changes: {sessionStats.metrics.modeChanges}</span>
            <span>Avg Response: {Math.round(sessionStats.metrics.averageResponseTime)}ms</span>
            {userPreferences.autoSwitch && (
              <span className="text-blue-600">Auto-switch enabled</span>
            )}
          </div>
        )}
      </div>

      {/* Conversation Interface */}
      <div className="flex-1 relative">
        {/* Text Mode */}
        {currentMode === 'text' && !isTransitioning && (
          <div className="h-full">
            <ChatWidget
              agentId={sessionId || 'multimodal'}
              onMessage={sendMessage}
              conversationHistory={conversationHistory}
            />
          </div>
        )}

        {/* Voice Mode */}
        {currentMode === 'voice' && !isTransitioning && (
          <div className="h-full">
            <VoiceChat
              agentConfig={{
                name: agentConfig.name,
                personality: agentConfig.personality,
                voice: agentConfig.voice || 'default'
              }}
              onMessage={sendMessage}
              onError={(error) => setError(error.message)}
            />
          </div>
        )}

        {/* Video Mode */}
        {currentMode === 'video' && !isTransitioning && (
          <div className="h-full">
            <VideoChat
              roomName={sessionId ? `multimodal-${sessionId}` : undefined}
              participantName="User"
              agentEnabled={true}
              onError={(error) => setError(error.message)}
            />
          </div>
        )}

        {/* Transition Overlay */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Switching to {getModeLabel(currentMode)}...</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer with Context Preservation Indicator */}
      {sessionStats && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Session Duration: {Math.round((Date.now() - new Date(sessionStats.metrics.startTime).getTime()) / 1000)}s
            </span>
            <span className="flex items-center space-x-1">
              <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Context preserved across modes</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultimodalConversation;