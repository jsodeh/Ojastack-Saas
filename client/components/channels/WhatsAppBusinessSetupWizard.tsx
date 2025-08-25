import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Smartphone, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Phone,
  MessageSquare,
  ExternalLink,
  Copy,
  TestTube,
  RefreshCw,
  Send,
  QrCode,
  Shield,
  Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WhatsAppConfig {
  businessAccountId: string;
  phoneNumberId: string;
  phoneNumber: string;
  displayName: string;
  accessToken: string;
  webhookVerifyToken: string;
  businessProfile: {
    name: string;
    category: string;
    description: string;
    email: string;
    website: string;
    address: string;
  };
}

interface VerificationStatus {
  step: 'setup' | 'phone-verification' | 'webhook-setup' | 'testing' | 'complete';
  phoneVerified: boolean;
  webhookVerified: boolean;
  testMessageSent: boolean;
  businessProfileComplete: boolean;
}

interface WhatsAppBusinessSetupWizardProps {
  onComplete: (config: WhatsAppConfig) => void;
  onCancel: () => void;
  initialConfig?: Partial<WhatsAppConfig>;
}

const SETUP_STEPS = [
  { id: 'setup', title: 'Basic Setup', description: 'Configure WhatsApp Business account credentials' },
  { id: 'phone-verification', title: 'Phone Verification', description: 'Verify your business phone number' },
  { id: 'webhook-setup', title: 'Webhook Configuration', description: 'Set up webhook for message handling' },
  { id: 'testing', title: 'Connection Testing', description: 'Test message sending and receiving' },
  { id: 'complete', title: 'Complete', description: 'Finalize WhatsApp integration setup' }
];

