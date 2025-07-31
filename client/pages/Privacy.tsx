import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Eye, Lock, Database } from "lucide-react";
import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Privacy Policy</h1>
              <p className="text-muted-foreground">Last updated: January 30, 2025</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Privacy Commitment */}
        <Card className="mb-8 bg-gradient-to-r from-primary/5 to-blue-500/5">
          <CardContent className="p-8">
            <div className="flex items-center space-x-4 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold">Our Privacy Commitment</h2>
            </div>
            <p className="text-lg text-muted-foreground">
              At Ojastack, we believe privacy is a fundamental right. This policy explains how we 
              collect, use, and protect your personal information when you use our AI agent platform.
            </p>
          </CardContent>
        </Card>

        <div className="prose prose-gray max-w-none">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                1. Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h4 className="font-semibold">Account Information</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Name and email address</li>
                <li>Company information (if applicable)</li>
                <li>Billing and payment information</li>
                <li>Profile preferences and settings</li>
              </ul>

              <h4 className="font-semibold">Usage Data</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Agent configurations and settings</li>
                <li>Conversation data and analytics</li>
                <li>Knowledge base content you upload</li>
                <li>API usage and integration data</li>
                <li>Platform interaction logs</li>
              </ul>

              <h4 className="font-semibold">Technical Information</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>IP address and device information</li>
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Cookies and similar technologies</li>
                <li>Performance and error logs</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                2. How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h4 className="font-semibold">Service Provision</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Create and manage your AI agents</li>
                <li>Process conversations and provide responses</li>
                <li>Store and organize your knowledge bases</li>
                <li>Enable integrations with third-party platforms</li>
                <li>Provide analytics and insights</li>
              </ul>

              <h4 className="font-semibold">Account Management</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Authenticate and authorize access</li>
                <li>Process billing and payments</li>
                <li>Send important service notifications</li>
                <li>Provide customer support</li>
              </ul>

              <h4 className="font-semibold">Service Improvement</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Analyze usage patterns (anonymized)</li>
                <li>Improve AI model performance</li>
                <li>Develop new features</li>
                <li>Ensure platform security and stability</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                3. Data Protection & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h4 className="font-semibold">Encryption</h4>
              <p>
                All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. 
                Your sensitive information is protected with industry-standard security measures.
              </p>

              <h4 className="font-semibold">Access Controls</h4>
              <p>
                We implement strict access controls and authentication mechanisms. Only authorized 
                personnel have access to your data, and all access is logged and monitored.
              </p>

              <h4 className="font-semibold">Infrastructure Security</h4>
              <p>
                Our platform is built on secure cloud infrastructure with regular security audits, 
                vulnerability assessments, and compliance certifications.
              </p>

              <h4 className="font-semibold">Data Backup & Recovery</h4>
              <p>
                We maintain secure backups of your data and have disaster recovery procedures 
                in place to ensure business continuity.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>4. Data Sharing & Third Parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>We do not sell your personal information. We may share data in these limited circumstances:</p>
              
              <h4 className="font-semibold">Service Providers</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>OpenAI (for AI processing)</li>
                <li>Supabase (for database services)</li>
                <li>Stripe (for payment processing)</li>
                <li>ElevenLabs (for voice services)</li>
                <li>Cloud infrastructure providers</li>
              </ul>

              <h4 className="font-semibold">Legal Requirements</h4>
              <p>
                We may disclose information if required by law, court order, or to protect our 
                rights, property, or safety, or that of our users or the public.
              </p>

              <h4 className="font-semibold">Business Transfers</h4>
              <p>
                In the event of a merger, acquisition, or sale of assets, your information may 
                be transferred as part of that transaction.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>5. Your Rights & Choices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h4 className="font-semibold">Access & Portability</h4>
              <p>
                You can access, download, and export your data at any time through your account 
                dashboard or by contacting us.
              </p>

              <h4 className="font-semibold">Correction & Updates</h4>
              <p>
                You can update your account information and preferences through your dashboard. 
                Contact us if you need help correcting any data.
              </p>

              <h4 className="font-semibold">Deletion</h4>
              <p>
                You can delete your account and associated data at any time. Some data may be 
                retained for legal or operational purposes as described in our Terms of Service.
              </p>

              <h4 className="font-semibold">Marketing Communications</h4>
              <p>
                You can opt out of marketing emails at any time using the unsubscribe link 
                or by updating your preferences in your account.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>6. Cookies & Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>We use cookies and similar technologies to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Keep you logged in</li>
                <li>Remember your preferences</li>
                <li>Analyze platform usage</li>
                <li>Improve user experience</li>
                <li>Provide security features</li>
              </ul>
              <p>
                You can control cookie settings through your browser, but some features may 
                not work properly if cookies are disabled.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>7. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Your data may be processed and stored in countries other than your own. 
                We ensure appropriate safeguards are in place for international transfers, 
                including standard contractual clauses and adequacy decisions.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>8. Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Our Service is not intended for children under 18. We do not knowingly collect 
                personal information from children. If you believe we have collected information 
                from a child, please contact us immediately.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>9. Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We retain your data for as long as your account is active or as needed to 
                provide services. We may retain some data for longer periods for legal, 
                regulatory, or operational purposes.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Account data: Until account deletion</li>
                <li>Conversation data: 2 years or until deletion</li>
                <li>Billing data: 7 years for tax purposes</li>
                <li>Logs and analytics: 1 year (anonymized)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>10. Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of 
                significant changes via email or through the platform. The "Last updated" 
                date at the top indicates when the policy was last revised.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>11. Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                If you have questions about this Privacy Policy or our data practices, 
                please contact us:
              </p>
              <ul className="list-none space-y-2">
                <li><strong>Email:</strong> privacy@ojastack.tech</li>
                <li><strong>Data Protection Officer:</strong> dpo@ojastack.tech</li>
                <li><strong>Address:</strong> [Your Business Address]</li>
                <li><strong>Website:</strong> https://ojastack.tech</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}