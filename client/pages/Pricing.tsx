import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Check,
  X,
  ArrowRight,
  Users,
  MessageSquare,
  Phone,
  Eye,
  BarChart3,
  Shield,
  Headphones,
  Zap,
  Star,
  HelpCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      name: "Starter",
      description: "Perfect for small businesses getting started",
      monthlyPrice: 49,
      yearlyPrice: 39,
      popular: false,
      features: [
        { name: "1 AI Agent", included: true },
        { name: "1,000 conversations/month", included: true },
        { name: "Chat support only", included: true },
        { name: "Basic analytics", included: true },
        { name: "Email support", included: true },
        { name: "Standard integrations", included: true },
        { name: "Voice agents", included: false },
        { name: "Vision processing", included: false },
        { name: "Advanced analytics", included: false },
        { name: "Priority support", included: false },
        { name: "Custom integrations", included: false },
        { name: "White-label options", included: false }
      ]
    },
    {
      name: "Professional",
      description: "For growing businesses with higher volume",
      monthlyPrice: 149,
      yearlyPrice: 119,
      popular: true,
      features: [
        { name: "5 AI Agents", included: true },
        { name: "10,000 conversations/month", included: true },
        { name: "Chat, Voice & Vision", included: true },
        { name: "Advanced analytics", included: true },
        { name: "Priority support", included: true },
        { name: "Standard integrations", included: true },
        { name: "Custom integrations", included: true },
        { name: "API access", included: true },
        { name: "Team collaboration", included: true },
        { name: "Advanced training", included: true },
        { name: "White-label options", included: false },
        { name: "Dedicated support", included: false }
      ]
    },
    {
      name: "Enterprise",
      description: "For large organizations with custom needs",
      monthlyPrice: 499,
      yearlyPrice: 399,
      popular: false,
      customPricing: true,
      features: [
        { name: "Unlimited AI Agents", included: true },
        { name: "Unlimited conversations", included: true },
        { name: "All agent types", included: true },
        { name: "Enterprise analytics", included: true },
        { name: "24/7 dedicated support", included: true },
        { name: "All integrations", included: true },
        { name: "Custom integrations", included: true },
        { name: "Full API access", included: true },
        { name: "Advanced team features", included: true },
        { name: "Custom training", included: true },
        { name: "White-label options", included: true },
        { name: "On-premise deployment", included: true }
      ]
    }
  ];

  const addOns = [
    {
      name: "Additional Conversations",
      description: "Extra conversation capacity",
      price: "$0.05 per conversation",
      icon: MessageSquare
    },
    {
      name: "Premium Voice Models",
      description: "Advanced neural voice synthesis",
      price: "$29/month",
      icon: Phone
    },
    {
      name: "Advanced Vision Processing",
      description: "High-accuracy document analysis",
      price: "$49/month",
      icon: Eye
    },
    {
      name: "Custom Model Training",
      description: "Dedicated model fine-tuning",
      price: "$199/month",
      icon: BarChart3
    }
  ];

  return (
    <TooltipProvider>
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
                    <Link to="/pricing" className="text-foreground px-3 py-2 rounded-md text-sm font-medium border-b-2 border-primary">Pricing</Link>
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
                Simple, Transparent Pricing
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
                Choose the Perfect Plan for
                <span className="bg-gradient-to-r from-primary to-gradient-to bg-clip-text text-transparent"> Your Business</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Start free, scale as you grow. No hidden fees, no long-term commitments. Cancel anytime.
              </p>
              
              {/* Billing Toggle */}
              <div className="flex items-center justify-center space-x-3 mb-12">
                <Label htmlFor="billing-toggle" className={!isYearly ? "text-foreground" : "text-muted-foreground"}>
                  Monthly
                </Label>
                <Switch
                  id="billing-toggle"
                  checked={isYearly}
                  onCheckedChange={setIsYearly}
                />
                <Label htmlFor="billing-toggle" className={isYearly ? "text-foreground" : "text-muted-foreground"}>
                  Yearly
                </Label>
                <Badge variant="secondary" className="ml-2">Save 20%</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan, index) => (
                <Card key={index} className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-base">{plan.description}</CardDescription>
                    <div className="mt-4">
                      {plan.customPricing ? (
                        <div className="text-4xl font-bold">Custom</div>
                      ) : (
                        <>
                          <div className="text-4xl font-bold">
                            ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                            <span className="text-lg font-normal text-muted-foreground">/month</span>
                          </div>
                          {isYearly && (
                            <div className="text-sm text-muted-foreground">
                              Billed annually (${plan.yearlyPrice * 12}/year)
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm">
                          {feature.included ? (
                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground mr-3 flex-shrink-0" />
                          )}
                          <span className={feature.included ? "text-foreground" : "text-muted-foreground"}>
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Link to={plan.customPricing ? "/contact" : `/signup?plan=${plan.name.toLowerCase()}`}>
                      <Button 
                        className={`w-full ${plan.popular ? '' : 'variant-outline'}`}
                        variant={plan.popular ? 'default' : 'outline'}
                      >
                        {plan.customPricing ? 'Contact Sales' : 'Get Started'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="py-16 bg-muted/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Detailed Feature Comparison</h2>
              <p className="text-xl text-muted-foreground">
                Compare all features across our plans
              </p>
            </div>
            
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">Features</th>
                      <th className="text-center p-4 font-semibold">Starter</th>
                      <th className="text-center p-4 font-semibold bg-primary/5">Professional</th>
                      <th className="text-center p-4 font-semibold">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { category: "AI Agents", features: [
                        { name: "Number of Agents", starter: "1", professional: "5", enterprise: "Unlimited" },
                        { name: "Chat Agents", starter: true, professional: true, enterprise: true },
                        { name: "Voice Agents", starter: false, professional: true, enterprise: true },
                        { name: "Vision Agents", starter: false, professional: true, enterprise: true },
                        { name: "Custom Agent Types", starter: false, professional: false, enterprise: true }
                      ]},
                      { category: "Usage Limits", features: [
                        { name: "Monthly Conversations", starter: "1,000", professional: "10,000", enterprise: "Unlimited" },
                        { name: "API Calls", starter: "5,000", professional: "50,000", enterprise: "Unlimited" },
                        { name: "Data Storage", starter: "1 GB", professional: "10 GB", enterprise: "Unlimited" },
                        { name: "File Uploads", starter: "100 MB", professional: "1 GB", enterprise: "Unlimited" }
                      ]},
                      { category: "Support & Training", features: [
                        { name: "Support Type", starter: "Email", professional: "Priority", enterprise: "24/7 Dedicated" },
                        { name: "Response Time", starter: "24-48h", professional: "4-8h", enterprise: "1h" },
                        { name: "Custom Training", starter: false, professional: true, enterprise: true },
                        { name: "Onboarding Support", starter: false, professional: true, enterprise: true }
                      ]},
                      { category: "Advanced Features", features: [
                        { name: "White-label Options", starter: false, professional: false, enterprise: true },
                        { name: "On-premise Deployment", starter: false, professional: false, enterprise: true },
                        { name: "Custom Integrations", starter: false, professional: true, enterprise: true },
                        { name: "Advanced Analytics", starter: false, professional: true, enterprise: true }
                      ]}
                    ].map((section, sectionIdx) => (
                      <React.Fragment key={sectionIdx}>
                        <tr className="bg-muted/30">
                          <td colSpan={4} className="p-4 font-semibold text-sm uppercase tracking-wide">
                            {section.category}
                          </td>
                        </tr>
                        {section.features.map((feature, featureIdx) => (
                          <tr key={featureIdx} className="border-b border-border/50">
                            <td className="p-4 font-medium">{feature.name}</td>
                            <td className="p-4 text-center">
                              {typeof feature.starter === 'boolean' ? (
                                feature.starter ? (
                                  <Check className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                )
                              ) : (
                                feature.starter
                              )}
                            </td>
                            <td className="p-4 text-center bg-primary/5">
                              {typeof feature.professional === 'boolean' ? (
                                feature.professional ? (
                                  <Check className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                )
                              ) : (
                                feature.professional
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {typeof feature.enterprise === 'boolean' ? (
                                feature.enterprise ? (
                                  <Check className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                )
                              ) : (
                                feature.enterprise
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </section>

        {/* Add-ons Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Add-ons & Extensions</h2>
              <p className="text-xl text-muted-foreground">
                Enhance your plan with additional capabilities
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {addOns.map((addon, index) => (
                <Card key={index} className="text-center hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <addon.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{addon.name}</CardTitle>
                    <CardDescription>{addon.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary mb-4">{addon.price}</div>
                    <Button variant="outline" size="sm" className="w-full">
                      Add to Plan
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-muted/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-xl text-muted-foreground">
                Common questions about our pricing and plans
              </p>
            </div>
            
            <div className="space-y-6">
              {[
                {
                  question: "Can I change plans at any time?",
                  answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the billing accordingly."
                },
                {
                  question: "What happens if I exceed my conversation limit?",
                  answer: "We'll notify you when you're approaching your limit. You can either upgrade your plan or purchase additional conversations at $0.05 per conversation."
                },
                {
                  question: "Is there a free trial available?",
                  answer: "Yes, all plans come with a 14-day free trial. No credit card required to start. You can explore all features during the trial period."
                },
                {
                  question: "Can I cancel my subscription anytime?",
                  answer: "Absolutely. You can cancel your subscription at any time from your account settings. You'll retain access until the end of your billing period."
                },
                {
                  question: "Do you offer discounts for non-profits or educational institutions?",
                  answer: "Yes, we offer special pricing for qualified non-profits and educational institutions. Contact our sales team for more information."
                },
                {
                  question: "What payment methods do you accept?",
                  answer: "We accept all major credit cards, PayPal, and for Enterprise customers, we can arrange invoice-based billing."
                }
              ].map((faq, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <HelpCircle className="h-5 w-5 mr-2 text-primary" />
                      {faq.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of businesses transforming their customer experience with Ojastack.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="text-lg px-8">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Contact Sales
                </Button>
              </Link>
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
    </TooltipProvider>
  );
}
