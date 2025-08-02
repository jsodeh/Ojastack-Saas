import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Code,
  Copy,
  Play,
  Key,
  BookOpen,
  Terminal,
  Send,
  MessageSquare,
  Database,
  Settings,
  Zap,
  Eye,
  CheckCircle,
  ExternalLink,
  Download,
  Search
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  category: string;
  parameters?: Parameter[];
  response?: object;
  example?: {
    request: object;
    response: object;
  };
}

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: any;
}

export default function APIReference() {
  const { toast } = useToast();
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [apiKey, setApiKey] = useState("");

  const apiEndpoints: APIEndpoint[] = [
    {
      method: "POST",
      path: "/api/v1/conversations",
      description: "Create a new conversation with an AI agent",
      category: "Conversations",
      parameters: [
        { name: "agent_id", type: "string", required: true, description: "ID of the agent to use", example: "agent_123" },
        { name: "message", type: "string", required: true, description: "Initial message content", example: "Hello, I need help" },
        { name: "user_id", type: "string", required: false, description: "Optional user identifier", example: "user_456" },
        { name: "metadata", type: "object", required: false, description: "Additional conversation metadata", example: { source: "website", channel: "chat" } }
      ],
      example: {
        request: {
          agent_id: "agent_123",
          message: "Hello, I need help with my order",
          user_id: "user_456",
          metadata: { source: "website", channel: "chat" }
        },
        response: {
          conversation_id: "conv_789",
          response: "Hello! I'd be happy to help you with your order. Could you please provide your order number?",
          agent_id: "agent_123",
          timestamp: "2024-01-15T10:30:00Z"
        }
      }
    },
    {
      method: "POST",
      path: "/api/v1/conversations/{conversation_id}/messages",
      description: "Send a message to an existing conversation",
      category: "Conversations",
      parameters: [
        { name: "conversation_id", type: "string", required: true, description: "ID of the conversation", example: "conv_789" },
        { name: "message", type: "string", required: true, description: "Message content", example: "My order number is #12345" },
        { name: "user_id", type: "string", required: false, description: "Optional user identifier", example: "user_456" }
      ],
      example: {
        request: {
          message: "My order number is #12345",
          user_id: "user_456"
        },
        response: {
          message_id: "msg_101",
          response: "Thank you! I found your order #12345. It was shipped yesterday and should arrive tomorrow.",
          conversation_id: "conv_789",
          timestamp: "2024-01-15T10:31:00Z"
        }
      }
    },
    {
      method: "GET",
      path: "/api/v1/conversations",
      description: "List all conversations",
      category: "Conversations",
      parameters: [
        { name: "limit", type: "integer", required: false, description: "Number of conversations to return (max 100)", example: 20 },
        { name: "offset", type: "integer", required: false, description: "Number of conversations to skip", example: 0 },
        { name: "agent_id", type: "string", required: false, description: "Filter by agent ID", example: "agent_123" },
        { name: "user_id", type: "string", required: false, description: "Filter by user ID", example: "user_456" }
      ],
      example: {
        request: {},
        response: {
          conversations: [
            {
              id: "conv_789",
              agent_id: "agent_123",
              user_id: "user_456",
              status: "active",
              created_at: "2024-01-15T10:30:00Z",
              updated_at: "2024-01-15T10:31:00Z",
              message_count: 3
            }
          ],
          total: 1,
          limit: 20,
          offset: 0
        }
      }
    },
    {
      method: "GET",
      path: "/api/v1/agents",
      description: "List all available agents",
      category: "Agents",
      parameters: [
        { name: "status", type: "string", required: false, description: "Filter by status (active, inactive, training)", example: "active" },
        { name: "type", type: "string", required: false, description: "Filter by type (chat, voice, vision)", example: "chat" }
      ],
      example: {
        request: {},
        response: {
          agents: [
            {
              id: "agent_123",
              name: "Customer Support Bot",
              description: "Handles customer inquiries and support",
              type: "chat",
              status: "active",
              capabilities: ["text", "search", "tickets"],
              created_at: "2024-01-10T09:00:00Z"
            }
          ]
        }
      }
    },
    {
      method: "GET",
      path: "/api/v1/agents/{agent_id}",
      description: "Get detailed information about a specific agent",
      category: "Agents",
      parameters: [
        { name: "agent_id", type: "string", required: true, description: "ID of the agent", example: "agent_123" }
      ],
      example: {
        request: {},
        response: {
          id: "agent_123",
          name: "Customer Support Bot",
          description: "Handles customer inquiries and support",
          type: "chat",
          status: "active",
          capabilities: ["text", "search", "tickets"],
          knowledge_bases: ["kb_support", "kb_faq"],
          tools: ["search", "ticket_system"],
          integrations: ["slack", "zendesk"],
          settings: {
            temperature: 0.7,
            max_tokens: 500,
            response_time: "fast"
          },
          created_at: "2024-01-10T09:00:00Z"
        }
      }
    },
    {
      method: "POST",
      path: "/api/v1/agents",
      description: "Create a new AI agent",
      category: "Agents",
      parameters: [
        { name: "name", type: "string", required: true, description: "Agent name", example: "Sales Assistant" },
        { name: "description", type: "string", required: true, description: "Agent description", example: "Helps with sales inquiries" },
        { name: "type", type: "string", required: true, description: "Agent type (chat, voice, vision)", example: "chat" },
        { name: "knowledge_bases", type: "array", required: false, description: "List of knowledge base IDs", example: ["kb_sales"] },
        { name: "tools", type: "array", required: false, description: "List of tool IDs", example: ["search", "crm"] },
        { name: "settings", type: "object", required: false, description: "Agent configuration settings" }
      ],
      example: {
        request: {
          name: "Sales Assistant",
          description: "Helps with sales inquiries and lead qualification",
          type: "chat",
          knowledge_bases: ["kb_sales"],
          tools: ["search", "crm"],
          settings: {
            temperature: 0.6,
            max_tokens: 300
          }
        },
        response: {
          id: "agent_456",
          name: "Sales Assistant",
          description: "Helps with sales inquiries and lead qualification",
          type: "chat",
          status: "training",
          created_at: "2024-01-15T11:00:00Z"
        }
      }
    },
    {
      method: "GET",
      path: "/api/v1/knowledge-bases",
      description: "List all knowledge bases",
      category: "Knowledge",
      parameters: [
        { name: "status", type: "string", required: false, description: "Filter by status", example: "active" }
      ],
      example: {
        request: {},
        response: {
          knowledge_bases: [
            {
              id: "kb_support",
              name: "Customer Support Knowledge",
              description: "Support documentation and FAQs",
              document_count: 245,
              size: "12.3 MB",
              status: "active",
              created_at: "2024-01-05T08:00:00Z"
            }
          ]
        }
      }
    }
  ];

  const categories = ["all", ...Array.from(new Set(apiEndpoints.map(ep => ep.category)))];

  const filteredEndpoints = apiEndpoints.filter(endpoint => {
    const matchesSearch = endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         endpoint.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || endpoint.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "bg-green-100 text-green-700";
      case "POST": return "bg-blue-100 text-blue-700";
      case "PUT": return "bg-yellow-100 text-yellow-700";
      case "DELETE": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">API Reference</h1>
            <p className="text-muted-foreground">
              Complete documentation for the Ojastack API
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              OpenAPI Spec
            </Button>
            <Button>
              <ExternalLink className="h-4 w-4 mr-2" />
              API Explorer
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* API Key Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your API key to test endpoints
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <div className="flex items-center space-x-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                      https://api.ojastack.tech
                    </code>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard("https://api.ojastack.tech")}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Start */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Quick Start
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">1. Get API Key</h4>
                  <p className="text-xs text-muted-foreground">
                    Generate an API key from your dashboard settings
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">2. Make First Request</h4>
                  <p className="text-xs text-muted-foreground">
                    Use the conversations endpoint to start chatting
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">3. Handle Responses</h4>
                  <p className="text-xs text-muted-foreground">
                    Parse JSON responses and handle errors properly
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Search and Filter */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search endpoints..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
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

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.filter(cat => cat !== "all").map(category => {
                  const count = apiEndpoints.filter(ep => ep.category === category).length;
                  return (
                    <div 
                      key={category}
                      className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted"
                      onClick={() => setSelectedCategory(category)}
                    >
                      <span className="text-sm font-medium">{category}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Endpoints List */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">API Endpoints</h2>
              
              {filteredEndpoints.map((endpoint, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedEndpoint(endpoint)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge className={getMethodColor(endpoint.method)}>
                          {endpoint.method}
                        </Badge>
                        <div>
                          <CardTitle className="text-lg font-mono">
                            {endpoint.path}
                          </CardTitle>
                          <CardDescription>{endpoint.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline">{endpoint.category}</Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {/* Selected Endpoint Details */}
            {selectedEndpoint && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Badge className={getMethodColor(selectedEndpoint.method)}>
                      {selectedEndpoint.method}
                    </Badge>
                    <CardTitle className="text-xl font-mono">
                      {selectedEndpoint.path}
                    </CardTitle>
                  </div>
                  <CardDescription>{selectedEndpoint.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="parameters" className="w-full">
                    <TabsList>
                      <TabsTrigger value="parameters">Parameters</TabsTrigger>
                      <TabsTrigger value="example">Example</TabsTrigger>
                      <TabsTrigger value="response">Response</TabsTrigger>
                      <TabsTrigger value="code">Code</TabsTrigger>
                    </TabsList>

                    <TabsContent value="parameters" className="space-y-4">
                      {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 ? (
                        <div className="space-y-4">
                          {selectedEndpoint.parameters.map((param, idx) => (
                            <div key={idx} className="border rounded-lg p-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                  {param.name}
                                </code>
                                <Badge variant="outline" className="text-xs">
                                  {param.type}
                                </Badge>
                                {param.required && (
                                  <Badge variant="destructive" className="text-xs">
                                    required
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {param.description}
                              </p>
                              {param.example && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Example: </span>
                                  <code className="bg-muted px-1 py-0.5 rounded">
                                    {typeof param.example === 'string' ? param.example : JSON.stringify(param.example)}
                                  </code>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No parameters required</p>
                      )}
                    </TabsContent>

                    <TabsContent value="example" className="space-y-4">
                      {selectedEndpoint.example && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Request</h4>
                            <div className="relative">
                              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                <code>{JSON.stringify(selectedEndpoint.example.request, null, 2)}</code>
                              </pre>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(JSON.stringify(selectedEndpoint.example!.request, null, 2))}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Response</h4>
                            <div className="relative">
                              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                <code>{JSON.stringify(selectedEndpoint.example.response, null, 2)}</code>
                              </pre>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(JSON.stringify(selectedEndpoint.example!.response, null, 2))}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="response" className="space-y-4">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Success Response</h4>
                          <div className="space-y-2">
                            <Badge className="bg-green-100 text-green-700">200 OK</Badge>
                            <p className="text-sm text-muted-foreground">
                              Request completed successfully
                            </p>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <h4 className="font-medium mb-2">Error Responses</h4>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <Badge className="bg-yellow-100 text-yellow-700">400</Badge>
                              <span className="text-sm">Bad Request - Invalid parameters</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge className="bg-red-100 text-red-700">401</Badge>
                              <span className="text-sm">Unauthorized - Invalid API key</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge className="bg-red-100 text-red-700">404</Badge>
                              <span className="text-sm">Not Found - Resource not found</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge className="bg-red-100 text-red-700">500</Badge>
                              <span className="text-sm">Internal Server Error</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="code" className="space-y-4">
                      <div className="space-y-4">
                        <Tabs defaultValue="curl" className="w-full">
                          <TabsList>
                            <TabsTrigger value="curl">cURL</TabsTrigger>
                            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                            <TabsTrigger value="python">Python</TabsTrigger>
                            <TabsTrigger value="node">Node.js</TabsTrigger>
                          </TabsList>

                          <TabsContent value="curl">
                            <div className="relative">
                              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                <code>{`curl -X ${selectedEndpoint.method} \\
  "https://api.ojastack.tech${selectedEndpoint.path}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"${selectedEndpoint.method !== 'GET' ? ` \\
  -d '${JSON.stringify(selectedEndpoint.example?.request || {}, null, 2)}'` : ""}`}</code>
                              </pre>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(`curl -X ${selectedEndpoint.method} "https://api.ojastack.tech${selectedEndpoint.path}" -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json"`)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TabsContent>

                          <TabsContent value="javascript">
                            <div className="relative">
                              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                <code>{`const response = await fetch('https://api.ojastack.tech${selectedEndpoint.path}', {
  method: '${selectedEndpoint.method}',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }${selectedEndpoint.method !== 'GET' ? `,
  body: JSON.stringify(${JSON.stringify(selectedEndpoint.example?.request || {}, null, 2)})` : ""}
});

const data = await response.json();
console.log(data);`}</code>
                              </pre>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(`const response = await fetch('https://api.ojastack.tech${selectedEndpoint.path}', { method: '${selectedEndpoint.method}', headers: { 'Authorization': 'Bearer YOUR_API_KEY', 'Content-Type': 'application/json' } });`)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TabsContent>

                          <TabsContent value="python">
                            <div className="relative">
                              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                <code>{`import requests

url = "https://api.ojastack.tech${selectedEndpoint.path}"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
${selectedEndpoint.method !== 'GET' ? `data = ${JSON.stringify(selectedEndpoint.example?.request || {}, null, 2)}

response = requests.${selectedEndpoint.method.toLowerCase()}(url, headers=headers, json=data)` : `response = requests.${selectedEndpoint.method.toLowerCase()}(url, headers=headers)`}
print(response.json())`}</code>
                              </pre>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(`import requests\n\nurl = "https://api.ojastack.tech${selectedEndpoint.path}"\nheaders = {"Authorization": "Bearer YOUR_API_KEY", "Content-Type": "application/json"}`)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TabsContent>

                          <TabsContent value="node">
                            <div className="relative">
                              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                <code>{`const axios = require('axios');

const config = {
  method: '${selectedEndpoint.method.toLowerCase()}',
  url: 'https://api.ojastack.tech${selectedEndpoint.path}',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }${selectedEndpoint.method !== 'GET' ? `,
  data: ${JSON.stringify(selectedEndpoint.example?.request || {}, null, 2)}` : ""}
};

axios(config)
  .then((response) => {
    console.log(response.data);
  })
  .catch((error) => {
    console.log(error);
  });`}</code>
                              </pre>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(`const axios = require('axios'); axios({ method: '${selectedEndpoint.method.toLowerCase()}', url: 'https://api.ojastack.tech${selectedEndpoint.path}', headers: { 'Authorization': 'Bearer YOUR_API_KEY' } })`)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TabsContent>
                        </Tabs>

                        <div className="flex items-center space-x-2">
                          <Button variant="outline" disabled={!apiKey}>
                            <Play className="h-4 w-4 mr-2" />
                            Try It Out
                          </Button>
                          {!apiKey && (
                            <p className="text-xs text-muted-foreground">
                              Enter an API key to test this endpoint
                            </p>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
  );
}
