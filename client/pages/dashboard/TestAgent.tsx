import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Bot,
  MessageSquare,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Copy,
  ExternalLink,
  Code,
  Smartphone,
  Monitor,
  Palette,
  Mic,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ChatWidget from "@/components/ChatWidget";
import VoiceChat from "@/components/VoiceChat";

interface Agent {
  id: string;
  name: string;
  description: string;
  type: 'chat' | 'voice' | 'multimodal';
  status: 'active' | 'inactive' | 'training';
  personality: string;
  instructions: string;
  settings: {
    model: string;
    temperature: number;
    max_tokens: number;
  };
  voice_settings?: {
    voice_id: string;
    stability: number;
    similarity_boost: number;
    style: number;
  };
}

export default function TestAgent() {
  const { agentId } = useParams<{ agentId: string }>();
  const { user, session } = useAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  // Widget configuration
  const [widgetConfig, setWidgetConfig] = useState({
    customerName: 'Test User',
    position: 'bottom-right' as 'bottom-right' | 'bottom-left' | 'center',
    theme: 'light' as 'light' | 'dark',
    primaryColor: '#3b82f6',
    embedded: true,
  });

  // Test scenarios
  const [testScenarios] = useState([
    {
      name: 'General Greeting',
      message: 'Hello! How are you today?',
      description: 'Test basic greeting and conversation starter',
    },
    {
      name: 'Product Inquiry',
      message: 'Can you tell me about your products and services?',
      description: 'Test product knowledge and information retrieval',
    },
    {
      name: 'Support Request',
      message: 'I\'m having trouble with my account. Can you help?',
      description: 'Test support capabilities and problem-solving',
    },
    {
      name: 'Complex Question',
      message: 'What are the differences between your premium and basic plans, and which would you recommend for a small business?',
      description: 'Test detailed reasoning and recommendation abilities',
    },
    {
      name: 'Escalation Trigger',
      message: 'This is not working at all! I want to speak to a human right now!',
      description: 'Test escalation detection and handling',
    },
  ]);

  useEffect(() => {
    if (agentId) {
      fetchAgent();
    }
  }, [agentId]);

  const fetchAgent = async () => {
    try {
      const response = await fetch(`/.netlify/functions/agents/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${(session as any)?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAgent(data.agent);
      }
    } catch (error) {
      console.error('Error fetching agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateEmbedCode = () => {
    const config = {
      agentId: agentId,
      agentName: agent?.name,
      agentType: agent?.type,
      position: widgetConfig.position,
      theme: widgetConfig.theme,
      primaryColor: widgetConfig.primaryColor,
    };

    return `<!-- Ojastack Chat Widget -->
<div id="ojastack-chat-widget"></div>
<script>
  window.OjastackConfig = ${JSON.stringify(config, null, 2)};
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/widget.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(generateEmbedCode());
    // You could add a toast notification here
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Agent not found</h3>
        <p className="text-muted-foreground mb-4">
          The agent you're trying to test doesn't exist or you don't have access to it.
        </p>
        <Button asChild>
          <Link to="/dashboard/agents">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/dashboard/agents/${agentId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Agent
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Test {agent.name}</h1>
            <p className="text-muted-foreground">
              Test your agent's responses and behavior in real-time
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
            {agent.status}
          </Badge>
          <Badge variant="outline">{agent.type}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Widget */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Live Chat Test
              </CardTitle>
              <CardDescription>
                Test your agent's responses in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] border rounded-lg overflow-hidden">
                <ChatWidget
                  agentId={agentId!}
                  agentName={agent.name}
                  agentType={agent.type}
                  customerName={widgetConfig.customerName}
                  theme={widgetConfig.theme}
                  primaryColor={widgetConfig.primaryColor}
                  embedded={true}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration & Tools */}
        <div className="space-y-6">
          <Tabs defaultValue="scenarios" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
              <TabsTrigger value="config">Widget Config</TabsTrigger>
              <TabsTrigger value="embed">Embed Code</TabsTrigger>
            </TabsList>

            <TabsContent value="scenarios" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Test Scenarios</CardTitle>
                  <CardDescription>
                    Try these pre-built scenarios to test different aspects of your agent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {testScenarios.map((scenario, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{scenario.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {scenario.description}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // This would send the message to the chat widget
                            console.log('Send scenario:', scenario.message);
                          }}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Try
                        </Button>
                      </div>
                      <div className="bg-muted rounded p-2 text-sm font-mono">
                        "{scenario.message}"
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Voice Testing Section */}
              {(agent.type === 'voice' || agent.type === 'multimodal') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Mic className="h-5 w-5 mr-2" />
                      Voice Testing
                    </CardTitle>
                    <CardDescription>
                      Test voice interactions and speech capabilities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VoiceChat
                      agentId={agentId!}
                      agentName={agent.name}
                      voiceSettings={{
                        voice_id: agent.voice_settings?.voice_id || "rachel",
                        stability: agent.voice_settings?.stability || 0.5,
                        similarity_boost: agent.voice_settings?.similarity_boost || 0.5,
                        style: agent.voice_settings?.style || 0.5,
                      }}
                      onVoiceSettingsChange={(settings) => {
                        // Update agent voice settings
                        console.log('Voice settings changed:', settings);
                      }}
                      onTranscription={(text) => {
                        console.log('Transcription:', text);
                      }}
                      onResponse={(audioUrl, text) => {
                        console.log('Voice response:', { audioUrl, text });
                      }}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Widget Configuration
                  </CardTitle>
                  <CardDescription>
                    Customize the appearance and behavior of your chat widget
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      value={widgetConfig.customerName}
                      onChange={(e) => setWidgetConfig(prev => ({ ...prev, customerName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Widget Position</Label>
                    <Select
                      value={widgetConfig.position}
                      onValueChange={(value) => setWidgetConfig(prev => ({ ...prev, position: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select
                      value={widgetConfig.theme}
                      onValueChange={(value) => setWidgetConfig(prev => ({ ...prev, theme: value as any }))}
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
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={widgetConfig.primaryColor}
                        onChange={(e) => setWidgetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={widgetConfig.primaryColor}
                        onChange={(e) => setWidgetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <h4 className="font-medium mb-2">Preview Positions</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {['bottom-left', 'center', 'bottom-right'].map((pos) => (
                        <Button
                          key={pos}
                          variant={widgetConfig.position === pos ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setWidgetConfig(prev => ({ ...prev, position: pos as any }))}
                          className="text-xs"
                        >
                          {pos.replace('-', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="embed" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Code className="h-5 w-5 mr-2" />
                    Embed Code
                  </CardTitle>
                  <CardDescription>
                    Copy this code to embed the chat widget on your website
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>HTML Embed Code</Label>
                    <Textarea
                      value={generateEmbedCode()}
                      readOnly
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <div className="flex space-x-2">
                      <Button onClick={copyEmbedCode} variant="outline" size="sm">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`${window.location.origin}/widget-demo?agent=${agentId}`} target="_blank">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Preview
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Integration Options</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Monitor className="h-4 w-4" />
                          <span className="text-sm font-medium">Website</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Add to any website with the HTML embed code
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Smartphone className="h-4 w-4" />
                          <span className="text-sm font-medium">Mobile App</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Integrate using our mobile SDKs
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}