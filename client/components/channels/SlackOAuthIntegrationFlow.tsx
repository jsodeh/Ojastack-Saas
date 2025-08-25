import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Slack, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Users,
  Hash,
  Settings,
  Shield,
  Zap,
  MessageSquare,
  Bot,
  Copy,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SlackWorkspace {
  id: string;
  name: string;
  domain: string;
  icon?: string;
  url: string;
}

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  memberCount: number;
  purpose?: string;
}

interface SlackIntegrationConfig {
  workspaceId: string;
  workspaceName: string;
  botToken: string;
  appToken: string;
  signingSecret: string;
  clientId: string;
  clientSecret: string;
  selectedChannels: string[];
  botUserId: string;
  teamId: string;
  permissions: string[];
  features: {
    directMessages: boolean;
    channelMessages: boolean;
    slashCommands: boolean;
    interactiveComponents: boolean;
    eventSubscriptions: boolean;
  };
}

interface SlackOAuthIntegrationFlowProps {
  onComplete: (config: SlackIntegrationConfig) => void;
  onCancel: () => void;
  initialConfig?: Partial<SlackIntegrationConfig>;
}

const REQUIRED_SCOPES = [
  'channels:read',
  'channels:history',
  'chat:write',
  'chat:write.public',
  'im:read',
  'im:history',
  'users:read',
  'commands'
];

const INTEGRATION_STEPS = [
  { id: 'oauth', title: 'OAuth Setup', description: 'Connect to Slack workspace' },
  { id: 'permissions', title: 'Permissions', description: 'Configure bot permissions' },
  { id: 'channels', title: 'Channel Selection', description: 'Choose channels for integration' },
  { id: 'features', title: 'Features', description: 'Enable integration features' },
  { id: 'testing', title: 'Testing', description: 'Test the integration' }
];