export default function WhatsAppBusinessSetupWizard({
  onComplete,
  onCancel,
  initialConfig
}: WhatsAppBusinessSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [config, setConfig] = useState<WhatsAppConfig>({
    businessAccountId: initialConfig?.businessAccountId || '',
    phoneNumberId: initialConfig?.phoneNumberId || '',
    phoneNumber: initialConfig?.phoneNumber || '',
    displayName: initialConfig?.displayName || '',
    accessToken: initialConfig?.accessToken || '',
    webhookVerifyToken: initialConfig?.webhookVerifyToken || '',
    businessProfile: {
      name: initialConfig?.businessProfile?.name || '',
      category: initialConfig?.businessProfile?.category || '',
      description: initialConfig?.businessProfile?.description || '',
      email: initialConfig?.businessProfile?.email || '',
      website: initialConfig?.businessProfile?.website || '',
      address: initialConfig?.businessProfile?.address || ''
    }
  });

  const [verification, setVerification] = useState<VerificationStatus>({
    step: 'setup',
    phoneVerified: false,
    webhookVerified: false,
    testMessageSent: false,
    businessProfileComplete: false
  });

  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  // Validate WhatsApp credentials
  const validateCredentialsMutation = useMutation({
    mutationFn: async (credentials: Partial<WhatsAppConfig>) => {
      const response = await fetch('/.netlify/functions/validate-whatsapp-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        throw new Error('Invalid credentials');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setVerification(prev => ({ ...prev, phoneVerified: true }));
      toast.success('WhatsApp credentials validated successfully');
      setCurrentStep(1);
    },
    onError: (error) => {
      toast.error('Failed to validate credentials: ' + error.message);
    }
  });

  // Verify phone number
  const verifyPhoneMutation = useMutation({
    mutationFn: async (phoneData: { phoneNumberId: string; accessToken: string; }) => {
      const response = await fetch('/.netlify/functions/verify-whatsapp-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(phoneData)
      });
      
      if (!response.ok) {
        throw new Error('Phone verification failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setVerification(prev => ({ ...prev, phoneVerified: true }));
      toast.success('Phone number verified successfully');
      setCurrentStep(2);
    },
    onError: (error) => {
      toast.error('Phone verification failed: ' + error.message);
    }
  });

  // Setup webhook
  const setupWebhookMutation = useMutation({
    mutationFn: async (webhookData: { 
      businessAccountId: string; 
      webhookUrl: string; 
      verifyToken: string;
      accessToken: string;
    }) => {
      const response = await fetch('/.netlify/functions/setup-whatsapp-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData)
      });
      
      if (!response.ok) {
        throw new Error('Webhook setup failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setVerification(prev => ({ ...prev, webhookVerified: true }));
      toast.success('Webhook configured successfully');
      setCurrentStep(3);
    },
    onError: (error) => {
      toast.error('Webhook setup failed: ' + error.message);
    }
  });

  // Send test message
  const sendTestMessageMutation = useMutation({
    mutationFn: async (testData: {
      phoneNumberId: string;
      accessToken: string;
      recipientPhone: string;
      message: string;
    }) => {
      const response = await fetch('/.netlify/functions/send-whatsapp-test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to send test message');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setVerification(prev => ({ ...prev, testMessageSent: true }));
      setTestResults(prev => [...prev, {
        type: 'message_sent',
        status: 'success',
        timestamp: new Date(),
        data
      }]);
      toast.success('Test message sent successfully');
    },
    onError: (error) => {
      setTestResults(prev => [...prev, {
        type: 'message_failed',
        status: 'error',
        timestamp: new Date(),
        error: error.message
      }]);
      toast.error('Failed to send test message: ' + error.message);
    }
  });

  const handleStepValidation = async (step: number) => {
    setIsLoading(true);
    
    try {
      switch (step) {
        case 0:
          await validateCredentialsMutation.mutateAsync({
            businessAccountId: config.businessAccountId,
            phoneNumberId: config.phoneNumberId,
            accessToken: config.accessToken
          });
          break;
        case 1:
          await verifyPhoneMutation.mutateAsync({
            phoneNumberId: config.phoneNumberId,
            accessToken: config.accessToken
          });
          break;
        case 2:
          const webhookUrl = `${window.location.origin}/.netlify/functions/whatsapp-webhook`;
          await setupWebhookMutation.mutateAsync({
            businessAccountId: config.businessAccountId,
            webhookUrl,
            verifyToken: config.webhookVerifyToken,
            accessToken: config.accessToken
          });
          break;
        case 3:
          // Testing step - user can manually test or skip
          setCurrentStep(4);
          break;
      }
    } catch (error) {
      console.error('Step validation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestMessage = (recipientPhone: string, message: string) => {
    sendTestMessageMutation.mutate({
      phoneNumberId: config.phoneNumberId,
      accessToken: config.accessToken,
      recipientPhone,
      message
    });
  };

  const generateWebhookURL = () => {
    return `${window.location.origin}/.netlify/functions/whatsapp-webhook`;
  };

  const copyWebhookURL = () => {
    navigator.clipboard.writeText(generateWebhookURL());
    toast.success('Webhook URL copied to clipboard');
  };

  const generateVerifyToken = () => {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setConfig(prev => ({ ...prev, webhookVerifyToken: token }));
  };

  const handleComplete = () => {
    onComplete(config);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Smartphone className="w-8 h-8 text-green-500" />
          WhatsApp Business Setup
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Connect your WhatsApp Business account to enable customer messaging through the platform.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          {SETUP_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                index <= currentStep 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {index < currentStep ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < SETUP_STEPS.length - 1 && (
                <div className={cn(
                  "w-16 h-1 mx-2",
                  index < currentStep ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>
        <Progress value={((currentStep + 1) / SETUP_STEPS.length) * 100} className="w-full" />
      </div>

      {/* Step Content */}
      <Tabs value={SETUP_STEPS[currentStep]?.id} className="w-full">
        {/* Step 1: Basic Setup */}
        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                WhatsApp Business Credentials
              </CardTitle>
              <CardDescription>
                Enter your WhatsApp Business API credentials from Meta Developer Console
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Account ID *</Label>
                  <Input
                    placeholder="Enter Business Account ID"
                    value={config.businessAccountId}
                    onChange={(e) => setConfig(prev => ({ ...prev, businessAccountId: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Phone Number ID *</Label>
                  <Input
                    placeholder="Enter Phone Number ID"
                    value={config.phoneNumberId}
                    onChange={(e) => setConfig(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Access Token *</Label>
                  <Input
                    type="password"
                    placeholder="Enter Access Token"
                    value={config.accessToken}
                    onChange={(e) => setConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    placeholder="Business Display Name"
                    value={config.displayName}
                    onChange={(e) => setConfig(prev => ({ ...prev, displayName: e.target.value }))}
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You can find these credentials in your Meta Developer Console under WhatsApp Business API settings.
                  <a 
                    href="https://developers.facebook.com/apps" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-primary hover:underline inline-flex items-center"
                  >
                    Open Developer Console <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Phone Verification */}
        <TabsContent value="phone-verification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Phone Number Verification
              </CardTitle>
              <CardDescription>
                Verify your WhatsApp Business phone number for message sending
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center py-8">
                {verification.phoneVerified ? (
                  <div className="text-center space-y-4">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                    <h3 className="text-lg font-semibold">Phone Number Verified!</h3>
                    <p className="text-muted-foreground">
                      Your WhatsApp Business phone number is ready to send messages.
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <h3 className="text-lg font-semibold">Verifying Phone Number...</h3>
                    <p className="text-muted-foreground">
                      We're checking your phone number configuration with WhatsApp Business API.
                    </p>
                  </div>
                )}
              </div>

              {!verification.phoneVerified && (
                <div className="flex justify-center">
                  <Button onClick={() => handleStepValidation(1)} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4 mr-2" />
                        Verify Phone Number
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 3: Webhook Setup */}
        <TabsContent value="webhook-setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Set up webhook endpoint to receive incoming WhatsApp messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={generateWebhookURL()}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" size="sm" onClick={copyWebhookURL}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Verify Token</Label>
                  <div className="flex gap-2">
                    <Input
                      value={config.webhookVerifyToken}
                      onChange={(e) => setConfig(prev => ({ ...prev, webhookVerifyToken: e.target.value }))}
                      placeholder="Enter or generate verify token"
                    />
                    <Button variant="outline" size="sm" onClick={generateVerifyToken}>
                      Generate
                    </Button>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>To complete webhook setup:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Copy the webhook URL above</li>
                      <li>Go to your WhatsApp Business App in Meta Developer Console</li>
                      <li>Navigate to WhatsApp → Configuration</li>
                      <li>Add the webhook URL and verify token</li>
                      <li>Subscribe to message webhooks</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex justify-center">
                <Button 
                  onClick={() => handleStepValidation(2)} 
                  disabled={!config.webhookVerifyToken || isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Configure Webhook
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 4: Testing */}
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Connection Testing
              </CardTitle>
              <CardDescription>
                Test your WhatsApp integration by sending test messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TestMessageForm onSendMessage={handleTestMessage} />
              
              {testResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Test Results:</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {testResults.map((result, index) => (
                      <Alert key={index} variant={result.status === 'success' ? 'default' : 'destructive'}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">
                              {result.type === 'message_sent' ? 'Message Sent' : 'Message Failed'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {result.timestamp.toLocaleTimeString()}
                            </p>
                            {result.error && (
                              <p className="text-sm text-red-600 mt-1">{result.error}</p>
                            )}
                          </div>
                          {result.status === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 5: Complete */}
        <TabsContent value="complete" className="space-y-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <CheckCircle className="w-8 h-8 text-green-500" />
                Setup Complete!
              </CardTitle>
              <CardDescription>
                Your WhatsApp Business integration is ready to use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <h4 className="font-medium">Phone Verified</h4>
                  <p className="text-sm text-muted-foreground">Ready to send messages</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <h4 className="font-medium">Webhook Active</h4>
                  <p className="text-sm text-muted-foreground">Receiving incoming messages</p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your WhatsApp Business integration is now active. Messages will be handled automatically 
                  according to your agent configuration. Monitor the conversation dashboard for activity.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel Setup
        </Button>
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
              Previous
            </Button>
          )}
          {currentStep < SETUP_STEPS.length - 1 ? (
            <Button 
              onClick={() => handleStepValidation(currentStep)}
              disabled={isLoading}
            >
              Continue
            </Button>
          ) : (
            <Button onClick={handleComplete}>
              Complete Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Test Message Form Component
const TestMessageForm = ({ onSendMessage }: { onSendMessage: (phone: string, message: string) => void }) => {
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello! This is a test message from your WhatsApp Business integration.');

  const handleSend = () => {
    if (!testPhone || !testMessage) {
      toast.error('Please enter both phone number and message');
      return;
    }
    onSendMessage(testPhone, testMessage);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-medium">Send Test Message</h4>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Recipient Phone Number</Label>
          <Input
            placeholder="+1234567890"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Include country code (e.g., +1 for US numbers)
          </p>
        </div>
        
        <div className="space-y-2">
          <Label>Test Message</Label>
          <textarea
            className="w-full p-2 border rounded-md resize-none"
            rows={3}
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter your test message..."
          />
        </div>
        
        <Button onClick={handleSend} className="w-full">
          <Send className="w-4 h-4 mr-2" />
          Send Test Message
        </Button>
      </div>
    </div>
  );
};