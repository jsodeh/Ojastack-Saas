/**
 * Channel Tester
 * Component for testing channel connectivity and functionality
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  TestTube, 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  MessageSquare,
  Phone,
  Globe,
  Webhook,
  Settings
} from 'lucide-react';
import { ChannelIntegrator, ChannelConfig } from '../../lib/channel-integrator';

interface TestResult {
  success: boolean;
  message: string;
  timestamp: string;
  details?: any;
}

interface ChannelTesterProps {
  channel: ChannelConfig;
  onTestComplete?: (result: TestResult) => void;
  className?: string;
}

export const ChannelTester: React.FC<ChannelTesterProps> = ({
  channel,
  onTestComplete,
  className = ''
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testMessage, setTestMessage] = useState('Hello! This is a test message from Ojastack.');
  const [recipientId, setRecipientId] = useState('');

  const channelIntegrator = ChannelIntegrator.getInstance();

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <MessageSquare className="h-5 w-5 text-green-600" />;
      case 'slack':
        return <MessageSquare className="h-5 w-5 text-purple-600" />;
      case 'webchat':
        return <Globe className="h-5 w-5 text-blue-600" />;
      case 'api':
        return <Settings className="h-5 w-5 text-orange-600" />;
      case 'webhook':
        return <Webhook className="h-5 w-5 text-indigo-600" />;
      default:
        return <TestTube className="h-5 w-5 text-gray-600" />;
    }
  };

  const getChannelName = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return 'WhatsApp Business';
      case 'slack':
        return 'Slack';
      case 'webchat':
        return 'Web Chat';
      case 'api':
        return 'REST API';
      case 'webhook':
        return 'Webhook';
      default:
        return type;
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await channelIntegrator.testChannelConnection('test-user', channel);
      
      const testResult: TestResult = {
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString(),
        details: result.details
      };

      setTestResult(testResult);
      onTestComplete?.(testResult);
    } catch (error) {
      const testResult: TestResult = {
        success: false,
        message: error.message || 'Connection test failed',
        timestamp: new Date().toISOString()
      };

      setTestResult(testResult);
      onTestComplete?.(testResult);
    } finally {
      setTesting(false);
    }
  };

  const sendTestMessage = async () => {
    if (!recipientId.trim() || !testMessage.trim()) {
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const message = await channelIntegrator.sendMessage(channel.id!, {
        channelId: channel.id!,
        channelType: channel.type,
        direction: 'outbound',
        content: {
          type: 'text',
          data: { text: testMessage }
        },
        sender: {
          id: 'test-bot',
          name: 'Test Bot'
        },
        recipient: {
          id: recipientId,
          name: 'Test Recipient'
        }
      });

      const testResult: TestResult = {
        success: message !== null,
        message: message ? 'Test message sent successfully' : 'Failed to send test message',
        timestamp: new Date().toISOString(),
        details: message
      };

      setTestResult(testResult);
      onTestComplete?.(testResult);
    } catch (error) {
      const testResult: TestResult = {
        success: false,
        message: error.message || 'Failed to send test message',
        timestamp: new Date().toISOString()
      };

      setTestResult(testResult);
      onTestComplete?.(testResult);
    } finally {
      setTesting(false);
    }
  };

  const getRecipientPlaceholder = () => {
    switch (channel.type) {
      case 'whatsapp':
        return 'Phone number (e.g., +1234567890)';
      case 'slack':
        return 'Channel ID or user ID (e.g., #general or @username)';
      case 'webchat':
        return 'Session ID or user ID';
      case 'api':
        return 'User ID or endpoint identifier';
      case 'webhook':
        return 'Target identifier';
      default:
        return 'Recipient ID';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        {getChannelIcon(channel.type)}
        <div>
          <h3 className="text-lg font-semibold">Test {getChannelName(channel.type)} Channel</h3>
          <p className="text-gray-600">Verify connectivity and send test messages</p>
        </div>
        <Badge variant={channel.enabled ? 'default' : 'secondary'} className="ml-auto">
          {channel.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </div>

      {/* Channel Info */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Name:</span>
              <span className="ml-2 font-medium">{channel.name}</span>
            </div>
            <div>
              <span className="text-gray-600">Type:</span>
              <span className="ml-2 font-medium capitalize">{channel.type}</span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <Badge variant={channel.enabled ? 'default' : 'secondary'}>
                {channel.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div>
              <span className="text-gray-600">Last Test:</span>
              <span className="ml-2 font-medium">
                {channel.testResults?.timestamp 
                  ? new Date(channel.testResults.timestamp).toLocaleString()
                  : 'Never'
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="h-5 w-5" />
            <span>Connection Test</span>
          </CardTitle>
          <CardDescription>
            Test the basic connectivity to your {getChannelName(channel.type)} channel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Button
              onClick={testConnection}
              disabled={testing || !channel.enabled}
              className="mb-4"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>

            {!channel.enabled && (
              <p className="text-sm text-gray-500 mb-4">
                Channel must be enabled to run tests
              </p>
            )}
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={`font-medium ${
                  testResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                </span>
              </div>
              <p className={`text-sm ${
                testResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {testResult.message}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Tested at {new Date(testResult.timestamp).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Test */}
      {channel.type !== 'api' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="h-5 w-5" />
              <span>Message Test</span>
            </CardTitle>
            <CardDescription>
              Send a test message through your {getChannelName(channel.type)} channel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="recipientId">Recipient</Label>
              <Input
                id="recipientId"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                placeholder={getRecipientPlaceholder()}
              />
              <p className="text-xs text-gray-500 mt-1">
                {channel.type === 'whatsapp' && 'Use international format with country code'}
                {channel.type === 'slack' && 'Use channel name (#general) or user ID (@username)'}
                {channel.type === 'webchat' && 'Use the session ID from your web chat widget'}
              </p>
            </div>

            <div>
              <Label htmlFor="testMessage">Test Message</Label>
              <Textarea
                id="testMessage"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter your test message here..."
                rows={3}
              />
            </div>

            <Button
              onClick={sendTestMessage}
              disabled={testing || !channel.enabled || !recipientId.trim() || !testMessage.trim()}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Message...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Message
                </>
              )}
            </Button>

            {channel.type === 'webchat' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800">Web Chat Testing</p>
                    <p className="text-blue-700 mt-1">
                      For web chat testing, you'll need an active session from your embedded widget.
                      The message will appear in the chat interface on your website.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Summary</CardTitle>
          <CardDescription>
            Current configuration for this channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(channel.configuration).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1')}:
                </span>
                <span className="text-sm text-gray-600 font-mono">
                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                </span>
              </div>
            ))}
          </div>

          {Object.keys(channel.configuration).length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">No configuration parameters set</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test History */}
      {channel.testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Test Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-3 rounded-lg border ${
              channel.testResults.status === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 mb-1">
                {channel.testResults.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={`font-medium text-sm ${
                  channel.testResults.status === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {channel.testResults.status === 'success' ? 'Success' : 'Failed'}
                </span>
              </div>
              <p className={`text-sm ${
                channel.testResults.status === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {channel.testResults.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(channel.testResults.timestamp).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ChannelTester;