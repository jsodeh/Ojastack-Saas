import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Copy,
  Code,
  Terminal,
  Book,
  Key,
  Globe,
  ArrowRight,
  ExternalLink,
  CheckCircle,
  ChevronRight,
  FileText,
  Zap,
  Shield,
  Clock,
  MessageCircle,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function API() {
  const [selectedEndpoint, setSelectedEndpoint] = useState("agents");
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Code snippet copied successfully",
    });
  };

  const askAI = (context: string) => {
    toast({
      title: "Ask AI",
      description: "AI assistant is preparing to help with this endpoint",
    });
  };

  const endpoints = [
    {
      id: "agents",
      name: "Agents",
      description: "Create and manage AI agents",
      methods: ["GET", "POST", "PUT", "DELETE"],
      path: "/v1/agents"
    },
    {
      id: "conversations",
      name: "Conversations",
      description: "Handle customer conversations",
      methods: ["GET", "POST"],
      path: "/v1/conversations"
    },
    {
      id: "knowledge",
      name: "Knowledge Base",
      description: "Manage training data and documents",
      methods: ["GET", "POST", "DELETE"],
      path: "/v1/knowledge"
    },
    {
      id: "analytics",
      name: "Analytics",
      description: "Retrieve performance metrics",
      methods: ["GET"],
      path: "/v1/analytics"
    },
    {
      id: "integrations",
      name: "Integrations",
      description: "Connect external platforms",
      methods: ["GET", "POST", "PUT"],
      path: "/v1/integrations"
    },
    {
      id: "webhooks",
      name: "Webhooks",
      description: "Real-time event notifications",
      methods: ["GET", "POST", "DELETE"],
      path: "/v1/webhooks"
    }
  ];

  const codeExamples = {
    curl: {
      agents: `curl -X POST https://api.ojastack.tech/v1/agents \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Customer Support Agent",
    "type": "chat",
    "description": "Handles general customer inquiries",
    "knowledge_base_id": "kb_123456",
    "settings": {
      "temperature": 0.7,
      "max_tokens": 500,
      "language": "en"
    },
    "integrations": ["zendesk", "slack"]
  }'`,
      conversations: `curl -X POST https://api.ojastack.tech/v1/conversations \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "agent_123456",
    "customer_id": "customer_789",
    "message": "I need help with my order",
    "channel": "web_chat",
    "context": {
      "user_agent": "Mozilla/5.0...",
      "page_url": "https://example.com/support"
    }
  }'`,
      knowledge: `curl -X POST https://api.ojastack.tech/v1/knowledge \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@faq.pdf" \\
  -F "name=Customer FAQ" \\
  -F "category=support" \\
  -F "auto_index=true"`
    },
    javascript: {
      agents: `import { OjastackClient } from '@ojastack/sdk';

const client = new OjastackClient({
  apiKey: process.env.OJASTACK_API_KEY,
  baseURL: 'https://api.ojastack.tech'
});

async function createAgent() {
  try {
    const agent = await client.agents.create({
      name: 'Customer Support Agent',
      type: 'chat',
      description: 'Handles general customer inquiries',
      knowledgeBaseId: 'kb_123456',
      settings: {
        temperature: 0.7,
        maxTokens: 500,
        language: 'en'
      },
      integrations: ['zendesk', 'slack']
    });
    
    console.log('Agent created:', agent.id);
    return agent;
  } catch (error) {
    console.error('Error creating agent:', error);
    throw error;
  }
}`,
      conversations: `import { OjastackClient } from '@ojastack/sdk';

const client = new OjastackClient({
  apiKey: process.env.OJASTACK_API_KEY
});

async function sendMessage(agentId, customerId, message) {
  try {
    const response = await client.conversations.create({
      agentId,
      customerId,
      message,
      channel: 'web_chat',
      context: {
        userAgent: navigator.userAgent,
        pageUrl: window.location.href
      }
    });
    
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Real-time conversation handling
client.conversations.onMessage((message) => {
  console.log('New message:', message);
  // Handle incoming message
});`,
      knowledge: `import { OjastackClient } from '@ojastack/sdk';

const client = new OjastackClient({
  apiKey: process.env.OJASTACK_API_KEY
});

async function uploadDocument(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    formData.append('category', 'support');
    formData.append('autoIndex', 'true');
    
    const document = await client.knowledge.upload(formData);
    console.log('Document uploaded:', document.id);
    return document;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}`
    },
    python: {
      agents: `from ojastack import OjastackClient
import os

client = OjastackClient(
    api_key=os.getenv("OJASTACK_API_KEY"),
    base_url="https://api.ojastack.tech"
)

def create_agent():
    try:
        agent = client.agents.create(
            name="Customer Support Agent",
            type="chat",
            description="Handles general customer inquiries",
            knowledge_base_id="kb_123456",
            settings={
                "temperature": 0.7,
                "max_tokens": 500,
                "language": "en"
            },
            integrations=["zendesk", "slack"]
        )
        
        print(f"Agent created: {agent.id}")
        return agent
    except Exception as error:
        print(f"Error creating agent: {error}")
        raise error`,
      conversations: `from ojastack import OjastackClient
import asyncio

client = OjastackClient(api_key=os.getenv("OJASTACK_API_KEY"))

async def send_message(agent_id, customer_id, message):
    try:
        response = await client.conversations.create(
            agent_id=agent_id,
            customer_id=customer_id,
            message=message,
            channel="web_chat",
            context={
                "user_agent": "Python SDK",
                "source": "api"
            }
        )
        
        return response
    except Exception as error:
        print(f"Error sending message: {error}")
        raise error

# Async conversation handling
async def handle_conversation():
    async for message in client.conversations.stream():
        print(f"New message: {message}")
        # Process message`,
      knowledge: `from ojastack import OjastackClient
import os

client = OjastackClient(api_key=os.getenv("OJASTACK_API_KEY"))

def upload_document(file_path):
    try:
        with open(file_path, 'rb') as file:
            document = client.knowledge.upload(
                file=file,
                name=os.path.basename(file_path),
                category="support",
                auto_index=True
            )
        
        print(f"Document uploaded: {document.id}")
        return document
    except Exception as error:
        print(f"Error uploading document: {error}")
        raise error`
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0">
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-gradient-to bg-clip-text text-transparent">
                  Ojastack
                </span>
              </Link>
              <div className="hidden md:block ml-10">
                <div className="flex items-baseline space-x-4">
                  <Link to="/features" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium">Features</Link>
                  <Link to="/pricing" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium">Pricing</Link>
                  <Link to="/docs" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium">Docs</Link>
                  <Link to="/contact" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium">Contact</Link>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 border-r bg-muted/30 min-h-screen">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">API Reference</h2>
              <p className="text-sm text-muted-foreground">
                Complete documentation for the Ojastack REST API
              </p>
            </div>
            
            {/* Quick Start */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Quick Start</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="#authentication" className="text-muted-foreground hover:text-foreground">Authentication</Link></li>
                <li><Link to="#rate-limits" className="text-muted-foreground hover:text-foreground">Rate Limits</Link></li>
                <li><Link to="#errors" className="text-muted-foreground hover:text-foreground">Error Handling</Link></li>
                <li><Link to="#sdks" className="text-muted-foreground hover:text-foreground">SDKs</Link></li>
              </ul>
            </div>

            <Separator className="my-4" />
            
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold mb-3">Endpoints</h3>
                {endpoints.map((endpoint) => (
                  <Button
                    key={endpoint.id}
                    variant={selectedEndpoint === endpoint.id ? "secondary" : "ghost"}
                    onClick={() => setSelectedEndpoint(endpoint.id)}
                    className="w-full justify-start p-3 h-auto flex-col items-start"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{endpoint.name}</span>
                      <div className="flex space-x-1">
                        {endpoint.methods.map((method) => (
                          <Badge key={method} variant="outline" className="text-xs">
                            {method}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 text-left">
                      {endpoint.description}
                    </span>
                    <code className="text-xs text-muted-foreground mt-1 font-mono">
                      {endpoint.path}
                    </code>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="max-w-4xl mx-auto p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
                <Link to="/docs" className="hover:text-foreground">Documentation</Link>
                <ChevronRight className="h-4 w-4" />
                <span>API Reference</span>
                <ChevronRight className="h-4 w-4" />
                <span>{endpoints.find(e => e.id === selectedEndpoint)?.name}</span>
              </div>
              
              <h1 className="text-4xl font-bold mb-4">Ojastack REST API</h1>
              <p className="text-xl text-muted-foreground mb-6">
                Build powerful AI-driven customer experiences with our comprehensive API. 
                Manage agents, handle conversations, and integrate with any platform.
              </p>
              
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => askAI("API Documentation")}
                  className="text-sm"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Ask AI about this API
                </Button>
                <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  v1.0 Stable
                </Badge>
              </div>
            </div>

            {/* API Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <Card>
                <CardContent className="p-6 text-center">
                  <Globe className="h-8 w-8 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">RESTful Design</h3>
                  <p className="text-sm text-muted-foreground">
                    Clean, predictable URLs and standard HTTP methods
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Shield className="h-8 w-8 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Secure by Default</h3>
                  <p className="text-sm text-muted-foreground">
                    API key authentication with rate limiting and HTTPS
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Zap className="h-8 w-8 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Real-time Events</h3>
                  <p className="text-sm text-muted-foreground">
                    WebSocket support and webhooks for instant updates
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Authentication Section */}
            <section className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold" id="authentication">Authentication</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => askAI("API Authentication")}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Key className="h-5 w-5 mr-2" />
                    API Key Authentication
                  </CardTitle>
                  <CardDescription>
                    Use your API key in the Authorization header for all requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Example request:</p>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <span className="text-sm font-medium">Authentication Header</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard('Authorization: Bearer YOUR_API_KEY')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm">
                            <code>Authorization: Bearer YOUR_API_KEY</code>
                          </pre>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <Key className="h-5 w-5 text-blue-600" />
                      <div className="text-sm">
                        <strong>Get your API key:</strong> Visit your{" "}
                        <Link to="/dashboard/api-keys" className="text-primary hover:underline">
                          dashboard settings
                        </Link>{" "}
                        to generate a new API key.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Rate Limits Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4" id="rate-limits">Rate Limits</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold">1,000</div>
                      <div className="text-sm text-muted-foreground">requests/hour</div>
                    </div>
                    <div className="text-center">
                      <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold">10,000</div>
                      <div className="text-sm text-muted-foreground">requests/day</div>
                    </div>
                    <div className="text-center">
                      <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold">100</div>
                      <div className="text-sm text-muted-foreground">requests/minute</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Endpoint Documentation */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6">API Endpoints</h2>
              
              <Tabs value={selectedEndpoint} onValueChange={setSelectedEndpoint} className="w-full">
                {endpoints.map((endpoint) => (
                  <TabsContent key={endpoint.id} value={endpoint.id}>
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-2xl">{endpoint.name}</CardTitle>
                            <CardDescription className="text-lg mt-2">
                              {endpoint.description}
                            </CardDescription>
                          </div>
                          <div className="flex space-x-2">
                            {endpoint.methods.map((method) => (
                              <Badge key={method} variant="outline" className={
                                method === 'GET' ? 'border-green-500 text-green-700' :
                                method === 'POST' ? 'border-blue-500 text-blue-700' :
                                method === 'PUT' ? 'border-yellow-500 text-yellow-700' :
                                'border-red-500 text-red-700'
                              }>
                                {method}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-semibold mb-3">Code Examples</h3>
                            <Tabs defaultValue="curl" className="w-full">
                              <TabsList>
                                <TabsTrigger value="curl">cURL</TabsTrigger>
                                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                                <TabsTrigger value="python">Python</TabsTrigger>
                              </TabsList>
                              
                              {Object.entries(codeExamples).map(([lang, examples]) => (
                                <TabsContent key={lang} value={lang}>
                                  <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                      <div className="flex items-center space-x-2">
                                        <Terminal className="h-4 w-4" />
                                        <span className="text-sm font-medium capitalize">{lang}</span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(examples[endpoint.id] || '')}
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                      <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm">
                                        <code>{examples[endpoint.id] || 'Example not available'}</code>
                                      </pre>
                                    </CardContent>
                                  </Card>
                                </TabsContent>
                              ))}
                            </Tabs>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-3">Response Format</h3>
                            <Card>
                              <CardContent className="p-4">
                                <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm">
                                  <code>{`{
  "success": true,
  "data": {
    "id": "${endpoint.id}_123456",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    // ... endpoint-specific fields
  },
  "meta": {
    "request_id": "req_abcd1234",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}`}</code>
                                </pre>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </section>

            {/* SDKs Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6" id="sdks">Official SDKs</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Code className="h-5 w-5 mr-2" />
                      JavaScript/Node.js
                    </CardTitle>
                    <CardDescription>
                      Full-featured SDK for browser and Node.js
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <code className="text-sm bg-muted p-2 rounded block">
                        npm install @ojastack/sdk
                      </code>
                      <div className="flex space-x-2">
                        <Button size="sm" className="flex-1">
                          <Book className="h-4 w-4 mr-2" />
                          Docs
                        </Button>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Code className="h-5 w-5 mr-2" />
                      Python
                    </CardTitle>
                    <CardDescription>
                      Pythonic SDK with async support
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <code className="text-sm bg-muted p-2 rounded block">
                        pip install ojastack
                      </code>
                      <div className="flex space-x-2">
                        <Button size="sm" className="flex-1">
                          <Book className="h-4 w-4 mr-2" />
                          Docs
                        </Button>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Code className="h-5 w-5 mr-2" />
                      Go
                    </CardTitle>
                    <CardDescription>
                      Lightweight Go client library
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <code className="text-sm bg-muted p-2 rounded block">
                        go get github.com/ojastack/go-sdk
                      </code>
                      <div className="flex space-x-2">
                        <Button size="sm" className="flex-1">
                          <Book className="h-4 w-4 mr-2" />
                          Docs
                        </Button>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Support Section */}
            <section className="mb-12">
              <Card className="bg-gradient-to-r from-primary/10 to-gradient-to/10">
                <CardContent className="p-8 text-center">
                  <h2 className="text-2xl font-bold mb-4">Need Help with the API?</h2>
                  <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                    Our developer support team is here to help you build amazing experiences with Ojastack.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/contact">
                      <Button size="lg">
                        Get Support
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                    <Link to="/docs">
                      <Button size="lg" variant="outline">
                        <Book className="mr-2 h-5 w-5" />
                        View Guides
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
