import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Bot,
  MessageSquare,
  Settings,
  BarChart3,
  Database,
  Zap,
  Save,
  Play,
  Pause,
  Copy,
  ExternalLink,
  Plus
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

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
  tools: string[];
  voice_settings: any;
  deployment_urls: {
    whatsapp: string;
    slack: string;
    web: string;
  };
  conversation_count: number;
  last_active: string | null;
  created_at: string;
  knowledge_bases?: {
    id: string;
    name: string;
    description: string;
    documents_count: number;
    total_size_bytes: number;
  };
}

export default function AgentDetail() {
  const { agentId } = useParams<{ agentId: string }>();
  const { user, session } = useAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recentConversations, setRecentConversations] = useState([]);

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
        setRecentConversations(data.recentConversations || []);
      }
    } catch (error) {
      console.error('Error fetching agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAgent = async () => {
    if (!agent) return;

    setSaving(true);
    try {
      const response = await fetch(`/.netlify/functions/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${(session as any)?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: agent.name,
          description: agent.description,
          personality: agent.personality,
          instructions: agent.instructions,
          model: agent.settings.model,
          temperature: agent.settings.temperature,
          max_tokens: agent.settings.max_tokens,
          tools: agent.tools,
          voice_settings: agent.voice_settings,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAgent(data.agent);
        alert('Agent updated successfully!');
      }
    } catch (error) {
      console.error('Error saving agent:', error);
      alert('Failed to save agent. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!agent) return;

    const newStatus = agent.status === 'active' ? 'inactive' : 'active';

    try {
      const response = await fetch(`/.netlify/functions/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${(session as any)?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setAgent(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (error) {
      console.error('Error updating agent status:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const updateAgent = (field: string, value: any) => {
    setAgent(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateSettings = (field: string, value: any) => {
    setAgent(prev => prev ? {
      ...prev,
      settings: { ...prev.settings, [field]: value }
    } : null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="space-y-6">
            <div className="h-32 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Agent not found</h3>
        <p className="text-muted-foreground mb-4">
          The agent you're looking for doesn't exist or you don't have access to it.
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
            <Link to="/dashboard/agents">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Agents
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{agent.name}</h1>
            <p className="text-muted-foreground">{agent.description || "No description"}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
            {agent.status}
          </Badge>
          <Button variant="outline" onClick={toggleStatus}>
            {agent.status === 'active' ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Activate
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/dashboard/agents/${agentId}/test`}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Test Agent
            </Link>
          </Button>
          <Button onClick={saveAgent} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="configuration" className="space-y-6">
            <TabsList>
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="deployment">Deployment</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="configuration" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Configure your agent's basic settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Agent Name</Label>
                      <Input
                        id="name"
                        value={agent.name}
                        onChange={(e) => updateAgent('name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select value={agent.type} onValueChange={(value) => updateAgent('type', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chat">💬 Chat Only</SelectItem>
                          <SelectItem value="voice">🎤 Voice Only</SelectItem>
                          <SelectItem value="multimodal">🎯 Chat + Voice</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={agent.description}
                      onChange={(e) => updateAgent('description', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Personality & Instructions</CardTitle>
                  <CardDescription>Define how your agent behaves and responds</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="personality">Personality</Label>
                    <Textarea
                      id="personality"
                      value={agent.personality}
                      onChange={(e) => updateAgent('personality', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instructions">Instructions</Label>
                    <Textarea
                      id="instructions"
                      value={agent.instructions}
                      onChange={(e) => updateAgent('instructions', e.target.value)}
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI Model Settings</CardTitle>
                  <CardDescription>Configure the AI model parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model">AI Model</Label>
                      <Select value={agent.settings.model} onValueChange={(value) => updateSettings('model', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                          <SelectItem value="claude-3">Claude 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_tokens">Max Response Length</Label>
                      <Input
                        id="max_tokens"
                        type="number"
                        value={agent.settings.max_tokens}
                        onChange={(e) => updateSettings('max_tokens', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Creativity: {agent.settings.temperature}</Label>
                    <Slider
                      value={[agent.settings.temperature]}
                      onValueChange={([value]) => updateSettings('temperature', value)}
                      max={1}
                      step={0.1}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deployment" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Deployment URLs</CardTitle>
                  <CardDescription>Use these URLs to integrate your agent with different platforms</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">WhatsApp Webhook</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {agent.deployment_urls.whatsapp}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(agent.deployment_urls.whatsapp)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">Web Widget</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {agent.deployment_urls.web}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(agent.deployment_urls.web)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">Slack Integration</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {agent.deployment_urls.slack}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(agent.deployment_urls.slack)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{agent.conversation_count}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                      {agent.status}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Last Active</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      {agent.last_active
                        ? new Date(agent.last_active).toLocaleDateString()
                        : 'Never'
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>

              {recentConversations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Conversations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recentConversations.slice(0, 5).map((conv: any) => (
                        <div key={conv.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{conv.channel}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(conv.created_at).toLocaleString()}
                            </div>
                          </div>
                          <Badge variant="outline">{conv.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                Agent Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Active</span>
                <Switch
                  checked={agent.status === 'active'}
                  onCheckedChange={toggleStatus}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {agent.status === 'active'
                  ? 'Your agent is live and responding to messages'
                  : 'Your agent is paused and not responding'
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Knowledge Base
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agent.knowledge_bases ? (
                <div className="space-y-2">
                  <div className="font-medium">{agent.knowledge_bases.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {agent.knowledge_bases.documents_count} documents
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Manage Knowledge
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground mb-2">
                    No knowledge base configured
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Knowledge Base
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Test Agent
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Advanced Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}