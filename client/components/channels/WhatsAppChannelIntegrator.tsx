/**
 * WhatsApp Channel Integrator
 * Specialized component for WhatsApp Business API integration
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
  Phone, 
  Key, 
  Webhook, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink,
  Copy,
  RefreshCw
} from 'lucide-react';
import { WhatsAppCredentialManager } from '../whatsapp/WhatsAppCredentialManager';
import { useAuth } from '../../hooks/useAuth';

interface WhatsAppConfig {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  appSecret?: string;
  webhookUrl: string;
  verifyToken: string;
  displayPhoneNumber?: string;
  status?: 'connected' | 'disconnected' | 'error';
  lastVerified?: string;
}

interface WhatsAppChannelIntegratorProps {
  onConfigChange: (config: WhatsAppConfig) => void;
  initialConfig?: WhatsAppConfig;
  className?: string;
}

export const WhatsAppChannelIntegrator: React.FC<WhatsAppChannelIntegratorProps> = ({
  onConfigChange,
  initialConfig,
  className = ''
}) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<WhatsAppConfig>(
    initialConfig || {
      phoneNumberId: '',
      businessAccountId: '',
      accessToken: '',
      webhookUrl: '',
      verifyToken: ''
    }
  );
  const [testing, setTesting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  const validateConfig = (): boolean => {
    const errors: Record<string, string> = {};

    if (!config.phoneNumberId.trim()) {
      errors.phoneNumberId = 'Phone Number ID is required';
    }

    if (!config.businessAccountId.trim()) {
      errors.businessAccountId = 'Business Account ID is required';
    }

    if (!config.accessToken.trim()) {
      errors.accessToken = 'Access Token is required';
    }

    if (!config.webhookUrl.trim()) {
      errors.webhookUrl = 'Webhook URL is required';
    } else if (!isValidUrl(config.webhookUrl)) {
      errors.webhookUrl = 'Please enter a valid URL';
    }

    if (!config.verifyToken.trim()) {
      errors.verifyToken = 'Verify Token is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const testConnection = async () => {
    if (!validateConfig()) return;

    setTesting(true);
    try {
      // Test WhatsApp Business API connection
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({
          ...prev,
          displayPhoneNumber: data.display_phone_number,
          status: 'connected',
          lastVerified: new Date().toISOString()
        }));
      } else {
        const error = await response.json();
        setConfig(prev => ({
          ...prev,
          status: 'error'
        }));
        throw new Error(error.error?.message || 'Connection failed');
      }
    } catch (error) {
      console.error('WhatsApp connection test failed:', error);
      setConfig(prev => ({
        ...prev,
        status: 'error'
      }));
    } finally {
      setTesting(false);
    }
  };

  const generateWebhookUrl = () => {
    if (user) {
      const baseUrl = window.location.origin;
      const webhookUrl = `${baseUrl}/api/webhooks/whatsapp/${user.id}`;
      setConfig(prev => ({ ...prev, webhookUrl }));
    }
  };

  const generateVerifyToken = () => {
    const token = crypto.randomUUID();
    setConfig(prev => ({ ...prev, verifyToken: token }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const updateConfig = (key: keyof WhatsAppConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setValidationErrors(prev => ({ ...prev, [key]: undefined }));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <MessageSquare className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">WhatsApp Business Integration</h3>
          <p className="text-gray-600">Connect your WhatsApp Business account</p>
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
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>API Credentials</span>
              </CardTitle>
              <CardDescription>
                Enter your WhatsApp Business API credentials from Meta for Developers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                <Input
                  id="phoneNumberId"
                  value={config.phoneNumberId}
                  onChange={(e) => updateConfig('phoneNumberId', e.target.value)}
                  placeholder="Enter your WhatsApp Business phone number ID"
                  className={validationErrors.phoneNumberId ? 'border-red-500' : ''}
                />
                {validationErrors.phoneNumberId && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.phoneNumberId}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Found in your WhatsApp Business Account dashboard
                </p>
              </div>

              <div>
                <Label htmlFor="businessAccountId">Business Account ID *</Label>
                <Input
                  id="businessAccountId"
                  value={config.businessAccountId}
                  onChange={(e) => updateConfig('businessAccountId', e.target.value)}
                  placeholder="Enter your WhatsApp Business Account ID"
                  className={validationErrors.businessAccountId ? 'border-red-500' : ''}
                />
                {validationErrors.businessAccountId && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.businessAccountId}</p>
                )}
              </div>

              <div>
                <Label htmlFor="accessToken">Access Token *</Label>
                <Input
                  id="accessToken"
                  type="password"
                  value={config.accessToken}
                  onChange={(e) => updateConfig('accessToken', e.target.value)}
                  placeholder="Enter your permanent access token"
                  className={validationErrors.accessToken ? 'border-red-500' : ''}
                />
                {validationErrors.accessToken && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.accessToken}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Generate a permanent access token in your Meta app settings
                </p>
              </div>

              <div>
                <Label htmlFor="appSecret">App Secret (Optional)</Label>
                <Input
                  id="appSecret"
                  type="password"
                  value={config.appSecret || ''}
                  onChange={(e) => updateConfig('appSecret', e.target.value)}
                  placeholder="Enter your app secret for enhanced security"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used for webhook signature verification (recommended)
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <ExternalLink className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800">Need help finding these credentials?</p>
                    <p className="text-blue-700 mt-1">
                      Visit the{' '}
                      <a 
                        href="https://developers.facebook.com/apps" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:no-underline"
                      >
                        Meta for Developers console
                      </a>
                      {' '}to set up your WhatsApp Business API.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhook" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Webhook className="h-5 w-5" />
                <span>Webhook Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure webhook settings to receive WhatsApp messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="webhookUrl">Webhook URL *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="webhookUrl"
                    value={config.webhookUrl}
                    onChange={(e) => updateConfig('webhookUrl', e.target.value)}
                    placeholder="https://your-domain.com/webhook/whatsapp"
                    className={validationErrors.webhookUrl ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateWebhookUrl}
                    className="shrink-0"
                  >
                    Generate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(config.webhookUrl)}
                    disabled={!config.webhookUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {validationErrors.webhookUrl && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.webhookUrl}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  This URL will receive WhatsApp webhook events
                </p>
              </div>

              <div>
                <Label htmlFor="verifyToken">Verify Token *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="verifyToken"
                    value={config.verifyToken}
                    onChange={(e) => updateConfig('verifyToken', e.target.value)}
                    placeholder="Enter a secure verify token"
                    className={validationErrors.verifyToken ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateVerifyToken}
                    className="shrink-0"
                  >
                    Generate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(config.verifyToken)}
                    disabled={!config.verifyToken}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {validationErrors.verifyToken && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.verifyToken}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Used by WhatsApp to verify your webhook endpoint
                </p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Webhook Setup Instructions</p>
                    <ol className="text-yellow-700 mt-1 space-y-1 list-decimal list-inside">
                      <li>Copy the webhook URL and verify token above</li>
                      <li>Go to your WhatsApp Business App in Meta for Developers</li>
                      <li>Navigate to WhatsApp → Configuration</li>
                      <li>Add the webhook URL and verify token</li>
                      <li>Subscribe to 'messages' webhook field</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Additional Settings</CardTitle>
              <CardDescription>
                Configure additional WhatsApp integration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.displayPhoneNumber && (
                <div>
                  <Label>Display Phone Number</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{config.displayPhoneNumber}</span>
                    <Badge variant="outline">Verified</Badge>
                  </div>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Supported Message Types</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Text messages</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Images</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Documents</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Audio</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Video</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Templates</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-800">WhatsApp Business Benefits</p>
                    <ul className="text-green-700 mt-1 space-y-1">
                      <li>• Rich media support (images, videos, documents)</li>
                      <li>• Message templates for notifications</li>
                      <li>• Read receipts and delivery status</li>
                      <li>• Business profile integration</li>
                      <li>• Global reach with local phone numbers</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connection Test</CardTitle>
              <CardDescription>
                Test your WhatsApp Business API connection
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
                      Test WhatsApp Connection
                    </>
                  )}
                </Button>

                {config.status && (
                  <div className={`p-4 rounded-lg border ${
                    config.status === 'connected'
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
                      <span className={`font-medium ${
                        config.status === 'connected'
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
                    
                    {config.status === 'connected' && config.displayPhoneNumber && (
                      <p className="text-sm text-green-700">
                        Successfully connected to WhatsApp Business number: {config.displayPhoneNumber}
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

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Phone Number ID</span>
                  <span className={config.phoneNumberId ? 'text-green-600' : 'text-red-600'}>
                    {config.phoneNumberId ? '✓ Configured' : '✗ Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Business Account ID</span>
                  <span className={config.businessAccountId ? 'text-green-600' : 'text-red-600'}>
                    {config.businessAccountId ? '✓ Configured' : '✗ Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Access Token</span>
                  <span className={config.accessToken ? 'text-green-600' : 'text-red-600'}>
                    {config.accessToken ? '✓ Configured' : '✗ Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Webhook URL</span>
                  <span className={config.webhookUrl ? 'text-green-600' : 'text-red-600'}>
                    {config.webhookUrl ? '✓ Configured' : '✗ Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Verify Token</span>
                  <span className={config.verifyToken ? 'text-green-600' : 'text-red-600'}>
                    {config.verifyToken ? '✓ Configured' : '✗ Missing'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppChannelIntegrator;