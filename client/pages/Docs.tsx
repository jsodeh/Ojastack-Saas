import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Search,
  Copy,
  MessageCircle,
  BookOpen,
  Code,
  Zap,
  Settings,
  Users,
  ArrowRight,
  ExternalLink,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  FileText,
  Terminal,
  Sparkles,
  User
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

export default function Docs() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(["getting-started"]);
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
      description: "AI assistant is preparing to help with this section",
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const sidebarSections = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: BookOpen,
      items: [
        { id: "overview", title: "Overview" },
        { id: "quick-start", title: "Quick Start" },
        { id: "authentication", title: "Authentication" },
        { id: "your-first-agent", title: "Your First Agent" },
        { id: "dashboard-tour", title: "Dashboard Tour" },
        { id: "basic-concepts", title: "Basic Concepts" }
      ]
    },
    {
      id: "api-reference",
      title: "API Reference",
      icon: Code,
      items: [
        { id: "rest-api", title: "REST API" },
        { id: "webhooks", title: "Webhooks" },
        { id: "sdks", title: "SDKs" },
        { id: "rate-limits", title: "Rate Limits" },
        { id: "error-codes", title: "Error Codes" },
        { id: "postman-collection", title: "Postman Collection" }
      ]
    },
    {
      id: "agents",
      title: "AI Agents",
      icon: Zap,
      items: [
        { id: "chat-agents", title: "Chat Agents" },
        { id: "voice-agents", title: "Voice Agents" },
        { id: "vision-agents", title: "Vision Agents" },
        { id: "custom-agents", title: "Custom Agents" },
        { id: "agent-training", title: "Agent Training" },
        { id: "agent-analytics", title: "Agent Analytics" },
        { id: "agent-handoffs", title: "Human Handoffs" }
      ]
    },
    {
      id: "integrations",
      title: "Integrations",
      icon: Settings,
      items: [
        { id: "messaging-platforms", title: "Messaging Platforms" },
        { id: "crm-systems", title: "CRM Systems" },
        { id: "ecommerce-platforms", title: "E-commerce Platforms" },
        { id: "zendesk", title: "Zendesk" },
        { id: "salesforce", title: "Salesforce" },
        { id: "slack", title: "Slack" },
        { id: "whatsapp", title: "WhatsApp Business" },
        { id: "telegram", title: "Telegram" },
        { id: "custom-integration", title: "Custom Integration" }
      ]
    },
    {
      id: "guides",
      title: "Guides & Tutorials",
      icon: Users,
      items: [
        { id: "training-agents", title: "Training Your Agents" },
        { id: "knowledge-management", title: "Knowledge Management" },
        { id: "conversation-flows", title: "Conversation Flows" },
        { id: "multi-language", title: "Multi-language Support" },
        { id: "security-compliance", title: "Security & Compliance" },
        { id: "best-practices", title: "Best Practices" },
        { id: "troubleshooting", title: "Troubleshooting" },
        { id: "migration", title: "Migration Guide" },
        { id: "performance-optimization", title: "Performance Optimization" }
      ]
    },
    {
      id: "use-cases",
      title: "Use Cases",
      icon: FileText,
      items: [
        { id: "customer-support", title: "Customer Support" },
        { id: "sales-automation", title: "Sales Automation" },
        { id: "lead-qualification", title: "Lead Qualification" },
        { id: "order-tracking", title: "Order Tracking" },
        { id: "appointment-booking", title: "Appointment Booking" },
        { id: "faq-automation", title: "FAQ Automation" }
      ]
    },
    {
      id: "advanced",
      title: "Advanced Topics",
      icon: Settings,
      items: [
        { id: "custom-models", title: "Custom AI Models" },
        { id: "enterprise-deployment", title: "Enterprise Deployment" },
        { id: "white-label", title: "White-label Solutions" },
        { id: "analytics-reporting", title: "Analytics & Reporting" },
        { id: "scaling-production", title: "Scaling to Production" },
        { id: "disaster-recovery", title: "Disaster Recovery" }
      ]
    }
  ];

  const codeExamples = {
    curl: `curl -X POST https://api.ojastack.tech/v1/agents \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Customer Support Agent",
    "type": "chat",
    "knowledge_base": "customer-support-kb",
    "settings": {
      "temperature": 0.7,
      "max_tokens": 500
    }
  }'`,
    javascript: `import { OjastackClient } from '@ojastack/sdk';

const client = new OjastackClient({
  apiKey: process.env.OJASTACK_API_KEY
});

const agent = await client.agents.create({
  name: 'Customer Support Agent',
  type: 'chat',
  knowledgeBase: 'customer-support-kb',
  settings: {
    temperature: 0.7,
    maxTokens: 500
  }
});

console.log('Agent created:', agent.id);`,
    python: `from ojastack import OjastackClient

client = OjastackClient(api_key="YOUR_API_KEY")

agent = client.agents.create(
    name="Customer Support Agent",
    type="chat",
    knowledge_base="customer-support-kb",
    settings={
        "temperature": 0.7,
        "max_tokens": 500
    }
)

print(f"Agent created: {agent.id}")`
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
                  <Link to="/docs" className="text-foreground px-3 py-2 rounded-md text-sm font-medium border-b-2 border-primary">Docs</Link>
                  <Link to="/contact" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium">Contact</Link>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <Button variant="ghost" asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/dashboard/settings/profile">
                      <User className="h-4 w-4 mr-2" />
                      My Account
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 border-r bg-muted/30 min-h-screen">
          <div className="p-6">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-2">
                {sidebarSections.map((section) => (
                  <div key={section.id}>
                    <Button
                      variant="ghost"
                      onClick={() => toggleSection(section.id)}
                      className="w-full justify-start p-2 h-auto"
                    >
                      {expandedSections.includes(section.id) ? (
                        <ChevronDown className="h-4 w-4 mr-2" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-2" />
                      )}
                      <section.icon className="h-4 w-4 mr-2" />
                      <span className="font-medium">{section.title}</span>
                    </Button>
                    
                    {expandedSections.includes(section.id) && (
                      <div className="ml-8 space-y-1 mt-2">
                        {section.items.map((item) => (
                          <Button
                            key={item.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-muted-foreground hover:text-foreground"
                          >
                            {item.title}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
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
                <span>Getting Started</span>
                <ChevronRight className="h-4 w-4" />
                <span>Quick Start</span>
              </div>
              
              <h1 className="text-4xl font-bold mb-4">Quick Start Guide</h1>
              <p className="text-xl text-muted-foreground mb-6">
                Get up and running with Ojastack in less than 5 minutes. Create your first AI agent and start automating customer interactions.
              </p>
              
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => askAI("Quick Start Guide")}
                  className="text-sm"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Ask AI about this page
                </Button>
                <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Updated 2 days ago
                </Badge>
              </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-12">
              {/* Prerequisites */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold">Prerequisites</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => askAI("Prerequisites section")}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
                <Card>
                  <CardContent className="p-6">
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <div>
                          <strong>Ojastack Account:</strong> <Link to="/signup" className="text-primary hover:underline">Sign up for a free account</Link>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <div>
                          <strong>API Key:</strong> Generate your API key from the dashboard
                        </div>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <div>
                          <strong>Knowledge Base:</strong> Prepare your documentation or FAQ content
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* Step 1 */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold">Step 1: Authentication</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => askAI("Authentication step")}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground mb-6">
                  First, you'll need to authenticate with the Ojastack API using your API key.
                </p>
                
                <Tabs defaultValue="curl" className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <TabsList>
                      <TabsTrigger value="curl">cURL</TabsTrigger>
                      <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                      <TabsTrigger value="python">Python</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  {Object.entries(codeExamples).map(([lang, code]) => (
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
                            onClick={() => copyToClipboard(code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{code}</code>
                          </pre>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              </section>

              {/* Step 2 */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold">Step 2: Create Knowledge Base</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => askAI("Knowledge base creation")}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground mb-6">
                  Upload your documentation, FAQs, or training materials to create a knowledge base for your agent.
                </p>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Supported File Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm">PDF</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm">Word</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm">Markdown</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm">Text</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Step 3 */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold">Step 3: Deploy Your Agent</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => askAI("Agent deployment")}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground mb-6">
                  Once your agent is created and trained, deploy it to your website, app, or communication channels.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Website Widget</CardTitle>
                      <CardDescription>Add a chat widget to your website</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm" className="w-full">
                        Get Widget Code
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">API Integration</CardTitle>
                      <CardDescription>Integrate via REST API</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm" className="w-full">
                        View API Docs
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Platform Connect</CardTitle>
                      <CardDescription>Connect to Slack, Teams, etc.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm" className="w-full">
                        View Integrations
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Next Steps */}
              <section>
                <h2 className="text-2xl font-semibold mb-6">Next Steps</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Settings className="h-5 w-5 mr-2" />
                        Advanced Configuration
                      </CardTitle>
                      <CardDescription>
                        Learn about advanced agent settings and customization options
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="ghost" className="p-0 h-auto">
                        Read Guide
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Best Practices
                      </CardTitle>
                      <CardDescription>
                        Tips and tricks for optimal agent performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="ghost" className="p-0 h-auto">
                        View Tips
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </section>
            </div>

            {/* Footer Navigation */}
            <div className="flex justify-between items-center pt-12 mt-12 border-t">
              <div>
                <Button variant="ghost" className="p-0">
                  <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                  Previous: Overview
                </Button>
              </div>
              <div>
                <Button variant="ghost" className="p-0">
                  Next: Authentication
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
