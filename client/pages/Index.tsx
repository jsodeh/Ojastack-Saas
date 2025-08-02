import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Phone,
  Eye,
  Users,
  Headphones,
  ArrowRight,
  Check,
  Star,
  Zap,
  Shield,
  BarChart3,
  Bot,
  Globe,
  Smartphone,
  Clock,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Play
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export default function Index() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  Ojastack
                </span>
              </div>
              <div className="hidden md:block ml-10">
                <div className="flex items-baseline space-x-4">
                  <Link to="/features" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors">Features</Link>
                  <Link to="/pricing" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors">Pricing</Link>
                  <Link to="/docs" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors">Docs</Link>
                  <Link to="/contact" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors">Contact</Link>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {loading ? (
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-8 bg-muted animate-pulse rounded"></div>
                  <div className="w-24 h-8 bg-muted animate-pulse rounded"></div>
                </div>
              ) : user ? (
                <div className="flex items-center space-x-4">
                  <Button variant="ghost" asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/dashboard/agents">My Agents</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Button variant="ghost" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-24 sm:pb-20">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="w-3 h-3 mr-1" />
              AI-Powered Customer Engagement
            </Badge>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6">
              Build Intelligent
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent block">
                AI Agents
              </span>
              in Minutes
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Create, deploy, and manage AI-powered conversational agents that understand your customers,
              integrate with your tools, and deliver exceptional experiences across every channel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/signup">
                  Start Building Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>
            <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                No credit card required
              </div>
              <div className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                5-minute setup
              </div>
              <div className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                Free forever plan
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Preview */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-3xl blur-3xl"></div>
            <div className="relative bg-background border rounded-3xl p-2 shadow-2xl">
              <div className="bg-muted/50 rounded-2xl p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <Badge variant="outline" className="mb-4">
                      <Bot className="w-3 h-3 mr-1" />
                      Live Dashboard
                    </Badge>
                    <h3 className="text-2xl font-bold mb-4">
                      Monitor your AI agents in real-time
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Get instant insights into conversations, performance metrics, and customer satisfaction.
                      Track everything from response times to conversion rates.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-3" />
                        <span className="text-sm">Real-time conversation monitoring</span>
                      </div>
                      <div className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-3" />
                        <span className="text-sm">Performance analytics & insights</span>
                      </div>
                      <div className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-3" />
                        <span className="text-sm">Multi-channel conversation history</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="bg-background rounded-xl border shadow-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Agent Performance</h4>
                        <Badge variant="secondary">Live</Badge>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Active Conversations</span>
                          <span className="font-semibold">247</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Response Time</span>
                          <span className="font-semibold text-green-600">1.2s</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Satisfaction</span>
                          <span className="font-semibold">4.8/5</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Zap className="w-3 h-3 mr-1" />
              Powerful Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to build amazing AI agents
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From natural language processing to multi-channel deployment,
              Ojastack provides all the tools you need to create intelligent conversational experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Natural Conversations</CardTitle>
                <CardDescription>
                  Advanced NLP powered by OpenAI enables your agents to understand context,
                  intent, and respond naturally to customer queries.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 2 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle>Multi-Channel Deployment</CardTitle>
                <CardDescription>
                  Deploy your agents across WhatsApp, Slack, web chat, and more.
                  One agent, everywhere your customers are.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 3 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle>Smart Tools Integration</CardTitle>
                <CardDescription>
                  Built-in tools for web search, weather, calculations, and more.
                  Your agents can access real-time information and perform actions.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 4 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Headphones className="h-6 w-6 text-purple-500" />
                </div>
                <CardTitle>Voice Capabilities</CardTitle>
                <CardDescription>
                  Advanced text-to-speech and speech-to-text integration with ElevenLabs
                  for natural voice conversations.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 5 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-orange-500" />
                </div>
                <CardTitle>Analytics & Insights</CardTitle>
                <CardDescription>
                  Comprehensive analytics dashboard to track performance,
                  customer satisfaction, and conversation insights.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 6 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-red-500" />
                </div>
                <CardTitle>Enterprise Security</CardTitle>
                <CardDescription>
                  Built on Supabase with row-level security, encryption at rest,
                  and SOC 2 compliance for enterprise-grade security.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
      {/* How it Works */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Clock className="w-3 h-3 mr-1" />
              Simple Process
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Get started in 3 simple steps
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From idea to deployment in minutes. No technical expertise required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Create Your Agent</h3>
              <p className="text-muted-foreground">
                Define your agent's personality, knowledge base, and capabilities using our intuitive builder.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Train & Test</h3>
              <p className="text-muted-foreground">
                Upload your data, test conversations, and fine-tune responses until your agent is perfect.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Deploy Everywhere</h3>
              <p className="text-muted-foreground">
                Launch your agent across multiple channels with one click. Monitor and improve continuously.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Trusted by teams worldwide
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of businesses using Ojastack to transform their customer experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "Ojastack transformed our customer support. Our response times improved by 80%
                  and customer satisfaction is at an all-time high."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Sarah Chen</p>
                    <p className="text-sm text-muted-foreground">Head of Customer Success</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "The multi-channel deployment is incredible. One agent handles WhatsApp,
                  web chat, and Slack seamlessly. Game changer for our business."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center mr-3">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold">Marcus Rodriguez</p>
                    <p className="text-sm text-muted-foreground">VP of Operations</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "Setup was incredibly easy. We had our first agent running in under 10 minutes.
                  The analytics dashboard gives us insights we never had before."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center mr-3">
                    <Sparkles className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-semibold">Emily Watson</p>
                    <p className="text-sm text-muted-foreground">Product Manager</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">10K+</div>
              <div className="text-muted-foreground">Active Agents</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">1M+</div>
              <div className="text-muted-foreground">Conversations</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-muted-foreground">Uptime</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">4.9/5</div>
              <div className="text-muted-foreground">Customer Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <TrendingUp className="w-3 h-3 mr-1" />
              Simple Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Choose the perfect plan for your needs
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Start free and scale as you grow. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {/* Basic Plan */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">Basic</CardTitle>
                <div className="space-y-2">
                  <div className="text-4xl font-bold">$75</div>
                  <div className="text-lg text-muted-foreground">/month</div>
                </div>
                <CardDescription>Perfect for small businesses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">2 AI Agents</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">500 conversations/month</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">Chat & multimodal</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">1 Knowledge base</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">Web chat integration</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">Email support</span>
                </div>
                <Button className="w-full mt-6" variant="outline" asChild>
                  <Link to="/signup">Start Free Trial</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-2 border-primary shadow-lg scale-105">
              <CardHeader className="text-center pb-8">
                <Badge className="mb-2">Most Popular</Badge>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="space-y-2">
                  <div className="text-4xl font-bold">$250</div>
                  <div className="text-lg text-muted-foreground">/month</div>
                </div>
                <CardDescription>For growing businesses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">10 AI Agents</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">2,000 conversations/month</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">Live conversational video</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">5 Knowledge bases</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">All integrations</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">Priority support</span>
                </div>
                <Button className="w-full mt-6" asChild>
                  <Link to="/signup">Start Free Trial</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Startup Plan */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">Startup</CardTitle>
                <div className="space-y-2">
                  <div className="text-4xl font-bold">$1,250</div>
                  <div className="text-lg text-muted-foreground">/month</div>
                </div>
                <CardDescription>For scaling startups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">100 AI Agents</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">20,000 conversations/month</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">All Pro features 10X</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">50 Knowledge bases</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">Custom integrations</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">Dedicated support</span>
                </div>
                <Button className="w-full mt-6" variant="outline" asChild>
                  <Link to="/signup">Start Free Trial</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <div className="text-4xl font-bold">Custom</div>
                <CardDescription>For large organizations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">Unlimited agents</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">Unlimited conversations</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">White-label options</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">On-premise deployment</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">SLA guarantees</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">Dedicated account manager</span>
                </div>
                <Button className="w-full mt-6" variant="outline" asChild>
                  <Link to="/contact">Contact Sales</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-primary to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to transform your customer experience?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of businesses using Ojastack to build intelligent AI agents.
            Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6" asChild>
              <Link to="/signup">
                Start Building Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-primary text-white hover:bg-primary border-primary">
              <Link to="/contact">Talk to Sales</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  Ojastack
                </span>
              </div>
              <p className="text-muted-foreground mb-4 max-w-md">
                Build intelligent AI agents that understand your customers and deliver exceptional experiences across every channel.
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm">Twitter</Button>
                <Button variant="ghost" size="sm">LinkedIn</Button>
                <Button variant="ghost" size="sm">GitHub</Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <div className="space-y-2">
                <Link to="/features" className="block text-sm text-muted-foreground hover:text-foreground">Features</Link>
                <Link to="/pricing" className="block text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
                <Link to="/integrations" className="block text-sm text-muted-foreground hover:text-foreground">Integrations</Link>
                <Link to="/api" className="block text-sm text-muted-foreground hover:text-foreground">API</Link>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <div className="space-y-2">
                <Link to="/docs" className="block text-sm text-muted-foreground hover:text-foreground">Documentation</Link>
                <Link to="/contact" className="block text-sm text-muted-foreground hover:text-foreground">Contact</Link>
                <a href="mailto:support@ojastack.tech" className="block text-sm text-muted-foreground hover:text-foreground">support@ojastack.tech</a>
                <Link to="/help" className="block text-sm text-muted-foreground hover:text-foreground">Help Center</Link>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <div className="space-y-2">
                <Link to="/terms" className="block text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
                <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
                <Link to="/cookies" className="block text-sm text-muted-foreground hover:text-foreground">Cookie Policy</Link>
                <Link to="/security" className="block text-sm text-muted-foreground hover:text-foreground">Security</Link>
              </div>
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