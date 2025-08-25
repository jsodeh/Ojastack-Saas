import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Globe, 
  Phone, 
  Slack, 
  Mail,
  Webhook,
  Copy,
  CheckCircle,
  AlertTriangle,
  Settings,
  Plus,
  ExternalLink
} from 'lucide-react';

import { useAgentCreation } from '../AgentCreationContext';
import { StepProps } from '../AgentCreationWizard';
import { useToast } from '@/hooks/use-toast';
import { 
  WhatsAppSetupWizard, 
  SlackSetupWizard, 
  WebWidgetSetupWizard 
} from '@/components/channel-setup/ChannelSetupWizards';

interface ChannelConfiguration {
  id: string;
  type: 'webchat' | 'whatsapp' | 'slack' | 'email' | 'webhook';
  name: string;
  enabled: boolean;
  settings: Record<string, any>;
  status: 'pending' | 'active' | 'error' | 'testing';
}

const CHANNEL_TEMPLATES: Omit<ChannelConfiguration, 'id' | 'status'>[] = [
  {
    type: 'webchat',
    name: 'Website Widget',
    enabled: false,
    settings: {
      theme: 'light',
      primaryColor: '#3b82f6',
      position: 'bottom-right',
      greeting: 'Hi! How can I help you today?'
    }
  },
  {
    type: 'whatsapp',
    name: 'WhatsApp Business',
    enabled: false,
    settings: {
      phoneNumber: '',
      businessName: '',
      accessToken: ''
    }
  },
  {
    type: 'slack',
    name: 'Slack Integration',
    enabled: false,
    settings: {
      botToken: '',
      signingSecret: ''
    }
  }
];

