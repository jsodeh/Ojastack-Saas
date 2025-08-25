import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Phone,
  Slack,
  Globe,
  Copy,
  ExternalLink,
  QrCode,
  Key,
  Settings,
  TestTube,
  MessageSquare
} from 'lucide-react';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<{ data: any; onUpdate: (data: any) => void; onNext: () => void; onPrevious: () => void }>;
}

interface WhatsAppSetupData {
  businessName: string;
  phoneNumber: string;
  apiKey: string;
  webhookUrl: string;
  verificationCode: string;
  accountId: string;
}

interface SlackSetupData {
  workspaceName: string;
  botToken: string;
  signingSecret: string;
  appId: string;
  channels: string[];
  scopes: string[];
}

interface WebWidgetSetupData {
  widgetName: string;
  primaryColor: string;
  greeting: string;
  position: 'bottom-right' | 'bottom-left';
  allowedDomains: string[];
  customCSS: string;
  features: string[];
}

// WhatsApp Setup Steps
function WhatsAppBusinessStep({ data, onUpdate, onNext }: any) {
  const [formData, setFormData] = useState<WhatsAppSetupData>(data || {
    businessName: '',
    phoneNumber: '',
    apiKey: '',
    webhookUrl: '',
    verificationCode: '',
    accountId: ''
  });

  const handleNext = () => {
    onUpdate(formData);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Business Information</h3>
        <p className="text-muted-foreground">
          Enter your WhatsApp Business account details
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            value={formData.businessName}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            placeholder="Your Business Name"
            required
          />
        </div>
        <div>
          <Label htmlFor="phoneNumber">Business Phone Number</Label>
          <Input
            id="phoneNumber"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            placeholder="+1 234 567 8900"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="accountId">WhatsApp Business Account ID</Label>
        <Input
          id="accountId"
          value={formData.accountId}
          onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
          placeholder="Your Business Account ID from Meta Business Manager"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Find this in your Meta Business Manager under WhatsApp Business Account
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You'll need a verified WhatsApp Business account and access to Meta Business Manager to complete this setup.
        </AlertDescription>
      </Alert>

      <Button 
        onClick={handleNext} 
        disabled={!formData.businessName || !formData.phoneNumber || !formData.accountId}
        className="w-full"
      >
        Continue to API Configuration
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function WhatsAppAPIStep({ data, onUpdate, onNext, onPrevious }: any) {
  const [formData, setFormData] = useState<WhatsAppSetupData>(data);

  const handleNext = () => {
    onUpdate(formData);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">API Configuration</h3>
        <p className="text-muted-foreground">
          Configure your WhatsApp Business API credentials
        </p>
      </div>

      <div>
        <Label htmlFor="apiKey">Access Token</Label>
        <Input
          id="apiKey"
          type="password"
          value={formData.apiKey}
          onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
          placeholder="EAAxxxxxxxxxxxxxxxxx"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Generate this token in your Meta Developer Console
        </p>
      </div>

      <div>
        <Label htmlFor="webhookUrl">Webhook URL</Label>
        <div className="flex space-x-2">
          <Input
            id="webhookUrl"
            value={formData.webhookUrl || `https://api.ojastack.com/webhooks/whatsapp/${formData.accountId}`}
            onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
            readOnly
          />
          <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(formData.webhookUrl)}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Add this URL to your WhatsApp Business webhook configuration
        </p>
      </div>

      <div>
        <Label htmlFor="verificationCode">Webhook Verification Token</Label>
        <Input
          id="verificationCode"
          value={formData.verificationCode}
          onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value })}
          placeholder="Enter verification token"
          required
        />
      </div>

      <div className="flex space-x-3">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!formData.apiKey || !formData.verificationCode}
          className="flex-1"
        >
          Test & Verify Connection
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function WhatsAppTestStep({ data, onUpdate, onNext, onPrevious }: any) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const testConnection = async () => {
    setTesting(true);
    try {
      // Mock API test
      await new Promise(resolve => setTimeout(resolve, 3000));
      const success = Math.random() > 0.3;
      setTestResult({
        success,
        message: success ? 'Connection successful!' : 'Failed to connect. Please check your credentials.'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Test Connection</h3>
        <p className="text-muted-foreground">
          Let's verify your WhatsApp Business setup is working correctly
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Business Account</span>
              <Badge variant="outline">{data.businessName}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Phone Number</span>
              <Badge variant="outline">{data.phoneNumber}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>API Status</span>
              {testResult ? (
                <Badge variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                  {testResult.message}
                </Badge>
              ) : (
                <Badge variant="secondary">Not tested</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!testResult && (
        <Button onClick={testConnection} disabled={testing} className="w-full">
          {testing ? (
            <>Testing Connection...</>
          ) : (
            <>
              <TestTube className="mr-2 h-4 w-4" />
              Test WhatsApp Connection
            </>
          )}
        </Button>
      )}

      {testResult && (
        <div className="flex space-x-3">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          {testResult.success ? (
            <Button onClick={onNext} className="flex-1">
              Complete Setup
              <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={testConnection} variant="destructive" className="flex-1">
              Retry Test
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Slack Setup Steps
function SlackWorkspaceStep({ data, onUpdate, onNext }: any) {
  const [formData, setFormData] = useState<SlackSetupData>(data || {
    workspaceName: '',
    botToken: '',
    signingSecret: '',
    appId: '',
    channels: [],
    scopes: []
  });

  const handleOAuthConnect = () => {
    // Mock OAuth flow
    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=YOUR_CLIENT_ID&scope=bot,channels:read,chat:write&redirect_uri=${encodeURIComponent(window.location.origin)}/auth/slack`;
    window.open(authUrl, '_blank', 'width=600,height=600');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Connect to Slack</h3>
        <p className="text-muted-foreground">
          Connect your Slack workspace to deploy your AI agent
        </p>
      </div>

      <Card className="p-6 text-center">
        <Slack className="h-16 w-16 mx-auto mb-4 text-purple-600" />
        <h4 className="text-lg font-semibold mb-2">Authorize Ojastack</h4>
        <p className="text-muted-foreground mb-6">
          We'll need permission to create a bot in your Slack workspace
        </p>
        <Button onClick={handleOAuthConnect} size="lg">
          <Slack className="mr-2 h-5 w-5" />
          Connect to Slack
        </Button>
      </Card>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          After authorization, you'll be redirected back here to complete the setup
        </p>
      </div>
    </div>
  );
}

// Web Widget Setup Steps  
function WebWidgetDesignStep({ data, onUpdate, onNext }: any) {
  const [formData, setFormData] = useState<WebWidgetSetupData>(data || {
    widgetName: 'Customer Support',
    primaryColor: '#3b82f6',
    greeting: 'Hi! How can I help you today?',
    position: 'bottom-right',
    allowedDomains: [],
    customCSS: '',
    features: ['chat', 'file-upload', 'emoji']
  });

  const handleNext = () => {
    onUpdate(formData);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Widget Design</h3>
        <p className="text-muted-foreground">
          Customize the appearance of your chat widget
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="widgetName">Widget Name</Label>
            <Input
              id="widgetName"
              value={formData.widgetName}
              onChange={(e) => setFormData({ ...formData, widgetName: e.target.value })}
              placeholder="Customer Support"
            />
          </div>

          <div>
            <Label htmlFor="greeting">Greeting Message</Label>
            <Input
              id="greeting"
              value={formData.greeting}
              onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
              placeholder="Hi! How can I help you today?"
            />
          </div>

          <div>
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex space-x-2">
              <Input
                id="primaryColor"
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="w-16"
              />
              <Input
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label>Position</Label>
            <div className="flex space-x-2">
              <Button
                variant={formData.position === 'bottom-right' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, position: 'bottom-right' })}
                size="sm"
              >
                Bottom Right
              </Button>
              <Button
                variant={formData.position === 'bottom-left' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, position: 'bottom-left' })}
                size="sm"
              >
                Bottom Left
              </Button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-100 rounded-lg p-4 relative h-64">
          <div className="text-center text-gray-500 mt-8">Website Preview</div>
          <div 
            className={`absolute ${formData.position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4'} w-16 h-16 rounded-full shadow-lg flex items-center justify-center cursor-pointer`}
            style={{ backgroundColor: formData.primaryColor }}
          >
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      <Button onClick={handleNext} className="w-full">
        Continue to Installation
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function WebWidgetInstallStep({ data, onUpdate, onNext, onPrevious }: any) {
  const embedCode = `<!-- Ojastack Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['OjastackWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  })(window,document,'script','ojastack','https://widget.ojastack.com/widget.js');
  
  ojastack('init', {
    agentId: 'agent_${Math.random().toString(36).substr(2, 9)}',
    primaryColor: '${data.primaryColor}',
    position: '${data.position}',
    greeting: '${data.greeting}',
    name: '${data.widgetName}'
  });
</script>`;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Install Widget</h3>
        <p className="text-muted-foreground">
          Add this code to your website to install the chat widget
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="mr-2 h-5 w-5" />
            Embed Code
          </CardTitle>
          <CardDescription>
            Copy and paste this code before the closing &lt;/body&gt; tag on your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              <code>{embedCode}</code>
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={() => navigator.clipboard.writeText(embedCode)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Once installed, the widget will appear on your website and start handling customer conversations immediately.
        </AlertDescription>
      </Alert>

      <div className="flex space-x-3">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button onClick={onNext} className="flex-1">
          Complete Setup
          <CheckCircle className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Main Setup Wizard Components
export function WhatsAppSetupWizard({ onComplete }: { onComplete: (data: WhatsAppSetupData) => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WhatsAppSetupData>({} as WhatsAppSetupData);

  const steps: SetupStep[] = [
    {
      id: 'business',
      title: 'Business Info',
      description: 'Basic business information',
      component: WhatsAppBusinessStep
    },
    {
      id: 'api',
      title: 'API Config',
      description: 'Configure API credentials',
      component: WhatsAppAPIStep
    },
    {
      id: 'test',
      title: 'Test & Verify',
      description: 'Test the connection',
      component: WhatsAppTestStep
    }
  ];

  const currentStepData = steps[currentStep];
  const StepComponent = currentStepData.component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(data);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Phone className="h-6 w-6 text-green-600" />
            <div>
              <CardTitle>WhatsApp Business Setup</CardTitle>
              <CardDescription>
                Step {currentStep + 1} of {steps.length}: {currentStepData.title}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline">{Math.round(progress)}% Complete</Badge>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent className="p-6">
        <StepComponent
          data={data}
          onUpdate={setData}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      </CardContent>
    </Card>
  );
}

export function SlackSetupWizard({ onComplete }: { onComplete: (data: SlackSetupData) => void }) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <Slack className="h-6 w-6 text-purple-600" />
          <div>
            <CardTitle>Slack Integration Setup</CardTitle>
            <CardDescription>
              Connect your Slack workspace to deploy your AI agent
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <SlackWorkspaceStep onNext={() => onComplete({} as SlackSetupData)} />
      </CardContent>
    </Card>
  );
}

export function WebWidgetSetupWizard({ onComplete }: { onComplete: (data: WebWidgetSetupData) => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WebWidgetSetupData>({} as WebWidgetSetupData);

  const steps: SetupStep[] = [
    {
      id: 'design',
      title: 'Widget Design',
      description: 'Customize appearance',
      component: WebWidgetDesignStep
    },
    {
      id: 'install',
      title: 'Installation',
      description: 'Get embed code',
      component: WebWidgetInstallStep
    }
  ];

  const currentStepData = steps[currentStep];
  const StepComponent = currentStepData.component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(data);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Globe className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>Web Widget Setup</CardTitle>
              <CardDescription>
                Step {currentStep + 1} of {steps.length}: {currentStepData.title}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline">{Math.round(progress)}% Complete</Badge>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent className="p-6">
        <StepComponent
          data={data}
          onUpdate={setData}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      </CardContent>
    </Card>
  );
}