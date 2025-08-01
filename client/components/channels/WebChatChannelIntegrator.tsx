/**
 * WebChat Channel Integrator
 * Specialized component for web chat widget integration
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
  Globe, 
  Palette, 
  Code, 
  Eye, 
  Copy,
  Download,
  Settings,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface WebChatConfig {
  widgetTitle: string;
  welcomeMessage: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  showAvatar: boolean;
  avatarUrl?: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size: 'small' | 'medium' | 'large';
  allowFileUpload: boolean;
  showTypingIndicator: boolean;
  enableEmojis: boolean;
  customCSS?: string;
  domains: string[];
}

interface WebChatChannelIntegratorProps {
  onConfigChange: (config: WebChatConfig) => void;
  initialConfig?: WebChatConfig;
  className?: string;
}

export const WebChatChannelIntegrator: React.FC<WebChatChannelIntegratorProps> = ({
  onConfigChange,
  initialConfig,
  className = ''
}) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<WebChatConfig>(
    initialConfig || {
      widgetTitle: 'Chat with us',
      welcomeMessage: 'Hello! How can I help you today?',
      primaryColor: '#3B82F6',
      secondaryColor: '#EFF6FF',
      textColor: '#1F2937',
      backgroundColor: '#FFFFFF',
      showAvatar: true,
      position: 'bottom-right',
      size: 'medium',
      allowFileUpload: true,
      showTypingIndicator: true,
      enableEmojis: true,
      domains: []
    }
  );
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  const updateConfig = (key: keyof WebChatConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const generateEmbedCode = () => {
    const widgetId = user?.id || 'demo';
    return `<!-- Ojastack Web Chat Widget -->
<script>
  window.OjastackChat = {
    widgetId: '${widgetId}',
    config: ${JSON.stringify(config, null, 2)}
  };
</script>
<script src="${window.location.origin}/widget/chat.js" async></script>`;
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(generateEmbedCode());
  };

  const downloadWidget = () => {
    const code = generateEmbedCode();
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ojastack-chat-widget.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const addDomain = () => {
    const domain = prompt('Enter domain (e.g., example.com):');
    if (domain && !config.domains.includes(domain)) {
      updateConfig('domains', [...config.domains, domain]);
    }
  };

  const removeDomain = (domain: string) => {
    updateConfig('domains', config.domains.filter(d => d !== domain));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Globe className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Web Chat Widget</h3>
          <p className="text-gray-600">Embeddable chat widget for your website</p>
        </div>
        <Badge variant="default" className="ml-auto">
          Ready to Deploy
        </Badge>
      </div>

      <Tabs defaultValue="appearance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="embed">Embed Code</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Palette className="h-5 w-5" />
                    <span>Widget Appearance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="widgetTitle">Widget Title</Label>
                    <Input
                      id="widgetTitle"
                      value={config.widgetTitle}
                      onChange={(e) => updateConfig('widgetTitle', e.target.value)}
                      placeholder="Chat with us"
                    />
                  </div>

                  <div>
                    <Label htmlFor="welcomeMessage">Welcome Message</Label>
                    <Textarea
                      id="welcomeMessage"
                      value={config.welcomeMessage}
                      onChange={(e) => updateConfig('welcomeMessage', e.target.value)}
                      placeholder="Hello! How can I help you today?"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => updateConfig('primaryColor', e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={config.primaryColor}
                          onChange={(e) => updateConfig('primaryColor', e.target.value)}
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="secondaryColor">Secondary Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="secondaryColor"
                          type="color"
                          value={config.secondaryColor}
                          onChange={(e) => updateConfig('secondaryColor', e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={config.secondaryColor}
                          onChange={(e) => updateConfig('secondaryColor', e.target.value)}
                          placeholder="#EFF6FF"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="position">Widget Position</Label>
                    <select
                      id="position"
                      value={config.position}
                      onChange={(e) => updateConfig('position', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="size">Widget Size</Label>
                    <select
                      id="size"
                      value={config.size}
                      onChange={(e) => updateConfig('size', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="showAvatar"
                      checked={config.showAvatar}
                      onChange={(e) => updateConfig('showAvatar', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="showAvatar">Show avatar</Label>
                  </div>

                  {config.showAvatar && (
                    <div>
                      <Label htmlFor="avatarUrl">Avatar URL (Optional)</Label>
                      <Input
                        id="avatarUrl"
                        value={config.avatarUrl || ''}
                        onChange={(e) => updateConfig('avatarUrl', e.target.value)}
                        placeholder="https://example.com/avatar.png"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-5 w-5" />
                    <span>Live Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative bg-gray-100 rounded-lg p-4 h-96 overflow-hidden">
                    {/* Mock website background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 opacity-50" />
                    
                    {/* Chat widget preview */}
                    <div 
                      className={`absolute ${
                        config.position === 'bottom-right' ? 'bottom-4 right-4' :
                        config.position === 'bottom-left' ? 'bottom-4 left-4' :
                        config.position === 'top-right' ? 'top-4 right-4' :
                        'top-4 left-4'
                      }`}
                    >
                      <div 
                        className={`bg-white rounded-lg shadow-lg border ${
                          config.size === 'small' ? 'w-64 h-80' :
                          config.size === 'medium' ? 'w-80 h-96' :
                          'w-96 h-[28rem]'
                        }`}
                      >
                        {/* Header */}
                        <div 
                          className="p-3 rounded-t-lg text-white flex items-center space-x-2"
                          style={{ backgroundColor: config.primaryColor }}
                        >
                          {config.showAvatar && (
                            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                              <MessageSquare className="h-4 w-4" />
                            </div>
                          )}
                          <span className="font-medium text-sm">{config.widgetTitle}</span>
                        </div>
                        
                        {/* Messages */}
                        <div className="p-3 space-y-2 flex-1">
                          <div className="flex items-start space-x-2">
                            {config.showAvatar && (
                              <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />
                            )}
                            <div 
                              className="p-2 rounded-lg text-sm max-w-xs"
                              style={{ 
                                backgroundColor: config.secondaryColor,
                                color: config.textColor 
                              }}
                            >
                              {config.welcomeMessage}
                            </div>
                          </div>
                        </div>
                        
                        {/* Input */}
                        <div className="p-3 border-t">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="text" 
                              placeholder="Type a message..."
                              className="flex-1 p-2 border rounded-lg text-sm"
                              disabled
                            />
                            <button 
                              className="p-2 rounded-lg text-white"
                              style={{ backgroundColor: config.primaryColor }}
                              disabled
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Widget Behavior</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowFileUpload"
                    checked={config.allowFileUpload}
                    onChange={(e) => updateConfig('allowFileUpload', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="allowFileUpload">Allow file uploads</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showTypingIndicator"
                    checked={config.showTypingIndicator}
                    onChange={(e) => updateConfig('showTypingIndicator', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="showTypingIndicator">Show typing indicator</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableEmojis"
                    checked={config.enableEmojis}
                    onChange={(e) => updateConfig('enableEmojis', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="enableEmojis">Enable emoji picker</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="customCSS">Custom CSS (Optional)</Label>
                <Textarea
                  id="customCSS"
                  value={config.customCSS || ''}
                  onChange={(e) => updateConfig('customCSS', e.target.value)}
                  placeholder="/* Add custom CSS styles here */"
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add custom CSS to further customize the widget appearance
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain Security</CardTitle>
              <CardDescription>
                Restrict widget usage to specific domains
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Allowed Domains</Label>
                  <Button variant="outline" size="sm" onClick={addDomain}>
                    Add Domain
                  </Button>
                </div>
                
                {config.domains.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-gray-600 text-sm">
                      No domain restrictions. Widget can be used on any domain.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {config.domains.map((domain, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-mono">{domain}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDomain(domain)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Security Note:</strong> Domain restrictions help prevent unauthorized use of your chat widget. 
                  Leave empty to allow usage on any domain.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="h-5 w-5" />
                <span>Embed Code</span>
              </CardTitle>
              <CardDescription>
                Copy this code and paste it into your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>HTML Embed Code</Label>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{generateEmbedCode()}</code>
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyEmbedCode}
                    className="absolute top-2 right-2"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button onClick={copyEmbedCode}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button variant="outline" onClick={downloadWidget}>
                  <Download className="h-4 w-4 mr-2" />
                  Download HTML File
                </Button>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Installation Instructions</h4>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Copy the embed code above</li>
                  <li>Paste it before the closing &lt;/body&gt; tag in your HTML</li>
                  <li>The widget will automatically appear on your website</li>
                  <li>Customize the appearance using the settings above</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WebChatChannelIntegrator;