export default function ChannelsStep({ onNext, onPrevious }: StepProps) {
  const { state, setChannels } = useAgentCreation();
  const { toast } = useToast();
  const [channels, setLocalChannels] = useState<ChannelConfiguration[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelConfiguration | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState<string | null>(null);
  const [wizardData, setWizardData] = useState<any>(null);

  // Initialize channels from templates
  useEffect(() => {
    const initialized = CHANNEL_TEMPLATES.map(template => ({
      ...template,
      id: crypto.randomUUID(),
      status: 'pending' as const
    }));
    setLocalChannels(initialized);
  }, []);

  // Update global state when local channels change
  useEffect(() => {
    const deploymentChannels = channels
      .filter(channel => channel.type !== 'webhook') // Filter out webhook for deployment compatibility
      .map(channel => ({
        type: channel.type as 'webchat' | 'whatsapp' | 'slack' | 'email',
        enabled: channel.enabled,
        config: channel.settings,
        status: channel.status === 'testing' ? 'pending' as const : channel.status as 'pending' | 'active' | 'error'
      }));
    setChannels(deploymentChannels);
  }, [channels, setChannels]);

  const updateChannel = (channelId: string, updates: Partial<ChannelConfiguration>) => {
    setLocalChannels(prev => prev.map(ch => 
      ch.id === channelId ? { ...ch, ...updates } : ch
    ));
  };

  const updateChannelSetting = (channelId: string, key: string, value: any) => {
    setLocalChannels(prev => prev.map(ch => 
      ch.id === channelId 
        ? { ...ch, settings: { ...ch.settings, [key]: value } }
        : ch
    ));
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'webchat': return Globe;
      case 'whatsapp': return Phone;
      case 'slack': return Slack;
      case 'email': return Mail;
      case 'webhook': return Webhook;
      default: return MessageSquare;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
      case 'testing':
        return <Badge variant="outline">Testing...</Badge>;
      default:
        return <Badge variant="secondary">Not Configured</Badge>;
    }
  };

  const openSetupWizard = (channelType: string) => {
    setShowSetupWizard(channelType);
    setWizardData(null);
  };

  const completeSetupWizard = (data: any) => {
    if (!selectedChannel) return;
    
    // Update channel with wizard data
    updateChannel(selectedChannel.id, {
      settings: { ...selectedChannel.settings, ...data },
      status: 'active',
      enabled: true
    });
    
    setShowSetupWizard(null);
    setWizardData(data);
    
    toast({
      title: "Channel Configured!",
      description: `${selectedChannel.name} has been successfully set up.`,
    });
  };

  const renderSetupWizard = () => {
    if (!showSetupWizard) return null;

    switch (showSetupWizard) {
      case 'whatsapp':
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSetupWizard(null)}
                className="absolute -top-2 -right-2 z-10 bg-white border shadow-sm"
              >
                ×
              </Button>
              <WhatsAppSetupWizard onComplete={completeSetupWizard} />
            </div>
          </div>
        );
      case 'slack':
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSetupWizard(null)}
                className="absolute -top-2 -right-2 z-10 bg-white border shadow-sm"
              >
                ×
              </Button>
              <SlackSetupWizard onComplete={completeSetupWizard} />
            </div>
          </div>
        );
      case 'webchat':
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSetupWizard(null)}
                className="absolute -top-2 -right-2 z-10 bg-white border shadow-sm"
              >
                ×
              </Button>
              <WebWidgetSetupWizard onComplete={completeSetupWizard} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Deployment Channels</h2>
        <p className="text-muted-foreground">
          Select and configure where your agent will be available for customers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {channels.map((channel) => {
                const Icon = getChannelIcon(channel.type);
                return (
                  <div
                    key={channel.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedChannel?.id === channel.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedChannel(channel)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5" />
                        <div>
                          <p className="font-medium text-sm">{channel.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {channel.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Switch
                          checked={channel.enabled}
                          onCheckedChange={(enabled) => updateChannel(channel.id, { enabled })}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {getStatusBadge(channel.status)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Channel Configuration */}
        <div className="lg:col-span-2">
          {selectedChannel ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {React.createElement(getChannelIcon(selectedChannel.type), { className: "h-6 w-6" })}
                      <div>
                        <h3 className="text-lg font-semibold">{selectedChannel.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Configure your {selectedChannel.type} integration
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(selectedChannel.status)}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={selectedChannel.enabled}
                      onCheckedChange={(enabled) => updateChannel(selectedChannel.id, { enabled })}
                    />
                    <Label>Enable this channel</Label>
                  </div>

                  {selectedChannel.enabled && (
                    <div className="space-y-4">
                      {/* Quick Setup Button for Complex Channels */}
                      {(selectedChannel.type === 'whatsapp' || selectedChannel.type === 'slack' || selectedChannel.type === 'webchat') && selectedChannel.status !== 'active' && (
                        <Alert>
                          <Settings className="h-4 w-4" />
                          <AlertDescription className="flex items-center justify-between">
                            <span>Use our setup wizard for easy configuration</span>
                            <Button
                              size="sm"
                              onClick={() => openSetupWizard(selectedChannel.type)}
                              className="ml-4"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Setup Wizard
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Manual Configuration */}
                      {selectedChannel.type === 'webchat' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="greeting">Greeting Message</Label>
                            <Input
                              id="greeting"
                              value={selectedChannel.settings.greeting || ''}
                              onChange={(e) => updateChannelSetting(selectedChannel.id, 'greeting', e.target.value)}
                              placeholder="Hi! How can I help you today?"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="primary-color">Primary Color</Label>
                            <Input
                              id="primary-color"
                              type="color"
                              value={selectedChannel.settings.primaryColor || '#3b82f6'}
                              onChange={(e) => updateChannelSetting(selectedChannel.id, 'primaryColor', e.target.value)}
                            />
                          </div>
                          {selectedChannel.status === 'active' && (
                            <Alert>
                              <CheckCircle className="h-4 w-4" />
                              <AlertDescription>
                                Widget is configured! Use the setup wizard to get your embed code.
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openSetupWizard('webchat')}
                                  className="ml-2"
                                >
                                  Get Embed Code
                                </Button>
                              </AlertDescription>
                            </Alert>
                          )}
                        </>
                      )}

                      {selectedChannel.type === 'whatsapp' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="phone-number">Business Phone Number</Label>
                            <Input
                              id="phone-number"
                              value={selectedChannel.settings.phoneNumber || ''}
                              onChange={(e) => updateChannelSetting(selectedChannel.id, 'phoneNumber', e.target.value)}
                              placeholder="+1234567890"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="business-name">Business Name</Label>
                            <Input
                              id="business-name"
                              value={selectedChannel.settings.businessName || ''}
                              onChange={(e) => updateChannelSetting(selectedChannel.id, 'businessName', e.target.value)}
                              placeholder="Your Business Name"
                            />
                          </div>
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              WhatsApp Business requires API credentials. Use the setup wizard for guided configuration.
                            </AlertDescription>
                          </Alert>
                        </>
                      )}

                      {selectedChannel.type === 'slack' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="bot-token">Bot Token</Label>
                            <Input
                              id="bot-token"
                              type="password"
                              value={selectedChannel.settings.botToken || ''}
                              onChange={(e) => updateChannelSetting(selectedChannel.id, 'botToken', e.target.value)}
                              placeholder="xoxb-your-bot-token"
                            />
                          </div>
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              Slack requires OAuth setup. Use the setup wizard for easy integration.
                            </AlertDescription>
                          </Alert>
                        </>
                      )}

                      {selectedChannel.type === 'email' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="email-address">Support Email</Label>
                            <Input
                              id="email-address"
                              type="email"
                              value={selectedChannel.settings.emailAddress || ''}
                              onChange={(e) => updateChannelSetting(selectedChannel.id, 'emailAddress', e.target.value)}
                              placeholder="support@yourcompany.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="signature">Email Signature</Label>
                            <Input
                              id="signature"
                              value={selectedChannel.settings.signature || ''}
                              onChange={(e) => updateChannelSetting(selectedChannel.id, 'signature', e.target.value)}
                              placeholder="Best regards, AI Assistant"
                            />
                          </div>
                        </>
                      )}

                      {selectedChannel.type === 'webhook' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="webhook-url">Webhook URL</Label>
                            <Input
                              id="webhook-url"
                              value={selectedChannel.settings.url || ''}
                              onChange={(e) => updateChannelSetting(selectedChannel.id, 'url', e.target.value)}
                              placeholder="https://your-api.com/webhook"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="webhook-secret">Secret Token (Optional)</Label>
                            <Input
                              id="webhook-secret"
                              type="password"
                              value={selectedChannel.settings.secret || ''}
                              onChange={(e) => updateChannelSetting(selectedChannel.id, 'secret', e.target.value)}
                              placeholder="Your webhook secret"
                            />
                          </div>
                        </>
                      )}

                      {selectedChannel.type !== 'whatsapp' && selectedChannel.type !== 'slack' && (
                        <Button
                          onClick={() => updateChannel(selectedChannel.id, { status: 'active' })}
                          className="w-full"
                        >
                          Test Connection
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Channel</h3>
                <p className="text-muted-foreground">
                  Choose a channel from the list to configure its settings
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Render Setup Wizards */}
      {renderSetupWizard()}
    </div>
  );
}