export default function SlackOAuthIntegrationFlow({
  onComplete,
  onCancel,
  initialConfig
}: SlackOAuthIntegrationFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [config, setConfig] = useState<SlackIntegrationConfig>({
    workspaceId: initialConfig?.workspaceId || '',
    workspaceName: initialConfig?.workspaceName || '',
    botToken: initialConfig?.botToken || '',
    appToken: initialConfig?.appToken || '',
    signingSecret: initialConfig?.signingSecret || '',
    clientId: initialConfig?.clientId || '',
    clientSecret: initialConfig?.clientSecret || '',
    selectedChannels: initialConfig?.selectedChannels || [],
    botUserId: initialConfig?.botUserId || '',
    teamId: initialConfig?.teamId || '',
    permissions: initialConfig?.permissions || [],
    features: {
      directMessages: initialConfig?.features?.directMessages ?? true,
      channelMessages: initialConfig?.features?.channelMessages ?? true,
      slashCommands: initialConfig?.features?.slashCommands ?? true,
      interactiveComponents: initialConfig?.features?.interactiveComponents ?? false,
      eventSubscriptions: initialConfig?.features?.eventSubscriptions ?? true
    }
  });

  // Fetch workspace info
  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ['slack-workspace', config.botToken],
    queryFn: async (): Promise<SlackWorkspace | null> => {
      if (!config.botToken) return null;
      
      const response = await fetch('/.netlify/functions/slack-workspace-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: config.botToken })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return {
        id: data.team_id,
        name: data.name,
        domain: data.domain,
        icon: data.icon?.image_68,
        url: data.url
      };
    },
    enabled: !!config.botToken
  });

  // Fetch available channels
  const { data: channels } = useQuery({
    queryKey: ['slack-channels', config.botToken],
    queryFn: async (): Promise<SlackChannel[]> => {
      if (!config.botToken) return [];
      
      const response = await fetch('/.netlify/functions/slack-channels-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: config.botToken })
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.channels?.map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private,
        memberCount: channel.num_members,
        purpose: channel.purpose?.value
      })) || [];
    },
    enabled: !!config.botToken && isConnected
  });

  // Generate OAuth URL
  const generateOAuthURL = () => {
    const params = new URLSearchParams({
      client_id: config.clientId,
      scope: REQUIRED_SCOPES.join(','),
      redirect_uri: `${window.location.origin}/integrations/slack/callback`,
      state: Math.random().toString(36).substring(7)
    });
    
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  };

  // Handle OAuth callback
  const handleOAuthCallback = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch('/.netlify/functions/slack-oauth-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri: `${window.location.origin}/integrations/slack/callback`
        })
      });
      
      if (!response.ok) {
        throw new Error('OAuth callback failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setConfig(prev => ({
        ...prev,
        botToken: data.access_token,
        teamId: data.team.id,
        workspaceName: data.team.name,
        workspaceId: data.team.id,
        botUserId: data.bot_user_id,
        permissions: data.scope.split(',')
      }));
      setIsConnected(true);
      toast.success('Successfully connected to Slack workspace');
      setCurrentStep(1);
    },
    onError: (error) => {
      toast.error('OAuth connection failed: ' + error.message);
    }
  });

  // Test integration
  const testIntegrationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/.netlify/functions/slack-test-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: config.botToken,
          channels: config.selectedChannels,
          features: config.features
        })
      });
      
      if (!response.ok) {
        throw new Error('Integration test failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success('Integration test successful');
    },
    onError: (error) => {
      toast.error('Integration test failed: ' + error.message);
    }
  });

  const handleChannelToggle = (channelId: string) => {
    setConfig(prev => ({
      ...prev,
      selectedChannels: prev.selectedChannels.includes(channelId)
        ? prev.selectedChannels.filter(id => id !== channelId)
        : [...prev.selectedChannels, channelId]
    }));
  };

  const handleFeatureToggle = (feature: keyof SlackIntegrationConfig['features']) => {
    setConfig(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature]
      }
    }));
  };

  const handleManualTokenSetup = () => {
    if (config.botToken && config.appToken) {
      setIsConnected(true);
      setCurrentStep(1);
    }
  };

  const canProceedToNextStep = (step: number) => {
    switch (step) {
      case 0: return isConnected && config.botToken;
      case 1: return config.permissions.length > 0;
      case 2: return config.selectedChannels.length > 0;
      case 3: return Object.values(config.features).some(Boolean);
      default: return true;
    }
  };

  useEffect(() => {
    // Listen for OAuth callback
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'SLACK_OAUTH_SUCCESS') {
        handleOAuthCallback.mutate(event.data.code);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Slack className="w-8 h-8 text-purple-500" />
          Slack Integration Setup
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Connect your Slack workspace to enable team communication and agent integration.
        </p>
      </div>

      {/* Steps Navigation */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        {INTEGRATION_STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
              index === currentStep ? "bg-primary text-primary-foreground" :
              index < currentStep ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"
            )}>
              {index < currentStep ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <span className="w-4 h-4 text-center text-xs font-bold">{index + 1}</span>
              )}
              <span className="text-sm font-medium">{step.title}</span>
            </div>
            {index < INTEGRATION_STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      <Tabs value={INTEGRATION_STEPS[currentStep]?.id} className="w-full">
        {/* OAuth Setup */}
        <TabsContent value="oauth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Connect to Slack Workspace
              </CardTitle>
              <CardDescription>
                Choose how you want to connect your Slack workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="oauth" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="oauth">OAuth Connection</TabsTrigger>
                  <TabsTrigger value="manual">Manual Setup</TabsTrigger>
                </TabsList>

                <TabsContent value="oauth" className="space-y-4">
                  <div className="text-center space-y-4 py-8">
                    {!isConnected ? (
                      <>
                        <Slack className="w-16 h-16 mx-auto text-purple-500" />
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Connect Your Workspace</h3>
                          <p className="text-muted-foreground mb-4">
                            Authorize access to your Slack workspace to enable integration
                          </p>
                          <Button 
                            onClick={() => window.open(generateOAuthURL(), 'slack-oauth', 'width=600,height=600')}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Slack className="w-4 h-4 mr-2" />
                            Connect to Slack
                          </Button>
                        </div>
                      </>
                    ) : workspace ? (
                      <div className="space-y-4">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                        <div>
                          <h3 className="text-lg font-semibold text-green-600">Connected Successfully!</h3>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={workspace.icon} />
                              <AvatarFallback>{workspace.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{workspace.name}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-muted-foreground">Connecting to workspace...</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Bot Token *</Label>
                      <Input
                        type="password"
                        placeholder="xoxb-your-bot-token"
                        value={config.botToken}
                        onChange={(e) => setConfig(prev => ({ ...prev, botToken: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>App Token</Label>
                      <Input
                        type="password"
                        placeholder="xapp-your-app-token"
                        value={config.appToken}
                        onChange={(e) => setConfig(prev => ({ ...prev, appToken: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Signing Secret</Label>
                      <Input
                        type="password"
                        placeholder="Your app signing secret"
                        value={config.signingSecret}
                        onChange={(e) => setConfig(prev => ({ ...prev, signingSecret: e.target.value }))}
                      />
                    </div>

                    <Button onClick={handleManualTokenSetup} className="w-full">
                      Connect with Tokens
                    </Button>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        You can find these tokens in your Slack app settings at{' '}
                        <a href="https://api.slack.com/apps" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                          api.slack.com/apps
                        </a>
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions */}
        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Bot Permissions
              </CardTitle>
              <CardDescription>
                Review and configure the permissions granted to your bot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REQUIRED_SCOPES.map((scope) => (
                  <div key={scope} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{scope}</p>
                      <p className="text-sm text-muted-foreground">
                        {getScopeDescription(scope)}
                      </p>
                    </div>
                    <Badge variant={config.permissions.includes(scope) ? "default" : "secondary"}>
                      {config.permissions.includes(scope) ? "Granted" : "Required"}
                    </Badge>
                  </div>
                ))}
              </div>

              {config.permissions.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No permissions detected. Please ensure your bot token has the required scopes.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channel Selection */}
        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Channel Configuration
              </CardTitle>
              <CardDescription>
                Select channels where the bot will be active
              </CardDescription>
            </CardHeader>
            <CardContent>
              {channels && channels.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {channels.map((channel) => (
                      <div
                        key={channel.id}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-colors",
                          config.selectedChannels.includes(channel.id)
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => handleChannelToggle(channel.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{channel.name}</span>
                            {channel.isPrivate && (
                              <Badge variant="secondary" className="text-xs">Private</Badge>
                            )}
                          </div>
                          {config.selectedChannels.includes(channel.id) && (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          <p>{channel.memberCount} members</p>
                          {channel.purpose && (
                            <p className="mt-1 line-clamp-2">{channel.purpose}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-center text-sm text-muted-foreground">
                    {config.selectedChannels.length} of {channels.length} channels selected
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Hash className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No channels found</h3>
                  <p className="text-muted-foreground">
                    Make sure your bot has access to channels in the workspace.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Integration Features
              </CardTitle>
              <CardDescription>
                Configure which features to enable for your Slack integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <FeatureToggle
                  title="Direct Messages"
                  description="Handle direct messages to the bot"
                  icon={<MessageSquare className="w-4 h-4" />}
                  enabled={config.features.directMessages}
                  onChange={() => handleFeatureToggle('directMessages')}
                />
                
                <FeatureToggle
                  title="Channel Messages"
                  description="Respond to mentions in channels"
                  icon={<Hash className="w-4 h-4" />}
                  enabled={config.features.channelMessages}
                  onChange={() => handleFeatureToggle('channelMessages')}
                />
                
                <FeatureToggle
                  title="Slash Commands"
                  description="Enable custom slash commands"
                  icon={<Bot className="w-4 h-4" />}
                  enabled={config.features.slashCommands}
                  onChange={() => handleFeatureToggle('slashCommands')}
                />
                
                <FeatureToggle
                  title="Interactive Components"
                  description="Support buttons and interactive elements"
                  icon={<Settings className="w-4 h-4" />}
                  enabled={config.features.interactiveComponents}
                  onChange={() => handleFeatureToggle('interactiveComponents')}
                />
                
                <FeatureToggle
                  title="Event Subscriptions"
                  description="Receive real-time events from Slack"
                  icon={<Zap className="w-4 h-4" />}
                  enabled={config.features.eventSubscriptions}
                  onChange={() => handleFeatureToggle('eventSubscriptions')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing */}
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Test Integration
              </CardTitle>
              <CardDescription>
                Verify that your Slack integration is working correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4 py-8">
                <Button 
                  onClick={() => testIntegrationMutation.mutate()}
                  disabled={testIntegrationMutation.isPending}
                  size="lg"
                >
                  {testIntegrationMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Testing Integration...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Test Slack Integration
                    </>
                  )}
                </Button>
                
                <p className="text-sm text-muted-foreground">
                  This will send a test message to verify the connection
                </p>
              </div>

              {testIntegrationMutation.isSuccess && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Integration test successful! Your Slack bot is ready to use.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
              Previous
            </Button>
          )}
          {currentStep < INTEGRATION_STEPS.length - 1 ? (
            <Button 
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceedToNextStep(currentStep)}
            >
              Continue
            </Button>
          ) : (
            <Button onClick={() => onComplete(config)}>
              Complete Integration
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const FeatureToggle = ({ 
  title, 
  description, 
  icon, 
  enabled, 
  onChange 
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onChange: () => void;
}) => (
  <div 
    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
    onClick={onChange}
  >
    <div className="flex items-center space-x-3">
      <div className={cn(
        "p-2 rounded-lg",
        enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        {icon}
      </div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
    <div className={cn(
      "w-12 h-6 rounded-full border-2 transition-colors",
      enabled ? "bg-primary border-primary" : "bg-muted border-muted-foreground"
    )}>
      <div className={cn(
        "w-4 h-4 rounded-full bg-white transition-transform",
        enabled ? "translate-x-6" : "translate-x-0"
      )} />
    </div>
  </div>
);

const getScopeDescription = (scope: string): string => {
  const descriptions: Record<string, string> = {
    'channels:read': 'View public channel information',
    'channels:history': 'Read messages in public channels',
    'chat:write': 'Send messages as the bot',
    'chat:write.public': 'Send messages to public channels',
    'im:read': 'View direct message information',
    'im:history': 'Read direct messages',
    'users:read': 'View user information',
    'commands': 'Add and use slash commands'
  };
  
  return descriptions[scope] || 'Permission for bot functionality';
};