import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Monitor,
  Code,
  Webhook,
  MessageSquare,
  Phone,
  Globe,
  Settings,
  Copy,
  Eye,
  EyeOff,
  Play,
  Pause,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Download,
  Upload,
  Key,
  Zap,
  Smartphone,
  Mail,
  Users,
  BarChart3
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

interface Integration {
  id: string;
  name: string;
  type: 'widget' | 'api' | 'webhook' | 'platform';
  description: string;
  icon: React.ComponentType<any>;
  status: 'active' | 'inactive' | 'pending';
  category: string;
  config?: any;
  usage?: {
    requests: number;
    period: string;
  };
}

export default function IntegrationConfig() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  const integrations: Integration[] = [
    {
      id: "html_widget",
      name: "HTML Widget",
      type: "widget",
      description: "Embeddable chat widget for websites",
      icon: Monitor,
      status: "active",
      category: "Web",
      config: {
        agentId: "agent_123",
        theme: "light",
        position: "bottom-right",
        color: "#007bff"
      },
      usage: { requests: 1247, period: "last 30 days" }
    },
    {
      id: "rest_api",
      name: "REST API",
      type: "api",
      description: "Direct API integration for custom applications",
      icon: Code,
      status: "active",
      category: "Development",
      config: {
        apiKey: "sk-prod-...",
        baseUrl: "https://api.ojastack.tech/v1",
        rateLimits: { requests: 1000, period: "hour" }
      },
      usage: { requests: 3456, period: "last 30 days" }
    },
    {
      id: "webhooks",
      name: "Webhooks",
      type: "webhook",
      description: "Real-time event notifications",
      icon: Webhook,
      status: "active",
      category: "Development",
      config: {
        endpoints: [
          { url: "https://yourapp.com/webhook", events: ["conversation.created", "message.sent"] }
        ]
      },
      usage: { requests: 892, period: "last 30 days" }
    },
    {
      id: "slack",
      name: "Slack",
      type: "platform",
      description: "Slack workspace integration",
      icon: MessageSquare,
      status: "active",
      category: "Communication",
      config: {
        workspaceId: "T1234567890",
        botToken: "xoxb-...",
        channels: ["#general", "#support"]
      },
      usage: { requests: 567, period: "last 30 days" }
    },
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      type: "platform",
      description: "WhatsApp Business API integration",
      icon: Phone,
      status: "pending",
      category: "Communication",
      config: {
        phoneNumber: "+1234567890",
        accessToken: "EAA...",
        webhookUrl: "https://api.ojastack.tech/webhook/whatsapp"
      },
      usage: { requests: 0, period: "last 30 days" }
    },
    {
      id: "website",
      name: "Website Integration",
      type: "widget",
      description: "JavaScript SDK for websites",
      icon: Globe,
      status: "inactive",
      category: "Web",
      config: {
        sdkVersion: "1.0.0",
        trackingId: "OJ-123456789"
      },
      usage: { requests: 234, period: "last 30 days" }
    }
  ];

  const categories = ["all", ...Array.from(new Set(integrations.map(i => i.category)))];

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-700 border-green-300";
      case "pending": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "inactive": return "bg-gray-100 text-gray-700 border-gray-300";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "inactive": return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "widget": return "bg-blue-100 text-blue-700";
      case "api": return "bg-purple-100 text-purple-700";
      case "webhook": return "bg-orange-100 text-orange-700";
      case "platform": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
  };

  return (
    <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
            <p className="text-muted-foreground">
              Connect your AI agents with external platforms and services
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Integrations</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {integrations.filter(i => i.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+2</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {integrations.reduce((sum, i) => sum + (i.usage?.requests || 0), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Usage</CardTitle>
              <Code className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87%</div>
              <p className="text-xs text-muted-foreground">
                of monthly quota used
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
              <Webhook className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {integrations.filter(i => i.type === 'webhook').length}
              </div>
              <p className="text-xs text-muted-foreground">
                endpoints configured
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search integrations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category === "all" ? "All Categories" : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIntegrations.map((integration) => (
            <Card key={integration.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <integration.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className={getStatusColor(integration.status)}>
                          {getStatusIcon(integration.status)}
                          <span className="ml-1">{integration.status}</span>
                        </Badge>
                        <Badge className={getTypeColor(integration.type)}>
                          {integration.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {integration.description}
                </CardDescription>

                {integration.usage && (
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Usage</span>
                      <span className="font-medium">{integration.usage.requests.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Period</span>
                      <span className="font-medium">{integration.usage.period}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedIntegration(integration);
                      setIsConfigDialogOpen(true);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                    {integration.status === 'active' ? (
                      <Button variant="ghost" size="sm">
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Integration Configuration Dialog */}
        {selectedIntegration && (
          <IntegrationConfigDialog
            integration={selectedIntegration}
            open={isConfigDialogOpen}
            onOpenChange={setIsConfigDialogOpen}
            onCopy={copyToClipboard}
          />
        )}
      </div>
    </div>
  );
}

// Integration Configuration Dialog
function IntegrationConfigDialog({ 
  integration, 
  open, 
  onOpenChange,
  onCopy 
}: { 
  integration: Integration;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onCopy: (text: string) => void;
}) {
  const [showApiKey, setShowApiKey] = useState(false);

  const generateWidgetCode = () => {
    return `<!-- Ojastack AI Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://widget.ojastack.tech/widget.js';
    script.setAttribute('data-agent-id', '${integration.config?.agentId || "your-agent-id"}');
    script.setAttribute('data-theme', '${integration.config?.theme || "light"}');
    script.setAttribute('data-position', '${integration.config?.position || "bottom-right"}');
    script.setAttribute('data-color', '${integration.config?.color || "#007bff"}');
    document.head.appendChild(script);
  })();
</script>`;
  };

  const generateAPIExample = () => {
    return `// Example API usage
const response = await fetch('https://api.ojastack.tech/v1/conversations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${integration.config?.apiKey || "your-api-key"}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agent_id: '${integration.config?.agentId || "your-agent-id"}',
    message: 'Hello, I need help'
  })
});

const data = await response.json();
console.log(data);`;
  };

  const generateWebhookConfig = () => {
    return `{
  "url": "https://yourapp.com/webhook",
  "events": ["conversation.created", "message.sent", "conversation.ended"],
  "secret": "your-webhook-secret",
  "headers": {
    "Authorization": "Bearer your-token"
  }
}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <integration.icon className="h-6 w-6 text-primary" />
            <div>
              <DialogTitle>{integration.name} Configuration</DialogTitle>
              <DialogDescription>{integration.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="code">Code Examples</TabsTrigger>
            <TabsTrigger value="webhook">Webhooks</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
            {integration.type === 'widget' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Widget Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Agent ID</Label>
                    <Input value={integration.config?.agentId} />
                  </div>
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select value={integration.config?.theme}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Select value={integration.config?.position}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <Input type="color" value={integration.config?.color} />
                  </div>
                </div>
              </div>
            )}

            {integration.type === 'api' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">API Configuration</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <div className="flex space-x-2">
                      <Input 
                        type={showApiKey ? "text" : "password"}
                        value={integration.config?.apiKey}
                        className="font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCopy(integration.config?.apiKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Base URL</Label>
                    <Input value={integration.config?.baseUrl} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>Rate Limits</Label>
                    <p className="text-sm text-muted-foreground">
                      {integration.config?.rateLimits?.requests} requests per {integration.config?.rateLimits?.period}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {integration.type === 'platform' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Platform Settings</h3>
                {integration.id === 'slack' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Workspace ID</Label>
                      <Input value={integration.config?.workspaceId} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Bot Token</Label>
                      <Input type="password" value={integration.config?.botToken} />
                    </div>
                    <div className="space-y-2">
                      <Label>Channels</Label>
                      <p className="text-sm text-muted-foreground">
                        {integration.config?.channels?.join(', ')}
                      </p>
                    </div>
                  </div>
                )}
                {integration.id === 'whatsapp' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input value={integration.config?.phoneNumber} />
                    </div>
                    <div className="space-y-2">
                      <Label>Access Token</Label>
                      <Input type="password" value={integration.config?.accessToken} />
                    </div>
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <Input value={integration.config?.webhookUrl} readOnly />
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="code" className="space-y-6">
            {integration.type === 'widget' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">HTML Widget Code</h3>
                <p className="text-sm text-muted-foreground">
                  Copy and paste this code into your website's HTML:
                </p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{generateWidgetCode()}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => onCopy(generateWidgetCode())}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {integration.type === 'api' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">API Integration Example</h3>
                <p className="text-sm text-muted-foreground">
                  Example JavaScript code for API integration:
                </p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{generateAPIExample()}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => onCopy(generateAPIExample())}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="webhook" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Webhook Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Configure webhooks to receive real-time notifications:
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{generateWebhookConfig()}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => onCopy(generateWebhookConfig())}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Available Events</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'conversation.created',
                    'conversation.ended',
                    'message.sent',
                    'message.received',
                    'agent.response',
                    'user.joined'
                  ].map(event => (
                    <div key={event} className="flex items-center space-x-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{event}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Usage Analytics</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{integration.usage?.requests.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">{integration.usage?.period}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">99.2%</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <Label>Recent Activity</Label>
                <div className="space-y-2">
                  {[
                    { time: "2 minutes ago", event: "API request", status: "success" },
                    { time: "5 minutes ago", event: "Widget loaded", status: "success" },
                    { time: "12 minutes ago", event: "Webhook delivered", status: "success" },
                    { time: "1 hour ago", event: "API request", status: "error" }
                  ].map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="text-sm">{activity.event}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button>
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
