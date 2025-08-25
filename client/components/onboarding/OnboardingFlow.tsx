import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User,
  Sparkles,
  Bot,
  MessageSquare,
  Rocket,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Target,
  Zap,
  Users,
  Brain,
  Settings,
  Play
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router-dom';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<{ onNext: () => void; onSkip?: () => void; data: any; setData: (data: any) => void }>;
  required: boolean;
  estimatedTime: string;
}

interface OnboardingData {
  profile: {
    firstName: string;
    lastName: string;
    company: string;
    role: string;
    goals: string[];
  };
  preferences: {
    primaryUseCase: string;
    industry: string;
    teamSize: string;
    features: string[];
  };
  firstAgent: {
    name: string;
    type: string;
    description: string;
  };
}

// Welcome Step Component
function WelcomeStep({ onNext }: { onNext: () => void; onSkip?: () => void; data: any; setData: (data: any) => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
        <Sparkles className="h-10 w-10 text-white" />
      </div>
      <div>
        <h2 className="text-3xl font-bold mb-2">Welcome to Ojastack!</h2>
        <p className="text-lg text-muted-foreground">
          Let's get you set up with your first AI agent in just a few minutes
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <Card className="text-center p-4">
          <Bot className="h-8 w-8 mx-auto mb-2 text-blue-500" />
          <h3 className="font-semibold">Smart Agents</h3>
          <p className="text-sm text-muted-foreground">Create intelligent AI assistants</p>
        </Card>
        <Card className="text-center p-4">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <h3 className="font-semibold">Multi-Channel</h3>
          <p className="text-sm text-muted-foreground">Deploy across platforms</p>
        </Card>
        <Card className="text-center p-4">
          <Zap className="h-8 w-8 mx-auto mb-2 text-purple-500" />
          <h3 className="font-semibold">No-Code</h3>
          <p className="text-sm text-muted-foreground">Build without programming</p>
        </Card>
      </div>
      <Button onClick={onNext} size="lg" className="mt-6">
        Get Started <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

// Profile Step Component
function ProfileStep({ onNext, data, setData }: { onNext: () => void; onSkip?: () => void; data: any; setData: (data: any) => void }) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <User className="h-12 w-12 mx-auto mb-4 text-blue-500" />
        <h2 className="text-2xl font-bold mb-2">Tell us about yourself</h2>
        <p className="text-muted-foreground">This helps us personalize your experience</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={data.profile?.firstName || ''}
              onChange={(e) => setData({
                ...data,
                profile: { ...data.profile, firstName: e.target.value }
              })}
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={data.profile?.lastName || ''}
              onChange={(e) => setData({
                ...data,
                profile: { ...data.profile, lastName: e.target.value }
              })}
              required
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="company">Company (Optional)</Label>
          <Input
            id="company"
            value={data.profile?.company || ''}
            onChange={(e) => setData({
              ...data,
              profile: { ...data.profile, company: e.target.value }
            })}
          />
        </div>
        
        <div>
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            className="w-full border rounded-md px-3 py-2"
            value={data.profile?.role || ''}
            onChange={(e) => setData({
              ...data,
              profile: { ...data.profile, role: e.target.value }
            })}
            required
          >
            <option value="">Select your role</option>
            <option value="founder">Founder/CEO</option>
            <option value="product-manager">Product Manager</option>
            <option value="developer">Developer</option>
            <option value="marketing">Marketing</option>
            <option value="sales">Sales</option>
            <option value="support">Customer Support</option>
            <option value="other">Other</option>
          </select>
        </div>

        <Button type="submit" className="w-full">
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

// Goals Step Component
function GoalsStep({ onNext, data, setData }: { onNext: () => void; onSkip?: () => void; data: any; setData: (data: any) => void }) {
  const goals = [
    { id: 'customer-support', label: 'Customer Support', icon: Users },
    { id: 'lead-generation', label: 'Lead Generation', icon: Target },
    { id: 'sales-assistance', label: 'Sales Assistance', icon: Zap },
    { id: 'internal-automation', label: 'Internal Automation', icon: Settings },
    { id: 'knowledge-management', label: 'Knowledge Management', icon: Brain },
    { id: 'content-creation', label: 'Content Creation', icon: Sparkles }
  ];

  const toggleGoal = (goalId: string) => {
    const currentGoals = data.profile?.goals || [];
    const newGoals = currentGoals.includes(goalId)
      ? currentGoals.filter((g: string) => g !== goalId)
      : [...currentGoals, goalId];
    
    setData({
      ...data,
      profile: { ...data.profile, goals: newGoals }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <Target className="h-12 w-12 mx-auto mb-4 text-purple-500" />
        <h2 className="text-2xl font-bold mb-2">What are your goals?</h2>
        <p className="text-muted-foreground">Select all that apply to get personalized recommendations</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const Icon = goal.icon;
          const isSelected = (data.profile?.goals || []).includes(goal.id);
          
          return (
            <Card
              key={goal.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => toggleGoal(goal.id)}
            >
              <CardContent className="p-4 flex items-center space-x-3">
                <Icon className={`h-6 w-6 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`font-medium ${isSelected ? 'text-blue-900' : ''}`}>
                  {goal.label}
                </span>
                {isSelected && <CheckCircle className="h-5 w-5 text-blue-600 ml-auto" />}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button 
          onClick={onNext}
          disabled={(data.profile?.goals || []).length === 0}
          className="min-w-32"
        >
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Agent Creation Step
function AgentCreationStep({ onNext, data, setData }: { onNext: () => void; onSkip?: () => void; data: any; setData: (data: any) => void }) {
  const navigate = useNavigate();

  const handleCreateAgent = () => {
    // Save onboarding data and redirect to agent creation
    localStorage.setItem('onboarding-data', JSON.stringify(data));
    navigate('/dashboard/agents/create');
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <Rocket className="h-12 w-12 mx-auto mb-4 text-green-500" />
        <h2 className="text-2xl font-bold mb-2">Create Your First Agent</h2>
        <p className="text-muted-foreground">
          Based on your goals, we recommend starting with a customer support agent
        </p>
      </div>

      <Card className="p-6">
        <div className="text-center space-y-4">
          <Bot className="h-16 w-16 mx-auto text-blue-500" />
          <div>
            <h3 className="text-xl font-semibold">Customer Support Agent</h3>
            <p className="text-muted-foreground">
              Handle customer inquiries, provide instant responses, and escalate complex issues
            </p>
          </div>
          <div className="flex justify-center space-x-2">
            <Badge variant="secondary">24/7 Availability</Badge>
            <Badge variant="secondary">Multi-language</Badge>
            <Badge variant="secondary">Knowledge Base</Badge>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <Button onClick={handleCreateAgent} className="w-full" size="lg">
          <Play className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
        <Button variant="outline" onClick={onNext} className="w-full">
          Skip for now
        </Button>
      </div>
    </div>
  );
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Introduction to Ojastack',
    icon: Sparkles,
    component: WelcomeStep,
    required: true,
    estimatedTime: '1 min'
  },
  {
    id: 'profile',
    title: 'Profile Setup',
    description: 'Tell us about yourself',
    icon: User,
    component: ProfileStep,
    required: true,
    estimatedTime: '2 min'
  },
  {
    id: 'goals',
    title: 'Your Goals',
    description: 'What do you want to achieve?',
    icon: Target,
    component: GoalsStep,
    required: false,
    estimatedTime: '1 min'
  },
  {
    id: 'create-agent',
    title: 'First Agent',
    description: 'Create your first AI agent',
    icon: Bot,
    component: AgentCreationStep,
    required: false,
    estimatedTime: '5 min'
  }
];

export default function OnboardingFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    profile: {
      firstName: '',
      lastName: '',
      company: '',
      role: '',
      goals: []
    },
    preferences: {
      primaryUseCase: '',
      industry: '',
      teamSize: '',
      features: []
    },
    firstAgent: {
      name: '',
      type: '',
      description: ''
    }
  });
  const [isCompleted, setIsCompleted] = useState(false);

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const StepComponent = currentStepData?.component;
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  useEffect(() => {
    // Check if user has already completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('onboarding-completed');
    if (hasCompletedOnboarding && user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    // Save onboarding completion
    localStorage.setItem('onboarding-completed', 'true');
    localStorage.setItem('onboarding-data', JSON.stringify(onboardingData));
    setIsCompleted(true);
    
    // Redirect to dashboard after a moment
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome aboard!</h1>
            <p className="text-lg text-gray-600">
              Your account is ready. Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentStepData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">Setup Your Account</h1>
              <Badge variant="outline">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </Badge>
            </div>
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              Skip Setup
            </Button>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>{currentStepData.title}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="min-h-[500px]">
          <CardContent className="p-8">
            {StepComponent && (
              <StepComponent
                onNext={handleNext}
                onSkip={handleSkip}
                data={onboardingData}
                setData={setOnboardingData}
              />
            )}
          </CardContent>
          
          {/* Navigation */}
          <div className="p-6 border-t flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-2">
              {ONBOARDING_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index === currentStep
                      ? 'bg-blue-500'
                      : index < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <div className="w-20"></div> {/* Spacer for alignment */}
          </div>
        </Card>
      </div>
    </div>
  );
}