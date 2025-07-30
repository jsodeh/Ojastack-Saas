import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search,
  BookOpen,
  MessageCircle,
  Phone,
  Mail,
  ArrowRight,
  ExternalLink,
  Clock,
  Users,
  FileText,
  Video,
  Headphones,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Zap,
  Shield,
  Settings,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    {
      id: "getting-started",
      title: "Getting Started",
      description: "Everything you need to know to start using Ojastack",
      icon: BookOpen,
      color: "bg-blue-100 text-blue-700",
      articles: [
        { title: "Creating Your First AI Agent", views: "15.2k", time: "5 min read" },
        { title: "Setting Up Your Dashboard", views: "12.8k", time: "3 min read" },
        { title: "Understanding Agent Types", views: "9.5k", time: "7 min read" },
        { title: "Connecting Your First Integration", views: "8.1k", time: "4 min read" }
      ]
    },
    {
      id: "integrations",
      title: "Integrations",
      description: "Connect Ojastack with your favorite tools",
      icon: Settings,
      color: "bg-green-100 text-green-700",
      articles: [
        { title: "WhatsApp Business Integration", views: "18.7k", time: "8 min read" },
        { title: "Zendesk Setup Guide", views: "14.3k", time: "6 min read" },
        { title: "Slack Bot Configuration", views: "11.9k", time: "5 min read" },
        { title: "Telegram Bot Setup", views: "9.8k", time: "4 min read" }
      ]
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      description: "Common issues and how to resolve them",
      icon: AlertCircle,
      color: "bg-orange-100 text-orange-700",
      articles: [
        { title: "Agent Not Responding to Messages", views: "22.1k", time: "3 min read" },
        { title: "API Rate Limit Errors", views: "16.5k", time: "4 min read" },
        { title: "Integration Connection Failed", views: "13.7k", time: "5 min read" },
        { title: "Knowledge Base Not Loading", views: "10.2k", time: "3 min read" }
      ]
    },
    {
      id: "billing",
      title: "Billing & Account",
      description: "Manage your subscription and account settings",
      icon: Users,
      color: "bg-purple-100 text-purple-700",
      articles: [
        { title: "Understanding Usage Limits", views: "19.3k", time: "4 min read" },
        { title: "Upgrading Your Plan", views: "15.8k", time: "3 min read" },
        { title: "Managing Team Members", views: "12.4k", time: "5 min read" },
        { title: "Canceling Your Subscription", views: "8.9k", time: "2 min read" }
      ]
    },
    {
      id: "api-guides",
      title: "API & Development",
      description: "Technical guides for developers",
      icon: FileText,
      color: "bg-indigo-100 text-indigo-700",
      articles: [
        { title: "Authentication & API Keys", views: "21.5k", time: "6 min read" },
        { title: "Webhook Setup Guide", views: "17.2k", time: "8 min read" },
        { title: "SDK Installation & Usage", views: "14.6k", time: "10 min read" },
        { title: "Error Handling Best Practices", views: "11.3k", time: "7 min read" }
      ]
    },
    {
      id: "security",
      title: "Security & Privacy",
      description: "Keep your data safe and compliant",
      icon: Shield,
      color: "bg-red-100 text-red-700",
      articles: [
        { title: "Data Security Overview", views: "13.8k", time: "5 min read" },
        { title: "GDPR Compliance Guide", views: "10.4k", time: "6 min read" },
        { title: "SOC 2 Certification", views: "8.7k", time: "4 min read" },
        { title: "Managing Data Retention", views: "7.2k", time: "3 min read" }
      ]
    }
  ];

  const popularArticles = [
    { title: "How to Create Your First AI Agent", category: "Getting Started", views: "25.1k" },
    { title: "WhatsApp Business Integration Guide", category: "Integrations", views: "18.7k" },
    { title: "Understanding Agent Response Times", category: "Troubleshooting", views: "17.3k" },
    { title: "API Authentication Setup", category: "Development", views: "16.8k" },
    { title: "Managing Your Team and Permissions", category: "Account", views: "15.2k" }
  ];

  const recentUpdates = [
    { title: "New Telegram Integration Available", date: "2 days ago", type: "feature" },
    { title: "Updated WhatsApp API Documentation", date: "1 week ago", type: "update" },
    { title: "Voice Agent Beta Release", date: "2 weeks ago", type: "feature" },
    { title: "Enhanced Security Features", date: "3 weeks ago", type: "security" }
  ];

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

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-gradient-via/5 to-gradient-to/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6">
              Help Center
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
              How can we
              <span className="bg-gradient-to-r from-primary to-gradient-to bg-clip-text text-transparent"> help you?</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Find answers to common questions, browse our guides, or get in touch with our support team.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search for help articles, guides, and tutorials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg"
              />
              <Button className="absolute right-2 top-2" size="sm">
                Search
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Support Options */}
      <section className="py-12 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Live Chat</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Chat with our support team
                </p>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Online
                </Badge>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Email Support</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get help via email
                </p>
                <Badge variant="secondary">
                  Response in 4 hours
                </Badge>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Video className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Video Tutorials</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Watch step-by-step guides
                </p>
                <Badge variant="secondary">
                  50+ tutorials
                </Badge>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-semibold mb-2">Phone Support</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Call our support line
                </p>
                <Badge variant="secondary">
                  Enterprise only
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Help Categories */}
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-bold mb-8">Browse by Category</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map((category) => (
                  <Card key={category.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${category.color}`}>
                          <category.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{category.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {category.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {category.articles.map((article, index) => (
                          <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium">{article.title}</h4>
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                                <span>{article.views} views</span>
                                <span>•</span>
                                <span>{article.time}</span>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        <Button variant="outline" size="sm" className="w-full">
                          View All Articles
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Popular Articles */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Popular Articles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {popularArticles.map((article, index) => (
                      <div key={index} className="flex items-start space-x-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-semibold text-primary">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium line-clamp-2">{article.title}</h4>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                            <Badge variant="outline" className="text-xs">
                              {article.category}
                            </Badge>
                            <span>{article.views} views</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Updates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Recent Updates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentUpdates.map((update, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          update.type === 'feature' ? 'bg-blue-500' :
                          update.type === 'security' ? 'bg-red-500' :
                          'bg-green-500'
                        }`}></div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{update.title}</h4>
                          <p className="text-xs text-muted-foreground">{update.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Support */}
              <Card className="bg-gradient-to-r from-primary/10 to-gradient-to/10">
                <CardContent className="p-6 text-center">
                  <Headphones className="h-8 w-8 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Still need help?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Our support team is ready to assist you
                  </p>
                  <Link to="/contact">
                    <Button className="w-full">
                      Contact Support
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <Link to="/">
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-gradient-to bg-clip-text text-transparent">
                  Ojastack
                </span>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">
                Empowering businesses with intelligent AI agents for better customer experiences.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/features" className="text-muted-foreground hover:text-foreground">Features</Link></li>
                <li><Link to="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link></li>
                <li><Link to="/integrations" className="text-muted-foreground hover:text-foreground">Integrations</Link></li>
                <li><Link to="/api" className="text-muted-foreground hover:text-foreground">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="text-muted-foreground hover:text-foreground">About</Link></li>
                <li><Link to="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link></li>
                <li><Link to="/careers" className="text-muted-foreground hover:text-foreground">Careers</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/docs" className="text-muted-foreground hover:text-foreground">Documentation</Link></li>
                <li><Link to="/help" className="text-muted-foreground hover:text-foreground">Help Center</Link></li>
                <li><Link to="/status" className="text-muted-foreground hover:text-foreground">Status</Link></li>
                <li><Link to="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              © 2024 Ojastack. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
