import React, { useState, useEffect } from 'react';
import VideoChat from './VideoChat';
import { videoConversationManager } from '../lib/video-conversation-manager';
import { liveKitService } from '../lib/livekit-service';
import { enhancedAIService } from '../lib/enhanced-ai-service';
import { elevenLabsService } from '../lib/elevenlabs-service';

interface ServiceStatus {
  livekit: { success: boolean; error?: string };
  ai: Record<string, any>;
  voice: { success: boolean; error?: string };
  speechRecognition: boolean;
}

const VideoTestingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'test' | 'conversation' | 'status'>('status');
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [conversationConfig, setConversationConfig] = useState({
    roomName: `test-room-${Date.now()}`,
    userName: 'Test User',
    agentName: 'AI Assistant',
    agentPersonality: 'helpful and professional',
    enableVideo: true,
    enableAudio: true,
    enableVoice: true,
    enableRecording: false
  });
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  useEffect(() => {
    checkServiceStatus();
  }, []);

  const checkServiceStatus = async () => {
    setIsLoading(true);
    try {
      const status = await videoConversationManager.testCapabilities();
      setServiceStatus(status);
      
      const results = [];
      results.push(`LiveKit: ${status.livekit.success ? '✅ Connected' : '❌ ' + (status.livekit.error || 'Failed')}`);
      results.push(`OpenAI: ${status.ai.openai?.success ? '✅ Connected' : '❌ ' + (status.ai.openai?.error || 'Failed')}`);
      results.push(`Claude: ${status.ai.claude?.success ? '✅ Connected' : '❌ ' + (status.ai.claude?.error || 'Failed')}`);
      results.push(`ElevenLabs: ${status.voice.success ? '✅ Connected' : '❌ ' + (status.voice.error || 'Failed')}`);
      results.push(`Speech Recognition: ${status.speechRecognition ? '✅ Available' : '❌ Not Available'}`);
      
      setTestResults(results);
    } catch (error) {
      console.error('Failed to check service status:', error);
      setTestResults(['❌ Failed to check service status']);
    } finally {
      setIsLoading(false);
    }
  };

  const startTestConversation = async () => {
    setIsLoading(true);
    try {
      const roomName = await videoConversationManager.startConversation({
        roomName: conversationConfig.roomName,
        agentConfig: {
          name: conversationConfig.agentName,
          personality: conversationConfig.agentPersonality,
          systemPrompt: `You are ${conversationConfig.agentName}, a ${conversationConfig.agentPersonality} AI assistant. You are having a video conversation with a user. Keep responses concise and engaging.`
        },
        userConfig: {
          name: conversationConfig.userName,
          enableVideo: conversationConfig.enableVideo,
          enableAudio: conversationConfig.enableAudio
        },
        features: {
          voiceResponse: conversationConfig.enableVoice,
          recording: conversationConfig.enableRecording,
          screenSharing: true,
          chatOverlay: true
        }
      });

      setActiveConversation(roomName);
      setActiveTab('conversation');
      setTestResults(prev => [...prev, `✅ Started conversation: ${roomName}`]);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setTestResults(prev => [...prev, `❌ Failed to start conversation: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const endTestConversation = async () => {
    if (!activeConversation) return;

    setIsLoading(true);
    try {
      const results = await videoConversationManager.endConversation(activeConversation);
      setActiveConversation(null);
      setActiveTab('test');
      setTestResults(prev => [...prev, 
        `✅ Ended conversation`,
        `Duration: ${Math.round(results.duration / 1000)}s`,
        `Messages: ${results.messagesExchanged}`,
        results.recordingUrl ? `Recording: ${results.recordingUrl}` : ''
      ].filter(Boolean));
    } catch (error) {
      console.error('Failed to end conversation:', error);
      setTestResults(prev => [...prev, `❌ Failed to end conversation: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const testIndividualServices = async () => {
    setIsLoading(true);
    setTestResults(['🧪 Testing individual services...']);

    try {
      // Test LiveKit
      setTestResults(prev => [...prev, '🔄 Testing LiveKit...']);
      const livekitTest = await liveKitService.testConnection();
      setTestResults(prev => [...prev, 
        livekitTest.success ? '✅ LiveKit: Connected' : `❌ LiveKit: ${livekitTest.error}`
      ]);

      // Test AI Services
      setTestResults(prev => [...prev, '🔄 Testing AI services...']);
      const aiTests = await enhancedAIService.testProviders();
      Object.entries(aiTests).forEach(([provider, result]) => {
        setTestResults(prev => [...prev, 
          result.success ? `✅ ${provider}: Connected (${result.responseTime}ms)` : `❌ ${provider}: ${result.error}`
        ]);
      });

      // Test ElevenLabs
      setTestResults(prev => [...prev, '🔄 Testing ElevenLabs...']);
      const voiceTest = await elevenLabsService.testConnection();
      setTestResults(prev => [...prev, 
        voiceTest.success ? '✅ ElevenLabs: Connected' : `❌ ElevenLabs: ${voiceTest.error}`
      ]);

      // Test Speech Recognition
      const speechAvailable = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      setTestResults(prev => [...prev, 
        speechAvailable ? '✅ Speech Recognition: Available' : '❌ Speech Recognition: Not Available'
      ]);

      setTestResults(prev => [...prev, '✅ All tests completed']);
    } catch (error) {
      setTestResults(prev => [...prev, `❌ Test failed: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('status')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'status'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Service Status
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'test'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Testing Tools
            </button>
            <button
              onClick={() => setActiveTab('conversation')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'conversation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Live Conversation
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'status' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Video Service Status</h2>
                <button
                  onClick={checkServiceStatus}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Checking...' : 'Refresh Status'}
                </button>
              </div>

              {serviceStatus && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg border ${
                    serviceStatus.livekit.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <h3 className="font-semibold text-gray-900">LiveKit Video</h3>
                    <p className={`text-sm ${serviceStatus.livekit.success ? 'text-green-600' : 'text-red-600'}`}>
                      {serviceStatus.livekit.success ? 'Connected' : serviceStatus.livekit.error}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg border ${
                    serviceStatus.ai.openai?.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <h3 className="font-semibold text-gray-900">OpenAI</h3>
                    <p className={`text-sm ${serviceStatus.ai.openai?.success ? 'text-green-600' : 'text-red-600'}`}>
                      {serviceStatus.ai.openai?.success ? 'Connected' : serviceStatus.ai.openai?.error}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg border ${
                    serviceStatus.ai.claude?.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <h3 className="font-semibold text-gray-900">Claude AI</h3>
                    <p className={`text-sm ${serviceStatus.ai.claude?.success ? 'text-green-600' : 'text-red-600'}`}>
                      {serviceStatus.ai.claude?.success ? 'Connected' : serviceStatus.ai.claude?.error}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg border ${
                    serviceStatus.voice.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <h3 className="font-semibold text-gray-900">ElevenLabs Voice</h3>
                    <p className={`text-sm ${serviceStatus.voice.success ? 'text-green-600' : 'text-red-600'}`}>
                      {serviceStatus.voice.success ? 'Connected' : serviceStatus.voice.error}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg border ${
                    serviceStatus.speechRecognition ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <h3 className="font-semibold text-gray-900">Speech Recognition</h3>
                    <p className={`text-sm ${serviceStatus.speechRecognition ? 'text-green-600' : 'text-yellow-600'}`}>
                      {serviceStatus.speechRecognition ? 'Available' : 'Not Available'}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                    <h3 className="font-semibold text-gray-900">Video Conversations</h3>
                    <p className="text-sm text-blue-600">
                      {videoConversationManager.isAvailable() ? 'Ready' : 'Not Available'}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Service Capabilities</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• HD Video Conversations with AI Agents</li>
                  <li>• Real-time Voice Synthesis (ElevenLabs)</li>
                  <li>• Speech Recognition for Voice Input</li>
                  <li>• Multi-provider AI (OpenAI + Claude)</li>
                  <li>• Screen Sharing and Recording</li>
                  <li>• Real-time Chat Overlay</li>
                  <li>• Conversation Analytics</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Video Testing Tools</h2>
                <div className="space-x-2">
                  <button
                    onClick={testIndividualServices}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Testing...' : 'Test All Services'}
                  </button>
                  <button
                    onClick={clearResults}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Clear Results
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Conversation Configuration</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                      <input
                        type="text"
                        value={conversationConfig.roomName}
                        onChange={(e) => setConversationConfig(prev => ({ ...prev, roomName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User Name</label>
                        <input
                          type="text"
                          value={conversationConfig.userName}
                          onChange={(e) => setConversationConfig(prev => ({ ...prev, userName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                        <input
                          type="text"
                          value={conversationConfig.agentName}
                          onChange={(e) => setConversationConfig(prev => ({ ...prev, agentName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Agent Personality</label>
                      <input
                        type="text"
                        value={conversationConfig.agentPersonality}
                        onChange={(e) => setConversationConfig(prev => ({ ...prev, agentPersonality: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., helpful and professional, friendly and casual"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Features</label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={conversationConfig.enableVideo}
                            onChange={(e) => setConversationConfig(prev => ({ ...prev, enableVideo: e.target.checked }))}
                            className="mr-2"
                          />
                          Enable Video
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={conversationConfig.enableAudio}
                            onChange={(e) => setConversationConfig(prev => ({ ...prev, enableAudio: e.target.checked }))}
                            className="mr-2"
                          />
                          Enable Audio
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={conversationConfig.enableVoice}
                            onChange={(e) => setConversationConfig(prev => ({ ...prev, enableVoice: e.target.checked }))}
                            className="mr-2"
                          />
                          Enable Voice Synthesis
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={conversationConfig.enableRecording}
                            onChange={(e) => setConversationConfig(prev => ({ ...prev, enableRecording: e.target.checked }))}
                            className="mr-2"
                          />
                          Enable Recording
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={startTestConversation}
                      disabled={isLoading || !!activeConversation}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Starting...' : activeConversation ? 'Conversation Active' : 'Start Test Conversation'}
                    </button>

                    {activeConversation && (
                      <button
                        onClick={endTestConversation}
                        disabled={isLoading}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {isLoading ? 'Ending...' : 'End Conversation'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Test Results</h3>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
                    {testResults.length === 0 ? (
                      <div className="text-gray-500">No test results yet. Run some tests to see output here.</div>
                    ) : (
                      testResults.map((result, index) => (
                        <div key={index} className="mb-1">
                          {result}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'conversation' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Live Video Conversation</h2>
                {activeConversation && (
                  <div className="text-sm text-gray-600">
                    Room: {activeConversation}
                  </div>
                )}
              </div>

              {activeConversation ? (
                <VideoChat
                  roomName={activeConversation}
                  participantName={conversationConfig.userName}
                  agentEnabled={true}
                  onRoomJoined={(room) => {
                    console.log('Joined room:', room);
                  }}
                  onRoomLeft={() => {
                    setActiveConversation(null);
                    setActiveTab('test');
                  }}
                  onError={(error) => {
                    console.error('Video chat error:', error);
                    setTestResults(prev => [...prev, `❌ Video chat error: ${error.message}`]);
                  }}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-4">No active conversation</div>
                  <button
                    onClick={() => setActiveTab('test')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Start a Test Conversation
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoTestingDashboard;