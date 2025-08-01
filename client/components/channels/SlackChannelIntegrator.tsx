/**
 * Slack Channel Integrator
 * Specialized component for Slack workspace integration
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  MessageSquare,
  Key,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Hash
} from 'lucide-react';

interface SlackConfig {
  workspaceUrl: string;
  botToken: string;
  signingSecret?: string;
  defaultChannel?: string;
  botName?: string;
  botUserId?: string;
  teamName?: string;
  status?: 'connected' | 'disconnected' | 'error';
  lastVerified?: string;
}

interface SlackChannelIntegratorProps {
  onConfigChange: (config: SlackConfig) => void;
  initialConfig?: SlackConfig;
  className?: string;
}

export const SlackChannelIntegrator: React.FC<SlackChannelIntegratorProps> = ({
  onConfigChange,
  initialConfig,
  className = ''
}) => {
  const [config, setConfig] = useState<SlackConfig>(
    initialConfig || {
      workspaceUrl: '',
      botToken: '',
      defaultChannel: '#general',
      botName: 'Assistant Bot'
    }
  );
  const [testing, setTesting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  const validateConfig = (): boolean => {
    const errors: Record<string, string> = {};

    if (!config.workspaceUrl.trim()) {
      errors.workspaceUrl = 'Workspace URL is required';
    } else if (!isValidSlackUrl(config.workspaceUrl)) {
      errors.workspaceUrl = 'Please enter a valid Slack workspace URL';
    }

    if (!config.botToken.trim()) {
      errors.botToken = 'Bot Token is required';
    } else if (!config.botToken.startsWith('xoxb-')) {
      errors.botToken = 'Bot token should start with "xoxb-"';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidSlackUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.endsWith('.slack.com');
    } catch {
      return false;
    }
  };

  const testConnection = async () => {
    if (!validateConfig()) return;

    setTesting(true);
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        headers: {
          'Authorization': `Bearer ${config.botToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.ok) {
        setConfig(prev => ({
          ...prev,
          botUserId: data.user_id,
          teamName: data.team,
          status: 'connected',
          lastVerified: new Date().toISOString()
        }));
      } else {
        setConfig(prev => ({
          ...prev,
          status: 'error'
        }));
        throw new Error(data.error || 'Connection failed');
      }
    } catch (error) {
      console.error('Slack connection test failed:', error);
      setConfig(prev => ({
        ...prev,
        status: 'error'
      }));
    } finally {
      setTesting(false);
    }
  };

  const updateConfig = (key: keyof SlackConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setValidationErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const formatWorkspaceUrl = (url: string) => {
    if (url && !url.startsWith('http')) {
      return `https://${url}`;
    }
    return url;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <MessageSquare className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Slack Integration</h3>
          <p className="text-gray-600">Connect your Slack workspace</p>
        </div>
        {config.status && (
          <Badge
            variant={config.status === 'connected' ? 'default' : 'destructive'}
            className="ml-auto"
          >
            {config.status === 'connected' && <CheckCircle className="h-3 w-3 mr-1" />}
            {config.status === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
            {config.status}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="credentials" className="space-y-4">
        <TabsList>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Slack App Credentials</span>
              </CardTitle>
              <CardDescription>
                Enter your Slack app credentials from api.slack.com
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="workspaceUrl">Workspace URL *</Label>
                <Input
                  id="workspaceUrl"
                  value={config.workspaceUrl}
                  onChange={(e) => updateConfig('workspaceUrl', formatWorkspaceUrl(e.target.value))}
                  placeholder="https://your-workspace.slack.com"
                  className={validationErrors.workspaceUrl ? 'border-red-500' : ''}
                />
                {validationErrors.workspaceUrl && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.workspaceUrl}</p>
                )}
              </div>

              <div>
                <Label htmlFor="botToken">Bot User OAuth Token *</Label>
                <Input
                  id="botToken"
                  type="password"
                  value={config.botToken}
                  onChange={(e) => updateConfig('botToken', e.target.value)}
                  placeholder="xoxb-your-bot-token"
                  className={validationErrors.botToken ? 'border-red-500' : ''}
                />
                {validationErrors.botToken && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.botToken}</p>
                )}
              </div>

              <div>
                <Label htmlFor="signingSecret">Signing Secret (Optional)</Label>
                <Input
                  id="signingSecret"
                  type="password"
                  value={config.signingSecret || ''}
                  onChange={(e) => updateConfig('signingSecret', e.target.value)}
                  placeholder="Your app's signing secret"
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <ExternalLink className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800">Need to create a Slack app?</p>
                    <p className="text-blue-700 mt-1">
                      Visit{' '}
                      <a
                        href="https://api.slack.com/apps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:no-underline"
                      >
                        api.slack.com/apps
                      </a>
                      {' '}to create a new Slack app.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bot Configuration</CardTitle>
              <CardDescription>
                Configure your Slack bot behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="defaultChannel">Default Channel</Label>
                <div className="flex items-center space-x-2">
                  <Hash className="h-4 w-4 text-gray-500" />
                  <Input
                    id="defaultChannel"
                    value={config.defaultChannel || ''}
                    onChange={(e) => updateConfig('defaultChannel', e.target.value)}
                    placeholder="general"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="botName">Bot Display Name</Label>
                <Input
                  id="botName"
                  value={config.botName || ''}
                  onChange={(e) => updateConfig('botName', e.target.value)}
                  placeholder="Assistant Bot"
                />
              </div>

              {config.teamName && (
                <div>
                  <Label>Connected Workspace</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{config.teamName}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connection Test</CardTitle>
              <CardDescription>
                Test your Slack integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Button
                  onClick={testConnection}
                  disabled={testing}
                  className="mb-4"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Test Slack Connection
                    </>
                  )}
                </Button>

                {config.status && (
                  <div className={`p-4 rounded-lg border ${config.status === 'connected'
                    ? 'bg-green-50 border-green-200'
                    : config.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                    }`}>
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      {config.status === 'connected' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : config.status === 'error' ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : null}
                      <span className={`font-medium ${config.status === 'connected'
                        ? 'text-green-800'
                        : config.status === 'error'
                          ? 'text-red-800'
                          : 'text-gray-800'
                        }`}>
                        {config.status === 'connected' && 'Connection Successful'}
                        {config.status === 'error' && 'Connection Failed'}
                        {config.status === 'disconnected' && 'Not Connected'}
                      </span>
                    </div>

                    {config.status === 'connected' && config.teamName && (
                      <p className="text-sm text-green-700">
                        Successfully connected to workspace: {config.teamName}
                      </p>
                    )}

                    {config.lastVerified && (
                      <p className="text-xs text-gray-500 mt-2">
                        Last verified: {new Date(config.lastVerified).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SlackChannelIntegrator;