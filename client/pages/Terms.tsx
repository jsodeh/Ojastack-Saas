import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Terms() {
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
              <h1 className="text-2xl font-bold">Terms of Service</h1>
              <p className="text-muted-foreground">Last updated: January 30, 2025</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-gray max-w-none">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Agreement to Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                These Terms of Service ("Terms") govern your use of Ojastack's AI agent platform 
                and services ("Service") operated by Ojastack ("us", "we", or "our").
              </p>
              <p>
                By accessing or using our Service, you agree to be bound by these Terms. 
                If you disagree with any part of these terms, then you may not access the Service.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>1. Service Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Ojastack provides a no-code platform for creating, deploying, and managing 
                AI-powered conversational agents. Our services include:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>AI agent creation and configuration tools</li>
                <li>Knowledge base management system</li>
                <li>Multi-channel deployment (web, WhatsApp, Slack, etc.)</li>
                <li>Analytics and conversation monitoring</li>
                <li>API access and integrations</li>
                <li>Voice and video capabilities</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>2. User Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                To use our Service, you must create an account. You are responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Providing accurate and complete information</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
              <p>
                You must be at least 18 years old to create an account. By creating an account, 
                you represent that you meet this age requirement.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>3. Acceptable Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit harmful, offensive, or inappropriate content</li>
                <li>Engage in spam, phishing, or fraudulent activities</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Create agents that impersonate real people without consent</li>
                <li>Use the Service for illegal or unethical purposes</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>4. Subscription and Billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Our Service is offered through various subscription plans. By subscribing, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Pay all fees associated with your chosen plan</li>
                <li>Automatic renewal unless cancelled</li>
                <li>Usage limits as specified in your plan</li>
                <li>Additional charges for usage overages</li>
              </ul>
              <p>
                We reserve the right to change our pricing with 30 days' notice. 
                Refunds are provided according to our refund policy.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>5. Data and Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Your privacy is important to us. Our Privacy Policy explains how we collect, 
                use, and protect your information. By using our Service, you consent to our 
                data practices as described in our Privacy Policy.
              </p>
              <p>
                You retain ownership of your data and content. We may use aggregated, 
                anonymized data to improve our services.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>6. Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                The Service and its original content, features, and functionality are owned by 
                Ojastack and are protected by international copyright, trademark, patent, 
                trade secret, and other intellectual property laws.
              </p>
              <p>
                You grant us a license to use your content solely to provide the Service to you.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>7. Service Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We strive to maintain high availability but cannot guarantee uninterrupted service. 
                We may temporarily suspend the Service for maintenance, updates, or other reasons.
              </p>
              <p>
                We are not liable for any downtime, data loss, or other issues arising from 
                service interruptions.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>8. Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                To the maximum extent permitted by law, Ojastack shall not be liable for any 
                indirect, incidental, special, consequential, or punitive damages, including 
                but not limited to loss of profits, data, use, goodwill, or other intangible losses.
              </p>
              <p>
                Our total liability shall not exceed the amount paid by you for the Service 
                in the 12 months preceding the claim.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>9. Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We may terminate or suspend your account and access to the Service immediately, 
                without prior notice, for conduct that we believe violates these Terms or is 
                harmful to other users, us, or third parties.
              </p>
              <p>
                You may terminate your account at any time by contacting us. Upon termination, 
                your right to use the Service will cease immediately.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>10. Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We reserve the right to modify these Terms at any time. We will notify users 
                of significant changes via email or through the Service. Continued use of the 
                Service after changes constitutes acceptance of the new Terms.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>11. Governing Law</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of 
                [Your Jurisdiction], without regard to its conflict of law provisions.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>12. Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <ul className="list-none space-y-2">
                <li><strong>Email:</strong> legal@ojastack.tech</li>
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