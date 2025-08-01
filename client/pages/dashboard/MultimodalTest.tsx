import React, { useState, useEffect } from 'react';
import MultimodalConversation from '../../components/MultimodalConversation';
import { conversationAnalytics, type ConversationMetrics } from '../../lib/conversation-analytics';
import { multimodalConversationManager, type ConversationMode } from '../../lib/multimodal-conversation';

const MultimodalTest: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentMode, setCurrentMode] = useState<ConversationMode>('text');
  const [sessionStats, setSessionStats] = useState<ConversationMetrics | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [agentConfig, setAgentConfig] = useState({
    name: 'Multimodal Assistant',
    personality: 'helpful and adaptive',
    voice: 'professional',
    avatar: '🤖'
  });
  const [userPreferences, setUserPreferences] = useState({
    preferredMode: 'text' as ConversationMode,
    autoSwitch: true,
    qualityAdaptation: true
  });

  // Update analytics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const summary = conversationAnalytics.getAnalyticsSummary();
      setAnalyticsData(summary);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleModeChange = (mode: ConversationMode) => {
    setCurrentMode(mode);
  };

  const handleSessionEnd = (stats: any) => {
    setIsActive(false);
    setSessionStats(stats);
    
    // Update analytics
    const summary = conversationAnalytics.getAnalyticsSummary();
    setAnalyticsData(summary);
  };

  const startNewSession = () => {
    setIsActive(true);
    setSessionStats(null);
  };

  const getModeIcon = (mode: ConversationMode) => {
    switch (mode) {
      case 'text':
        return '💬';
      case 'voice':
        return '🎤';
      case 'video':
        return '📹';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Multimodal Conversation Testing</h1>
          <p className="mt-2 text-gray-600">
            Test seamless switching between text, voice, and video conversations with context preservation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Agent Configuration */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                  <input
                    type="text"
                    value={agentConfig.name}
                    onChange={(e) => setAgentConfig(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isActive}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personality</label>
                  <input
                    type="text"
                    value={agentConfig.personality}
                    onChange={(e) => setAgentConfig(prev => ({ ...prev, personality: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isActive}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Voice</label>
                  <select
                    value={agentConfig.voice}
                    onChange={(e) => setAgentConfig(prev => ({ ...prev, voice: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isActive}
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Avatar</label>
                  <input
                    type="text"
                    value={agentConfig.avatar}
                    onChange={(e) => setAgentConfig(prev => ({ ...prev, avatar: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isActive}
                  />
                </div>
              </div>
            </div>

            {/* User Preferences */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Preferences</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Mode</label>
                  <select
                    value={userPreferences.preferredMode}
                    onChange={(e) => setUserPreferences(prev => ({ 
                      ...prev, 
                      preferredMode: e.target.value as ConversationMode 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isActive}
                  >
                    <option value="text">Text Chat</option>
                    <option value="voice">Voice Call</option>
                    <option value="video">Video Call</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={userPreferences.autoSwitch}
                      onChange={(e) => setUserPreferences(prev => ({ 
                        ...prev, 
                        autoSwitch: e.target.checked 
                      }))}
                      className="mr-2"
                      disabled={isActive}
                    />
                    <span className="text-sm text-gray-700">Auto-switch modes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={userPreferences.qualityAdaptation}
                      onChange={(e) => setUserPreferences(prev => ({ 
                        ...prev, 
                        qualityAdaptation: e.target.checked 
                      }))}
                      className="mr-2"
                      disabled={isActive}
                    />
                    <span className="text-sm text-gray-700">Quality adaptation</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Session Controls */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Control</h3>
              {!isActive ? (
                <button
                  onClick={startNewSession}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Start Multimodal Session
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-green-600">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Session Active</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Current Mode: {getModeIcon(currentMode)} {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}
                  </div>
                </div>
              )}
            </div>

            {/* Session Stats */}
            {sessionStats && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Session Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{formatDuration(sessionStats.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Messages:</span>
                    <span className="font-medium">{sessionStats.totalMessages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mode Changes:</span>
                    <span className="font-medium">{sessionStats.modeChanges}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Final Mode:</span>
                    <span className="font-medium">{sessionStats.finalMode}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Conversation Interface */}
          <div className="lg:col-span-2">
            {isActive ? (
              <div className="h-[600px]">
                <MultimodalConversation
                  agentConfig={agentConfig}
                  userPreferences={userPreferences}
                  onModeChange={handleModeChange}
                  onSessionEnd={handleSessionEnd}
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🤖</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Ready for Multimodal Conversation
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Start a session to test seamless switching between text, voice, and video modes.
                  </p>
                  <button
                    onClick={startNewSession}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Start Session
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analytics Dashboard */}
        {analyticsData && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{analyticsData.totalSessions}</div>
                <div className="text-sm text-blue-800">Total Sessions</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatDuration(analyticsData.averageSessionDuration)}
                </div>
                <div className="text-sm text-green-800">Avg Duration</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(analyticsData.averageQuality * 100)}%
                </div>
                <div className="text-sm text-purple-800">Avg Quality</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {analyticsData.mostCommonIssues.length}
                </div>
                <div className="text-sm text-orange-800">Issue Types</div>
              </div>
            </div>

            {/* Mode Preferences */}
            {analyticsData.modePreferences && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Mode Usage Distribution</h4>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(analyticsData.modePreferences).map(([mode, count]) => (
                    <div key={mode} className="text-center">
                      <div className="text-2xl mb-1">{getModeIcon(mode as ConversationMode)}</div>
                      <div className="text-lg font-semibold">{count}</div>
                      <div className="text-sm text-gray-600 capitalize">{mode}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Common Issues */}
            {analyticsData.mostCommonIssues.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Most Common Issues</h4>
                <div className="space-y-2">
                  {analyticsData.mostCommonIssues.slice(0, 5).map((issue: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{issue.type}</span>
                      <span className="text-sm font-medium text-gray-900">{issue.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultimodalTest;