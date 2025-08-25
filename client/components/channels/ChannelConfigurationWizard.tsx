import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Smartphone, 
  Slack, 
  Globe, 
  Video,
  Phone,
  Settings,
  Check,
  AlertCircle,
  Copy,
  ExternalLink,
  TestTube,
  Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChannelConfig {
  id?: string;
  type: 'whatsapp' | 'slack' | 'webchat' | 'api' | 'webhook';
  name: string;
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
  agentId?: string;
  onComplete: (channels: ChannelConfig[]) => void;
  onBack: () => void;
  initialData?: {
    selectedChannels?: ChannelConfig[];
  };
}

const AVAILABLE_CHANNELS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Connect with customers via WhatsApp Business API',
    icon: <Smartphone className="w-6 h-6 text-green-500" />,
    features: ['Text Messages', 'Media Sharing', 'Quick Replies', 'Button Messages'],
    complexity: 'Medium',
    setupTime: '10-15 minutes'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Integrate with Slack workspaces for team communication',
    icon: <Slack className="w-6 h-6 text-purple-500" />,
    features: ['Direct Messages', 'Channel Integration', 'Slash Commands', 'Interactive Components'],
    complexity: 'Easy',
    setupTime: '5-10 minutes'
  },
  {
    id: 'webchat',
    name: 'Web Chat Widget',
    description: 'Embeddable chat widget for your website',
    icon: <MessageSquare className="w-6 h-6 text-blue-500" />,
    features: ['Customizable Design', 'Real-time Chat', 'File Sharing', 'Mobile Responsive'],
    complexity: 'Easy',
    setupTime: '2-5 minutes'
  },
  {
    id: 'api',
    name: 'REST API',
    description: 'Direct API integration for custom applications',
    icon: <Globe className="w-6 h-6 text-orange-500" />,
    features: ['Full Control', 'Custom Integration', 'Webhooks', 'Real-time Events'],
    complexity: 'Advanced',
    setupTime: '15-30 minutes'
  }
];

export default function ChannelConfigurationWizard({
  agentId,
  onComplete,
  onBack,
  initialData
}: ChannelConfigurationWizardProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [channelConfigs, setChannelConfigs] = useState<ChannelConfig[]>(
    initialData?.selectedChannels || []
  );
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [isTestingChannel, setIsTestingChannel] = useState<string | null>(null);

  // WhatsApp specific state
  const [whatsappConfig, setWhatsappConfig] = useState({
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    webhookVerifyToken: '',
    businessName: '',
    businessCategory: ''
  });

  // Slack specific state
  const [slackConfig, setSlackConfig] = useState({
    botToken: '',
    appToken: '',
    signingSecret: '',
    workspaceName: ''
  });

  // Web widget specific state
  const [webWidgetConfig, setWebWidgetConfig] = useState({
    theme: 'light' as 'light' | 'dark',
    primaryColor: '#3b82f6',
    position: 'bottom-right' as 'bottom-right' | 'bottom-left',
    greeting: 'Hi! How can I help you today?',
    showAgentAvatar: true,
    allowFileUpload: true
  });

  const queryClient = useQueryClient();

  // Test channel connection
  const testChannelMutation = useMutation({
    mutationFn: async ({ channelType, config }: { channelType: string; config: any }) => {
      const response = await fetch('/.netlify/functions/test-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelType, config })
      });
      
      if (!response.ok) {
        throw new Error('Test failed');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success(`${variables.channelType} connection successful!`);
      setIsTestingChannel(null);
    },
    onError: (error, variables) => {
      toast.error(`${variables.channelType} connection failed: ${error.message}`);
      setIsTestingChannel(null);
    }
  });

  const handleChannelSelection = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleTestChannel = (channelType: string) => {
    setIsTestingChannel(channelType);
    
    let config = {};
    switch (channelType) {
      case 'whatsapp':
        config = whatsappConfig;
        break;
      case 'slack':
        config = slackConfig;
        break;
      case 'webchat':
        config = webWidgetConfig;
        break;
    }
    
    testChannelMutation.mutate({ channelType, config });
  };

  const generateEmbedCode = () => {
    const agentIdToUse = agentId || 'demo-agent';
    return `<script>
  window.OjastackConfig = {
    agentId: "${agentIdToUse}",
    agentName: "Assistant",
    theme: "${webWidgetConfig.theme}",
    primaryColor: "${webWidgetConfig.primaryColor}",
    position: "${webWidgetConfig.position}",
    greeting: "${webWidgetConfig.greeting}",
    showAgentAvatar: ${webWidgetConfig.showAgentAvatar},
    allowFileUpload: ${webWidgetConfig.allowFileUpload}
  };
</script>
<script src="https://widget.ojastack.com/widget.js"></script>`;
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(generateEmbedCode());
    toast.success('Embed code copied to clipboard!');
  };

  const handleComplete = () => {
    const configs: ChannelConfig[] = [];
    
    selectedChannels.forEach(channelId => {
      let config: ChannelConfig;
      
      switch (channelId) {
        case 'whatsapp':
          config = {
            type: 'whatsapp',
            name: 'WhatsApp Business',
            enabled: true,
            configuration: whatsappConfig,
            authentication: {
              accessToken: whatsappConfig.accessToken,
              webhookVerifyToken: whatsappConfig.webhookVerifyToken
            }
          };
          break;
        case 'slack':
          config = {
            type: 'slack',
            name: 'Slack Integration',
            enabled: true,
            configuration: slackConfig,
            authentication: {
              botToken: slackConfig.botToken,
              appToken: slackConfig.appToken,
              signingSecret: slackConfig.signingSecret
            }
          };
          break;
        case 'webchat':
          config = {
            type: 'webchat',
            name: 'Web Chat Widget',
            enabled: true,
            configuration: webWidgetConfig
          };
          break;
        default:
          return;
      }
      
      configs.push(config);
    });
    
    onComplete(configs);
  };

  const canProceed = selectedChannels.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Channel Configuration</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Connect your agent to various communication channels where your customers can interact with it.
        </p>
      </div>

      {/* Channel Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select Channels</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AVAILABLE_CHANNELS.map((channel) => (
            <Card 
              key={channel.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md",
                selectedChannels.includes(channel.id) && "ring-2 ring-primary"
              )}
              onClick={() => handleChannelSelection(channel.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {channel.icon}
                    <div>
                      <CardTitle className="text-lg">{channel.name}</CardTitle>
                      <CardDescription>{channel.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{channel.complexity}</Badge>
                    {selectedChannels.includes(channel.id) && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Setup Time:</span>
                    <span className="font-medium">{channel.setupTime}</span>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {channel.features.map(feature => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Channel Configuration */}
      {selectedChannels.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Configure Selected Channels</h3>
          
          <Tabs value={activeChannel || selectedChannels[0]} onValueChange={setActiveChannel}>
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-4">
              {selectedChannels.map(channelId => {
                const channel = AVAILABLE_CHANNELS.find(c => c.id === channelId);
                return (
                  <TabsTrigger key={channelId} value={channelId} className="flex items-center gap-2">
                    {channel?.icon}
                    <span className="hidden sm:inline">{channel?.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* WhatsApp Configuration */}
            {selectedChannels.includes('whatsapp') && (
              <TabsContent value="whatsapp" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-green-500" />
                      WhatsApp Business Setup
                    </CardTitle>
                    <CardDescription>
                      Configure your WhatsApp Business API credentials to enable messaging.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Phone Number ID</Label>
                        <Input
                          placeholder="Enter your WhatsApp Phone Number ID"
                          value={whatsappConfig.phoneNumberId}
                          onChange={(e) => setWhatsappConfig(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Business Account ID</Label>
                        <Input
                          placeholder="Enter your Business Account ID"
                          value={whatsappConfig.businessAccountId}
                          onChange={(e) => setWhatsappConfig(prev => ({ ...prev, businessAccountId: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Access Token</Label>
                        <Input
                          type="password"
                          placeholder="Enter your WhatsApp Access Token"
                          value={whatsappConfig.accessToken}
                          onChange={(e) => setWhatsappConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Webhook Verify Token</Label>
                        <Input
                          placeholder="Enter webhook verify token"
                          value={whatsappConfig.webhookVerifyToken}
                          onChange={(e) => setWhatsappConfig(prev => ({ ...prev, webhookVerifyToken: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        You'll need to configure the webhook URL in your Meta Developer Console: 
                        <code className="ml-1 bg-gray-100 px-1 rounded">
                          https://yourapp.com/.netlify/functions/whatsapp-webhook
                        </code>
                      </AlertDescription>
                    </Alert>

                    <Button 
                      onClick={() => handleTestChannel('whatsapp')}
                      disabled={isTestingChannel === 'whatsapp' || !whatsappConfig.phoneNumberId}
                    >
                      {isTestingChannel === 'whatsapp' ? 'Testing...' : 'Test Connection'}
                      <TestTube className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Slack Configuration */}
            {selectedChannels.includes('slack') && (
              <TabsContent value="slack" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Slack className="w-5 h-5 text-purple-500" />
                      Slack Integration Setup
                    </CardTitle>
                    <CardDescription>
                      Connect your Slack workspace to enable team communication.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bot Token</Label>
                        <Input
                          type="password"
                          placeholder="xoxb-your-bot-token"
                          value={slackConfig.botToken}
                          onChange={(e) => setSlackConfig(prev => ({ ...prev, botToken: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>App Token</Label>
                        <Input
                          type="password"
                          placeholder="xapp-your-app-token"
                          value={slackConfig.appToken}
                          onChange={(e) => setSlackConfig(prev => ({ ...prev, appToken: e.target.value }))}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleTestChannel('slack')}
                      disabled={isTestingChannel === 'slack' || !slackConfig.botToken}
                    >
                      {isTestingChannel === 'slack' ? 'Testing...' : 'Test Connection'}
                      <TestTube className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Web Widget Configuration */}
            {selectedChannels.includes('webchat') && (
              <TabsContent value="webchat" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                      Web Chat Widget Setup
                    </CardTitle>
                    <CardDescription>
                      Customize your website chat widget appearance and behavior.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Theme</Label>
                          <Select 
                            value={webWidgetConfig.theme} 
                            onValueChange={(value: any) => setWebWidgetConfig(prev => ({ ...prev, theme: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Primary Color</Label>
                          <Input
                            type="color"
                            value={webWidgetConfig.primaryColor}
                            onChange={(e) => setWebWidgetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Position</Label>
                          <Select 
                            value={webWidgetConfig.position} 
                            onValueChange={(value: any) => setWebWidgetConfig(prev => ({ ...prev, position: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bottom-right">Bottom Right</SelectItem>
                              <SelectItem value="bottom-left">Bottom Left</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Greeting Message</Label>
                          <Input
                            placeholder="Hi! How can I help you today?"
                            value={webWidgetConfig.greeting}
                            onChange={(e) => setWebWidgetConfig(prev => ({ ...prev, greeting: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Show Agent Avatar</Label>
                          <Switch
                            checked={webWidgetConfig.showAgentAvatar}
                            onCheckedChange={(checked) => setWebWidgetConfig(prev => ({ ...prev, showAgentAvatar: checked }))}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label>Allow File Upload</Label>
                          <Switch
                            checked={webWidgetConfig.allowFileUpload}
                            onCheckedChange={(checked) => setWebWidgetConfig(prev => ({ ...prev, allowFileUpload: checked }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Embed Code</Label>
                          <div className="relative">
                            <ScrollArea className="h-32 w-full border rounded-md p-3 text-xs font-mono bg-gray-50">
                              <pre>{generateEmbedCode()}</pre>
                            </ScrollArea>
                            <Button 
                              size="sm" 
                              className="absolute top-2 right-2"
                              onClick={copyEmbedCode}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={handleComplete}
          disabled={!canProceed}
        >
          Continue to Testing
        </Button>
      </div>
    </div>
  );
}