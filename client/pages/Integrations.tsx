import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Search,
  ArrowRight,
  ExternalLink,
  Check,
  MessageSquare,
  Phone,
  ShoppingCart,
  Mail,
  BarChart3,
  Settings,
  Users,
  Cloud,
  Database,
  Zap,
  Globe,
  Headphones,
  Calendar,
  FileText,
  CreditCard,
  Bot,
  Smartphone,
  Video,
  Building,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Integrations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const integrations = [
    // Messaging & Communication
    {
      name: "WhatsApp Business",
      category: "messaging",
      description: "Connect with customers on WhatsApp",
      logo: "💬",
      featured: true,
      verified: true,
      setup: "5 minutes",
      features: [
        "Rich messaging",
        "Media sharing",
        "Broadcast lists",
        "Business profiles",
      ],
    },
    {
      name: "Telegram",
      category: "messaging",
      description: "Deploy bots on Telegram channels",
      logo: "✈️",
      featured: true,
      verified: true,
      setup: "3 minutes",
      features: [
        "Bot API",
        "Inline keyboards",
        "File sharing",
        "Channel support",
      ],
    },
    {
      name: "Facebook Messenger",
      category: "messaging",
      description: "Automate Facebook Messenger conversations",
      logo: "📘",
      featured: true,
      verified: true,
      setup: "5 minutes",
      features: [
        "Rich cards",
        "Quick replies",
        "Persistent menu",
        "Handover protocol",
      ],
    },
    {
      name: "Instagram Direct",
      category: "messaging",
      description: "Handle Instagram DMs automatically",
      logo: "📷",
      featured: false,
      verified: true,
      setup: "10 minutes",
      features: [
        "Story replies",
        "Post comments",
        "Direct messages",
        "Media responses",
      ],
    },
    {
      name: "Discord",
      category: "messaging",
      description: "Create Discord bots for communities",
      logo: "🎮",
      featured: false,
      verified: true,
      setup: "5 minutes",
      features: [
        "Slash commands",
        "Voice integration",
        "Role management",
        "Server moderation",
      ],
    },
    {
      name: "Slack",
      category: "messaging",
      description: "Workplace collaboration and support",
      logo: "⚡",
      featured: true,
      verified: true,
      setup: "3 minutes",
      features: [
        "Slash commands",
        "Interactive buttons",
        "Workflow automation",
        "Channel notifications",
      ],
    },
    {
      name: "Microsoft Teams",
      category: "messaging",
      description: "Enterprise communication platform",
      logo: "👥",
      featured: true,
      verified: true,
      setup: "5 minutes",
      features: [
        "Bot framework",
        "Adaptive cards",
        "Meeting integration",
        "Tab applications",
      ],
    },
    {
      name: "SMS/Twilio",
      category: "messaging",
      description: "Text message automation",
      logo: "📱",
      featured: true,
      verified: true,
      setup: "5 minutes",
      features: [
        "Global SMS",
        "MMS support",
        "Two-way messaging",
        "Delivery tracking",
      ],
    },

    // Voice & Call Center
    {
      name: "Twilio Voice",
      category: "voice",
      description: "Voice call automation and IVR",
      logo: "📞",
      featured: true,
      verified: true,
      setup: "10 minutes",
      features: [
        "IVR systems",
        "Call recording",
        "Conference calls",
        "SIP support",
      ],
    },
    {
      name: "Vonage",
      category: "voice",
      description: "Global voice communications",
      logo: "🌍",
      featured: false,
      verified: true,
      setup: "15 minutes",
      features: [
        "Voice API",
        "Text-to-speech",
        "Speech recognition",
        "Number porting",
      ],
    },
    {
      name: "Amazon Connect",
      category: "voice",
      description: "Cloud contact center platform",
      logo: "☁️",
      featured: true,
      verified: true,
      setup: "20 minutes",
      features: [
        "Omnichannel",
        "Real-time analytics",
        "Workforce management",
        "AI-powered insights",
      ],
    },

    // CRM & Support
    {
      name: "Salesforce",
      category: "crm",
      description: "World's leading CRM platform",
      logo: "☁️",
      featured: true,
      verified: true,
      setup: "15 minutes",
      features: [
        "Contact sync",
        "Case management",
        "Workflow automation",
        "Custom fields",
      ],
    },
    {
      name: "HubSpot",
      category: "crm",
      description: "Inbound marketing and sales platform",
      logo: "🧲",
      featured: true,
      verified: true,
      setup: "10 minutes",
      features: [
        "Lead scoring",
        "Email sequences",
        "Deal tracking",
        "Contact enrichment",
      ],
    },
    {
      name: "Zendesk",
      category: "crm",
      description: "Customer service platform",
      logo: "🎧",
      featured: true,
      verified: true,
      setup: "5 minutes",
      features: [
        "Ticket sync",
        "Agent handoff",
        "SLA tracking",
        "Knowledge base",
      ],
    },
    {
      name: "Intercom",
      category: "crm",
      description: "Conversational customer platform",
      logo: "💬",
      featured: true,
      verified: true,
      setup: "5 minutes",
      features: [
        "Live chat",
        "Product tours",
        "Customer data",
        "Automation rules",
      ],
    },
    {
      name: "Freshworks",
      category: "crm",
      description: "Customer experience software",
      logo: "🍃",
      featured: false,
      verified: true,
      setup: "10 minutes",
      features: [
        "Multi-channel",
        "AI insights",
        "Marketplace",
        "Collaboration tools",
      ],
    },
    {
      name: "Pipedrive",
      category: "crm",
      description: "Sales-focused CRM",
      logo: "🔧",
      featured: false,
      verified: true,
      setup: "10 minutes",
      features: [
        "Pipeline management",
        "Activity reminders",
        "Email sync",
        "Mobile app",
      ],
    },

    // E-commerce
    {
      name: "Shopify",
      category: "ecommerce",
      description: "Leading e-commerce platform",
      logo: "🛍️",
      featured: true,
      verified: true,
      setup: "10 minutes",
      features: [
        "Order tracking",
        "Inventory sync",
        "Customer data",
        "Abandoned cart recovery",
      ],
    },
    {
      name: "WooCommerce",
      category: "ecommerce",
      description: "WordPress e-commerce plugin",
      logo: "🛒",
      featured: true,
      verified: true,
      setup: "15 minutes",
      features: [
        "Product sync",
        "Order management",
        "Customer support",
        "Analytics integration",
      ],
    },
    {
      name: "Magento",
      category: "ecommerce",
      description: "Enterprise e-commerce solution",
      logo: "🏪",
      featured: false,
      verified: true,
      setup: "20 minutes",
      features: [
        "B2B features",
        "Multi-store",
        "Advanced catalog",
        "Custom attributes",
      ],
    },
    {
      name: "BigCommerce",
      category: "ecommerce",
      description: "Enterprise e-commerce platform",
      logo: "🏬",
      featured: false,
      verified: true,
      setup: "15 minutes",
      features: [
        "API-first",
        "Multi-channel",
        "Built-in features",
        "No transaction fees",
      ],
    },

    // Analytics & Automation
    {
      name: "Google Analytics",
      category: "analytics",
      description: "Web analytics and insights",
      logo: "📊",
      featured: true,
      verified: true,
      setup: "5 minutes",
      features: [
        "Conversation tracking",
        "Goal conversion",
        "Custom events",
        "Attribution modeling",
      ],
    },
    {
      name: "Mixpanel",
      category: "analytics",
      description: "Product analytics platform",
      logo: "📈",
      featured: false,
      verified: true,
      setup: "10 minutes",
      features: [
        "Event tracking",
        "Funnel analysis",
        "Cohort analysis",
        "A/B testing",
      ],
    },
    {
      name: "Zapier",
      category: "automation",
      description: "Connect apps and automate workflows",
      logo: "⚡",
      featured: true,
      verified: true,
      setup: "3 minutes",
      features: [
        "5000+ app connections",
        "Multi-step workflows",
        "Conditional logic",
        "Custom webhooks",
      ],
    },
    {
      name: "Make (Integromat)",
      category: "automation",
      description: "Advanced automation platform",
      logo: "🔄",
      featured: true,
      verified: true,
      setup: "10 minutes",
      features: [
        "Visual automation",
        "Complex workflows",
        "Data transformation",
        "Error handling",
      ],
    },

    // Payments
    {
      name: "Stripe",
      category: "payments",
      description: "Online payment processing",
      logo: "💳",
      featured: true,
      verified: true,
      setup: "10 minutes",
      features: [
        "Payment links",
        "Subscription billing",
        "Invoice automation",
        "Dispute handling",
      ],
    },
    {
      name: "PayPal",
      category: "payments",
      description: "Global payment platform",
      logo: "💰",
      featured: true,
      verified: true,
      setup: "10 minutes",
      features: [
        "Express checkout",
        "Recurring payments",
        "Marketplace payments",
        "Mobile payments",
      ],
    },

    // Productivity
    {
      name: "Notion",
      category: "productivity",
      description: "All-in-one workspace",
      logo: "📝",
      featured: false,
      verified: true,
      setup: "10 minutes",
      features: [
        "Database sync",
        "Page creation",
        "Template automation",
        "Team collaboration",
      ],
    },
    {
      name: "Airtable",
      category: "productivity",
      description: "Database and collaboration platform",
      logo: "📋",
      featured: false,
      verified: true,
      setup: "10 minutes",
      features: [
        "Record creation",
        "Field updates",
        "View filtering",
        "Automation triggers",
      ],
    },
    {
      name: "Calendly",
      category: "productivity",
      description: "Appointment scheduling platform",
      logo: "📅",
      featured: false,
      verified: true,
      setup: "5 minutes",
      features: [
        "Meeting booking",
        "Calendar sync",
        "Automated reminders",
        "Custom questions",
      ],
    },
  ];

  const categories = [
    {
      id: "all",
      name: "All Integrations",
      icon: Globe,
      count: integrations.length,
    },
    {
      id: "messaging",
      name: "Messaging",
      icon: MessageSquare,
      count: integrations.filter((i) => i.category === "messaging").length,
    },
    {
      id: "voice",
      name: "Voice & Calling",
      icon: Phone,
      count: integrations.filter((i) => i.category === "voice").length,
    },
    {
      id: "crm",
      name: "CRM & Support",
      icon: Users,
      count: integrations.filter((i) => i.category === "crm").length,
    },
    {
      id: "ecommerce",
      name: "E-commerce",
      icon: ShoppingCart,
      count: integrations.filter((i) => i.category === "ecommerce").length,
    },
    {
      id: "analytics",
      name: "Analytics",
      icon: BarChart3,
      count: integrations.filter((i) => i.category === "analytics").length,
    },
    {
      id: "automation",
      name: "Automation",
      icon: Zap,
      count: integrations.filter((i) => i.category === "automation").length,
    },
    {
      id: "payments",
      name: "Payments",
      icon: CreditCard,
      count: integrations.filter((i) => i.category === "payments").length,
    },
    {
      id: "productivity",
      name: "Productivity",
      icon: FileText,
      count: integrations.filter((i) => i.category === "productivity").length,
    },
  ];

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesCategory =
      selectedCategory === "all" || integration.category === selectedCategory;
    const matchesSearch =
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredIntegrations = integrations.filter((i) => i.featured);

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
                  <Link
                    to="/features"
                    className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Features
                  </Link>
                  <Link
                    to="/pricing"
                    className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Pricing
                  </Link>
                  <Link
                    to="/docs"
                    className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Docs
                  </Link>
                  <Link
                    to="/contact"
                    className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Contact
                  </Link>
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
              200+ Integrations Available
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
              Connect Ojastack with
              <span className="bg-gradient-to-r from-primary to-gradient-to bg-clip-text text-transparent">
                {" "}
                Your Favorite Tools
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Seamlessly integrate with messaging platforms, CRM systems,
              e-commerce stores, and productivity tools to create a unified
              customer experience.
            </p>

            {/* Search Bar */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Integrations */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Featured Integrations</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our most popular integrations, loved by thousands of businesses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredIntegrations.slice(0, 8).map((integration, index) => (
              <Card
                key={index}
                className="hover:shadow-lg transition-all duration-300 group cursor-pointer"
              >
                <CardHeader className="text-center pb-2">
                  <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4 text-3xl group-hover:scale-110 transition-transform">
                    {integration.logo}
                  </div>
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <CardTitle className="text-lg">
                      {integration.name}
                    </CardTitle>
                    {integration.verified && (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700 text-xs"
                      >
                        ✓ Verified
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-sm">
                    {integration.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-3">
                      Setup: {integration.setup}
                    </div>
                    <Button className="w-full" size="sm">
                      Connect Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* All Integrations */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">All Integrations</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Browse our complete catalog of integrations
            </p>
          </div>

          <Tabs
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            className="w-full"
          >
            <div className="mb-8">
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="flex flex-col items-center space-y-2 h-auto py-4 px-6 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all hover:scale-105 border border-border data-[state=active]:border-primary shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center space-x-2">
                      <category.icon className="h-5 w-5" />
                      <span className="font-medium whitespace-nowrap">
                        {category.name}
                      </span>
                    </div>
                    <Badge
                      variant={
                        selectedCategory === category.id
                          ? "secondary"
                          : "outline"
                      }
                      className={`text-xs font-semibold ${selectedCategory === category.id ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30" : "bg-muted"}`}
                    >
                      {category.count}
                    </Badge>
                  </TabsTrigger>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIntegrations.map((integration, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-2xl">
                          {integration.logo}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <CardTitle className="text-lg">
                              {integration.name}
                            </CardTitle>
                            {integration.verified && (
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-700 text-xs"
                              >
                                ✓
                              </Badge>
                            )}
                            {integration.featured && (
                              <Star className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <CardDescription className="text-sm">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Setup time:
                        </span>
                        <span className="font-medium">{integration.setup}</span>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Key Features:</div>
                        <div className="grid grid-cols-2 gap-1">
                          {integration.features
                            .slice(0, 4)
                            .map((feature, idx) => (
                              <div
                                key={idx}
                                className="flex items-center text-xs text-muted-foreground"
                              >
                                <Check className="h-3 w-3 text-green-500 mr-1" />
                                <span>{feature}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="flex space-x-2 pt-2">
                        <Button className="flex-1" size="sm">
                          Connect
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredIntegrations.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">
                  No integrations found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or category filter
                </p>
              </div>
            )}
          </Tabs>
        </div>
      </section>

      {/* Custom Integration CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-r from-primary/10 to-gradient-to/10 rounded-2xl p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <Settings className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4">
              Need a Custom Integration?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Don't see your platform? Our team can build custom integrations to
              connect Ojastack with any system you use.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button size="lg" className="text-lg px-8">
                  Request Integration
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/docs/api">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  View API Docs
                  <ExternalLink className="ml-2 h-5 w-5" />
                </Button>
              </Link>
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
                Empowering businesses with intelligent AI agents for better
                customer experiences.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">
                Product
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/features"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pricing"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    to="/integrations"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link
                    to="/api"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    API
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">
                Company
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/about"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    to="/blog"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    to="/careers"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">
                Support
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/docs"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    to="/help"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    to="/status"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Status
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Privacy
                  </Link>
                </li>
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
