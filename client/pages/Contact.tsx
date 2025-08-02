import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Mail,
  Phone,
  MessageCircle,
  Calendar,
  Clock,
  MapPin,
  Send,
  ArrowRight,
  Headphones,
  Users,
  BookOpen,
  Zap,
  User
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export default function Contact() {
  const { user } = useAuth();
  
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
                  <Link to="/contact" className="text-foreground px-3 py-2 rounded-md text-sm font-medium border-b-2 border-primary">Contact</Link>
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

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-gradient-via/5 to-gradient-to/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6">
              We're Here to Help
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
              Get in Touch with
              <span className="bg-gradient-to-r from-primary to-gradient-to bg-clip-text text-transparent"> Our Team</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Have questions about Ojastack? Need help with implementation? Our team of experts is ready to assist you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Headphones className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Support</CardTitle>
                <CardDescription>Get help with technical issues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center justify-center">
                    <Clock className="h-4 w-4 mr-1" />
                    24/7 Available
                  </p>
                  <p className="text-muted-foreground">Response: &lt; 4 hours</p>
                </div>
                <Button className="w-full mt-4" variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  support@ojastack.tech
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Sales</CardTitle>
                <CardDescription>Discuss pricing and plans</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center justify-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Mon-Fri 9AM-6PM PST
                  </p>
                  <p className="text-muted-foreground">Response: &lt; 2 hours</p>
                </div>
                <Button className="w-full mt-4" variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  sales@ojastack.tech
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Schedule Demo</CardTitle>
                <CardDescription>See Ojastack in action</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center justify-center">
                    <Clock className="h-4 w-4 mr-1" />
                    30-minute sessions
                  </p>
                  <p className="text-muted-foreground">Next available slot</p>
                </div>
                <Link to="/demo">
                  <Button className="w-full mt-4">
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Demo
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Documentation</CardTitle>
                <CardDescription>Self-service resources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center justify-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Always Available
                  </p>
                  <p className="text-muted-foreground">Instant answers</p>
                </div>
                <Link to="/docs">
                  <Button className="w-full mt-4" variant="outline">
                    <BookOpen className="h-4 w-4 mr-2" />
                    View Docs
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Send us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@company.com" />
                </div>

                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" placeholder="Acme Corp" />
                </div>

                <div>
                  <Label htmlFor="inquiryType">Inquiry Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select inquiry type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales Inquiry</SelectItem>
                      <SelectItem value="support">Technical Support</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="demo">Request Demo</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Tell us about your needs or questions..."
                    rows={6}
                  />
                </div>

                <Button className="w-full" size="lg">
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </CardContent>
            </Card>

            {/* Company Information */}
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Office Locations</CardTitle>
                  <CardDescription>Visit us at our global offices</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">San Francisco (HQ)</h4>
                      <p className="text-sm text-muted-foreground">
                        123 Tech Street<br />
                        San Francisco, CA 94105<br />
                        United States
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">London</h4>
                      <p className="text-sm text-muted-foreground">
                        456 Innovation Ave<br />
                        London EC2A 3QP<br />
                        United Kingdom
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Singapore</h4>
                      <p className="text-sm text-muted-foreground">
                        789 Business Plaza<br />
                        Singapore 048624<br />
                        Singapore
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                  <CardDescription>Find what you're looking for</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Link to="/pricing" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center">
                        <Zap className="h-4 w-4 mr-3 text-primary" />
                        <span>View Pricing Plans</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <Link to="/features" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-3 text-primary" />
                        <span>Explore Features</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <Link to="/status" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center">
                        <MessageCircle className="h-4 w-4 mr-3 text-primary" />
                        <span>System Status</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <Link to="/help" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-3 text-primary" />
                        <span>Help Center</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Support */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Need Immediate Assistance?</h2>
          <p className="text-muted-foreground mb-8">
            For critical issues affecting your production environment, contact our emergency support line.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8">
              <Phone className="h-5 w-5 mr-2" />
              Emergency Hotline
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              <MessageCircle className="h-5 w-5 mr-2" />
              Live Chat
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Available 24/7 for Enterprise customers
          </p>
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
