/**
 * Channel Configuration Wizard
 * Step-by-step wizard for configuring communication channels
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  MessageSquare, 
  Globe, 
  Webhook,
  Settings,
  TestTube,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { ChannelIntegrator } from '../../lib/channel-integrator';
import { useAuth } from '../../hooks/useAuth';

export interface ChannelConfig {
  id?: string;
  type: 'whatsapp' | 'slack' | 'webchat' | 'api' | 'webhook';
  name: string;
  description?: string;
  enabled: boolean;
  configuration: Record<string, any>;
  authentication?: Record<string, any>;
  testResults?: {
    status: 'pending' | 'success' | 'error';
    message: string;
    timestamp: string;
  };
}

interface ChannelConfigurationWizardProps {
  onComplete: (config: ChannelConfig) => void;
  onCancel: () => void;
  initialConfig?: ChannelConfig;
  className?: string;
}

const CHANNEL_TYPES = [
  {
    type: 'whatsapp' as const,
    name: 'WhatsApp Business',
    description: 'Connect to WhatsApp Business API for messaging',
    icon: MessageSquare,
    color: 'bg-green-500',
    features: ['Rich messaging', 'Media support', 'Templates', 'Webhooks']
  },
  {
    type: 'slack' as const,
    name: 'Slack',
    description: 'Integrate with Slack workspaces and channels',
    icon: MessageSquare,
    color: 'bg-purple-500',
    features: ['Channel integration', 'Direct messages', 'Bot commands', 'Interactive components']
  },
  {
    type: 'webchat' as const,
    name: 'Web Chat',
    description: 'Embeddable chat widget for websites',
    icon: Globe,
    color: 'bg-blue-500',
    features: ['Customizable UI', 'Real-time messaging', 'File uploads', 'Typing indicators']
  },
  {
    type: 'api' as const,
    name: 'REST API',
    description: 'Direct API integration for custom applications',
    icon: Settings,
    color: 'bg-orange-500',
    features: ['RESTful endpoints', 'Authentication', 'Rate limiting', 'Documentation']
  },
  {
    type: 'webhook' as const,
    name: 'Webhooks',
    description: 'Receive events via HTTP webhooks',
    icon: Webhook,
    color: 'bg-indigo-500',
    features: ['Event notifications', 'Custom payloads', 'Retry logic', 'Security headers']
  }
];

export const ChannelConfigurationWizard: React.FC<ChannelConfigurationWizardProps> = ({
  onComplete,
  onCancel,
  initialConfig,
  className = ''
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<ChannelConfig>(
    initialConfig || {
      type: 'whatsapp',
      name: '',
      enabled: true,
      configuration: {},
      authentication: {}
    }
  );
  const [testing, setTesting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const channelIntegrator = ChannelIntegrator.getInstance();

  const steps = [
    { id: 'type', title: 'Channel Type', description: 'Choose your communication channel' },
    { id: 'basic', title: 'Basic Settings', description: 'Configure basic channel settings' },
    { id: 'configuration', title: 'Configuration', description: 'Set up channel-specific options' },
    { id: 'authentication', title: 'Authentication', description: 'Configure authentication credentials' },
    { id: 'test', title: 'Test & Verify', description: 'Test the channel connection' },
    { id: 'review', title: 'Review', description: 'Review and confirm settings' }
  ];

  const selectedChannelType = CHANNEL_TYPES.find(ct => ct.type === config.type);

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1: // Basic settings
        if (!config.name.trim()) {
          errors.name = 'Channel name is required';
        }
        break;
      case 2: // Configuration
        if (config.type === 'whatsapp') {
          if (!config.configuration.phoneNumberId) {
            errors.phoneNumberId = 'Phone Number ID is required';
          }
          if (!config.configuration.businessAccountId) {
            errors.businessAccountId = 'Business Account ID is required';
          }
        } else if (config.type === 'slack') {
          if (!config.configuration.workspaceUrl) {
            errors.workspaceUrl = 'Workspace URL is required';
          }
        } else if (config.type === 'webhook') {
          if (!config.configuration.url) {
            errors.url = 'Webhook URL is required';
          }
        }
        break;
      case 3: // Authentication
        if (config.type === 'whatsapp') {
          if (!config.authentication?.accessToken) {
            errors.accessToken = 'Access Token is required';
          }
        } else if (config.type === 'slack') {
          if (!config.authentication?.botToken) {
            errors.botToken = 'Bot Token is required';
          }
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleTestConnection = async () => {
    if (!user) return;

    setTesting(true);
    try {
      const result = await channelIntegrator.testChannelConnection(user.id, config);
      
      setConfig(prev => ({
        ...prev,
        testResults: {
          status: result.success ? 'success' : 'error',
          message: result.message,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      setConfig(prev => ({
        ...prev,
        testResults: {
          status: 'error',
          message: error.message || 'Connection test failed',
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setTesting(false);
    }
  };

  const handleComplete = () => {
    if (validateStep(currentStep)) {
      onComplete(config);
    }
  };

  const updateConfig = (updates: Partial<ChannelConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setValidationErrors({});
  };

  const updateConfiguration = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      configuration: { ...prev.configuration, [key]: value }
    }));
    setValidationErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const updateAuthentication = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      authentication: { ...prev.authentication, [key]: value }
    }));
    setValidationErrors(prev => ({ ...prev, [key]: undefined }));
  };

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Channel Configuration</h2>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center space-x-4 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center space-x-2 whitespace-nowrap ${
                index <= currentStep ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < currentStep
                    ? 'bg-blue-600 text-white'
                    : index === currentStep
                    ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <div className="text-sm">
                <div className="font-medium">{step.title}</div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-300 ml-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {/* Step 0: Channel Type Selection */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Choose Channel Type</h3>
                <p className="text-gray-600 mb-6">
                  Select the type of communication channel you want to configure.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CHANNEL_TYPES.map((channelType) => {
                  const Icon = channelType.icon;
                  const isSelected = config.type === channelType.type;
                  
                  return (
                    <div
                      key={channelType.type}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => updateConfig({ type: channelType.type })}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`p-2 rounded-lg ${channelType.color}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium">{channelType.name}</h4>
                          {isSelected && <Check className="h-4 w-4 text-blue-500" />}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {channelType.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {channelType.features.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1: Basic Settings */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Basic Settings</h3>
                <p className="text-gray-600 mb-6">
                  Configure the basic settings for your {selectedChannelType?.name} channel.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Channel Name *</Label>
                  <Input
                    id="name"
                    value={config.name}
                    onChange={(e) => updateConfig({ name: e.target.value })}
                    placeholder={`My ${selectedChannelType?.name} Channel`}
                    className={validationErrors.name ? 'border-red-500' : ''}
                  />
                  {validationErrors.name && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={config.description || ''}
                    onChange={(e) => updateConfig({ description: e.target.value })}
                    placeholder="Optional description for this channel"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={config.enabled}
                    onChange={(e) => updateConfig({ enabled: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="enabled">Enable this channel</Label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Configuration */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Channel Configuration</h3>
                <p className="text-gray-600 mb-6">
                  Configure {selectedChannelType?.name}-specific settings.
                </p>
              </div>

              {config.type === 'whatsapp' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                    <Input
                      id="phoneNumberId"
                      value={config.configuration.phoneNumberId || ''}
                      onChange={(e) => updateConfiguration('phoneNumberId', e.target.value)}
                      placeholder="Your WhatsApp Business phone number ID"
                      className={validationErrors.phoneNumberId ? 'border-red-500' : ''}
                    />
                    {validationErrors.phoneNumberId && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.phoneNumberId}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="businessAccountId">Business Account ID *</Label>
                    <Input
                      id="businessAccountId"
                      value={config.configuration.businessAccountId || ''}
                      onChange={(e) => updateConfiguration('businessAccountId', e.target.value)}
                      placeholder="Your WhatsApp Business Account ID"
                      className={validationErrors.businessAccountId ? 'border-red-500' : ''}
                    />
                    {validationErrors.businessAccountId && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.businessAccountId}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      value={config.configuration.webhookUrl || ''}
                      onChange={(e) => updateConfiguration('webhookUrl', e.target.value)}
                      placeholder="https://your-domain.com/webhook/whatsapp"
                    />
                  </div>

                  <div>
                    <Label htmlFor="verifyToken">Webhook Verify Token</Label>
                    <Input
                      id="verifyToken"
                      value={config.configuration.verifyToken || ''}
                      onChange={(e) => updateConfiguration('verifyToken', e.target.value)}
                      placeholder="Your webhook verification token"
                    />
                  </div>
                </div>
              )}

              {config.type === 'slack' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="workspaceUrl">Workspace URL *</Label>
                    <Input
                      id="workspaceUrl"
                      value={config.configuration.workspaceUrl || ''}
                      onChange={(e) => updateConfiguration('workspaceUrl', e.target.value)}
                      placeholder="https://your-workspace.slack.com"
                      className={validationErrors.workspaceUrl ? 'border-red-500' : ''}
                    />
                    {validationErrors.workspaceUrl && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.workspaceUrl}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="defaultChannel">Default Channel</Label>
                    <Input
                      id="defaultChannel"
                      value={config.configuration.defaultChannel || ''}
                      onChange={(e) => updateConfiguration('defaultChannel', e.target.value)}
                      placeholder="#general"
                    />
                  </div>

                  <div>
                    <Label htmlFor="botName">Bot Name</Label>
                    <Input
                      id="botName"
                      value={config.configuration.botName || ''}
                      onChange={(e) => updateConfiguration('botName', e.target.value)}
                      placeholder="Assistant Bot"
                    />
                  </div>
                </div>
              )}

              {config.type === 'webchat' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="widgetTitle">Widget Title</Label>
                    <Input
                      id="widgetTitle"
                      value={config.configuration.widgetTitle || ''}
                      onChange={(e) => updateConfiguration('widgetTitle', e.target.value)}
                      placeholder="Chat with us"
                    />
                  </div>

                  <div>
                    <Label htmlFor="welcomeMessage">Welcome Message</Label>
                    <Textarea
                      id="welcomeMessage"
                      value={config.configuration.welcomeMessage || ''}
                      onChange={(e) => updateConfiguration('welcomeMessage', e.target.value)}
                      placeholder="Hello! How can I help you today?"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <Input
                      id="primaryColor"
                      type="color"
                      value={config.configuration.primaryColor || '#3B82F6'}
                      onChange={(e) => updateConfiguration('primaryColor', e.target.value)}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="showAvatar"
                      checked={config.configuration.showAvatar || false}
                      onChange={(e) => updateConfiguration('showAvatar', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="showAvatar">Show avatar</Label>
                  </div>
                </div>
              )}

              {config.type === 'api' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="baseUrl">Base URL</Label>
                    <Input
                      id="baseUrl"
                      value={config.configuration.baseUrl || ''}
                      onChange={(e) => updateConfiguration('baseUrl', e.target.value)}
                      placeholder="https://api.your-domain.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="version">API Version</Label>
                    <Input
                      id="version"
                      value={config.configuration.version || ''}
                      onChange={(e) => updateConfiguration('version', e.target.value)}
                      placeholder="v1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="rateLimit">Rate Limit (requests/minute)</Label>
                    <Input
                      id="rateLimit"
                      type="number"
                      value={config.configuration.rateLimit || ''}
                      onChange={(e) => updateConfiguration('rateLimit', parseInt(e.target.value))}
                      placeholder="60"
                    />
                  </div>
                </div>
              )}

              {config.type === 'webhook' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="url">Webhook URL *</Label>
                    <Input
                      id="url"
                      value={config.configuration.url || ''}
                      onChange={(e) => updateConfiguration('url', e.target.value)}
                      placeholder="https://your-domain.com/webhook"
                      className={validationErrors.url ? 'border-red-500' : ''}
                    />
                    {validationErrors.url && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.url}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="method">HTTP Method</Label>
                    <select
                      id="method"
                      value={config.configuration.method || 'POST'}
                      onChange={(e) => updateConfiguration('method', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="contentType">Content Type</Label>
                    <select
                      id="contentType"
                      value={config.configuration.contentType || 'application/json'}
                      onChange={(e) => updateConfiguration('contentType', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="application/json">application/json</option>
                      <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="retryEnabled"
                      checked={config.configuration.retryEnabled || false}
                      onChange={(e) => updateConfiguration('retryEnabled', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="retryEnabled">Enable retry on failure</Label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Authentication */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Authentication</h3>
                <p className="text-gray-600 mb-6">
                  Configure authentication credentials for {selectedChannelType?.name}.
                </p>
              </div>

              {config.type === 'whatsapp' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="accessToken">Access Token *</Label>
                    <Input
                      id="accessToken"
                      type="password"
                      value={config.authentication?.accessToken || ''}
                      onChange={(e) => updateAuthentication('accessToken', e.target.value)}
                      placeholder="Your WhatsApp Business API access token"
                      className={validationErrors.accessToken ? 'border-red-500' : ''}
                    />
                    {validationErrors.accessToken && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.accessToken}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="appSecret">App Secret</Label>
                    <Input
                      id="appSecret"
                      type="password"
                      value={config.authentication?.appSecret || ''}
                      onChange={(e) => updateAuthentication('appSecret', e.target.value)}
                      placeholder="Your WhatsApp app secret (optional)"
                    />
                  </div>
                </div>
              )}

              {config.type === 'slack' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="botToken">Bot Token *</Label>
                    <Input
                      id="botToken"
                      type="password"
                      value={config.authentication?.botToken || ''}
                      onChange={(e) => updateAuthentication('botToken', e.target.value)}
                      placeholder="xoxb-your-bot-token"
                      className={validationErrors.botToken ? 'border-red-500' : ''}
                    />
                    {validationErrors.botToken && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.botToken}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="signingSecret">Signing Secret</Label>
                    <Input
                      id="signingSecret"
                      type="password"
                      value={config.authentication?.signingSecret || ''}
                      onChange={(e) => updateAuthentication('signingSecret', e.target.value)}
                      placeholder="Your app's signing secret"
                    />
                  </div>
                </div>
              )}

              {config.type === 'api' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="authType">Authentication Type</Label>
                    <select
                      id="authType"
                      value={config.authentication?.type || 'bearer'}
                      onChange={(e) => updateAuthentication('type', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                      <option value="apikey">API Key</option>
                    </select>
                  </div>

                  {config.authentication?.type === 'bearer' && (
                    <div>
                      <Label htmlFor="token">Bearer Token</Label>
                      <Input
                        id="token"
                        type="password"
                        value={config.authentication?.token || ''}
                        onChange={(e) => updateAuthentication('token', e.target.value)}
                        placeholder="Your bearer token"
                      />
                    </div>
                  )}

                  {config.authentication?.type === 'basic' && (
                    <>
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={config.authentication?.username || ''}
                          onChange={(e) => updateAuthentication('username', e.target.value)}
                          placeholder="Username"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={config.authentication?.password || ''}
                          onChange={(e) => updateAuthentication('password', e.target.value)}
                          placeholder="Password"
                        />
                      </div>
                    </>
                  )}

                  {config.authentication?.type === 'apikey' && (
                    <>
                      <div>
                        <Label htmlFor="keyName">API Key Name</Label>
                        <Input
                          id="keyName"
                          value={config.authentication?.keyName || ''}
                          onChange={(e) => updateAuthentication('keyName', e.target.value)}
                          placeholder="X-API-Key"
                        />
                      </div>
                      <div>
                        <Label htmlFor="keyValue">API Key Value</Label>
                        <Input
                          id="keyValue"
                          type="password"
                          value={config.authentication?.keyValue || ''}
                          onChange={(e) => updateAuthentication('keyValue', e.target.value)}
                          placeholder="Your API key"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {config.type === 'webhook' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="secretKey">Secret Key</Label>
                    <Input
                      id="secretKey"
                      type="password"
                      value={config.authentication?.secretKey || ''}
                      onChange={(e) => updateAuthentication('secretKey', e.target.value)}
                      placeholder="Secret key for webhook verification"
                    />
                  </div>

                  <div>
                    <Label htmlFor="signatureHeader">Signature Header</Label>
                    <Input
                      id="signatureHeader"
                      value={config.authentication?.signatureHeader || ''}
                      onChange={(e) => updateAuthentication('signatureHeader', e.target.value)}
                      placeholder="X-Signature"
                    />
                  </div>
                </div>
              )}

              {config.type === 'webchat' && (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Web chat doesn't require additional authentication.
                    The widget will be secured through your domain configuration.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Test & Verify */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Test Connection</h3>
                <p className="text-gray-600 mb-6">
                  Test your {selectedChannelType?.name} configuration to ensure it's working correctly.
                </p>
              </div>

              <div className="text-center">
                <Button
                  onClick={handleTestConnection}
                  disabled={testing}
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

                {config.testResults && (
                  <div className={`p-4 rounded-lg border ${
                    config.testResults.status === 'success'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      {config.testResults.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className={`font-medium ${
                        config.testResults.status === 'success'
                          ? 'text-green-800'
                          : 'text-red-800'
                      }`}>
                        {config.testResults.status === 'success' ? 'Connection Successful' : 'Connection Failed'}
                      </span>
                    </div>
                    <p className={`text-sm ${
                      config.testResults.status === 'success'
                        ? 'text-green-700'
                        : 'text-red-700'
                    }`}>
                      {config.testResults.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Tested at {new Date(config.testResults.timestamp).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Review Configuration</h3>
                <p className="text-gray-600 mb-6">
                  Review your channel configuration before completing the setup.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Channel Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium capitalize">{config.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{config.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <Badge variant={config.enabled ? 'default' : 'secondary'}>
                        {config.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-600">Test Status:</span>
                      {config.testResults ? (
                        <Badge variant={config.testResults.status === 'success' ? 'default' : 'destructive'}>
                          {config.testResults.status === 'success' ? 'Passed' : 'Failed'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Tested</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Configuration Summary</h4>
                  <div className="text-sm space-y-1">
                    {Object.entries(config.configuration).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {config.testResults?.status !== 'success' && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium text-yellow-800">Warning</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      The connection test has not passed. You can still save the configuration,
                      but the channel may not work correctly until the issues are resolved.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex items-center space-x-2">
          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete}>
              <Check className="h-4 w-4 mr-2" />
              Complete Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelConfigurationWizard;