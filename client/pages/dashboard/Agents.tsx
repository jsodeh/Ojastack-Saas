import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Bot, Settings, Play, Pause, Trash2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import CreateAgentDialog from "@/components/dashboard/CreateAgentDialog";
import TemplateGallery from "@/components/templates/TemplateGallery";

interface Agent {
  id: string;
  name: string;
  description: string;
  type: 'chat' | 'voice' | 'multimodal';
  status: 'active' | 'inactive' | 'training';
  conversation_count: number;
  last_active: string | null;
  created_at: string;
  knowledge_bases?: {
    id: string;
    name: string;
    documents_count: number;
  };
}

export default function Agents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/.netlify/functions/agents', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentCreated = (newAgent: Agent) => {
    setAgents(prev => [newAgent, ...prev]);
    setCreateDialogOpen(false);
  };

  const toggleAgentStatus = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(`/.netlify/functions/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setAgents(prev => prev.map(agent => 
          agent.id === agentId ? { ...agent, status: newStatus as any } : agent
        ));
      }
    } catch (error) {
      console.error('Error updating agent status:', error);
    }
  };

  const deleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/.netlify/functions/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });

      if (response.ok) {
        setAgents(prev => prev.filter(agent => agent.id !== agentId));
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'training': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'voice': return '🎤';
      case 'multimodal': return '🎯';
      default: return '💬';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">AI Agents</h1>
            <p className="text-muted-foreground">Create and manage your AI agents</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-muted-foreground">Create and manage your AI agents</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Agent
        </Button>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates" className="flex items-center">
            <Sparkles className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="my-agents" className="flex items-center">
            <Bot className="h-4 w-4 mr-2" />
            My Agents ({agents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <TemplateGallery />
        </TabsContent>

        <TabsContent value="my-agents">
          <div className="space-y-6">
            {agents.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first AI agent to start automating customer interactions
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Agent
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getTypeIcon(agent.type)}</span>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {agent.description || "No description"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}></div>
                    <Badge variant="secondary" className="text-xs">
                      {agent.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline">{agent.type}</Badge>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conversations:</span>
                  <span className="font-medium">{agent.conversation_count}</span>
                </div>

                {agent.knowledge_bases && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Documents:</span>
                    <span className="font-medium">{agent.knowledge_bases.documents_count}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last active:</span>
                  <span className="font-medium">
                    {agent.last_active 
                      ? new Date(agent.last_active).toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAgentStatus(agent.id, agent.status)}
                    className="flex-1"
                  >
                    {agent.status === 'active' ? (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                  
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/dashboard/agents/${agent.id}`}>
                      <Settings className="h-3 w-3 mr-1" />
                      Configure
                    </Link>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteAgent(agent.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CreateAgentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onAgentCreated={handleAgentCreated}
      />
    </div>
  );
}