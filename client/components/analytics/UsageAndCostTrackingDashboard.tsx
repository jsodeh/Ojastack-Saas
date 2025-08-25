import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  TrendingUp,
  Database,
  MessageSquare,
  Cpu,
  HardDrive,
  Zap,
  Users,
  Calendar,
  CreditCard,
  AlertTriangle,
  Info,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface UsageMetrics {
  period: string;
  conversations: {
    total: number;
    limit: number;
    cost: number;
    costPerUnit: number;
  };
  aiTokens: {
    total: number;
    limit: number;
    cost: number;
    costPerUnit: number;
  };
  storage: {
    used: number;
    limit: number;
    cost: number;
    costPerUnit: number;
  };
  apiCalls: {
    total: number;
    limit: number;
    cost: number;
    costPerUnit: number;
  };
}

interface BillingInfo {
  currentPlan: string;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string;
  totalCost: number;
  breakdown: Array<{
    category: string;
    cost: number;
    usage: number;
    limit: number;
    description: string;
  }>;
  credits: {
    available: number;
    used: number;
    total: number;
  };
}

interface CostProjection {
  current: number;
  projected: number;
  trend: 'up' | 'down' | 'stable';
  recommendation: string;
}

const UsageCard = ({ 
  title, 
  used, 
  limit, 
  cost, 
  icon, 
  unit = '',
  color = 'blue' 
}: {
  title: string;
  used: number;
  limit: number;
  cost: number;
  icon: React.ReactNode;
  unit?: string;
  color?: 'blue' | 'green' | 'orange' | 'red';
}) => {
  const percentage = (used / limit) * 100;
  const isNearLimit = percentage > 80;
  const isOverLimit = percentage > 100;
  
  return (
    <Card className={cn(
      "border-l-4",
      color === 'blue' && "border-l-blue-500",
      color === 'green' && "border-l-green-500", 
      color === 'orange' && "border-l-orange-500",
      color === 'red' && "border-l-red-500",
      isOverLimit && "border-l-red-500"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          {(isNearLimit || isOverLimit) && (
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{used.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">
              of {limit.toLocaleString()} {unit}
            </span>
          </div>
          
          <Progress 
            value={Math.min(percentage, 100)} 
            className={cn(
              "w-full h-2",
              isOverLimit ? "bg-red-100" : isNearLimit ? "bg-orange-100" : ""
            )}
          />
          
          <div className="flex items-center justify-between text-sm">
            <span className={cn(
              "font-medium",
              isOverLimit ? "text-red-600" : isNearLimit ? "text-orange-600" : "text-muted-foreground"
            )}>
              {percentage.toFixed(1)}% used
            </span>
            <span className="font-bold text-green-600">${cost.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function UsageAndCostTrackingDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [viewType, setViewType] = useState<'overview' | 'detailed' | 'projections'>('overview');

  // Fetch usage metrics
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['usage-metrics', selectedPeriod],
    queryFn: async (): Promise<UsageMetrics> => {
      // Mock data - replace with actual API call
      return {
        period: selectedPeriod === 'current' ? 'December 2024' : 'Last 30 days',
        conversations: {
          total: 2847,
          limit: 5000,
          cost: 284.70,
          costPerUnit: 0.10
        },
        aiTokens: {
          total: 1250000,
          limit: 2000000,
          cost: 125.00,
          costPerUnit: 0.0001
        },
        storage: {
          used: 15.6,
          limit: 50,
          cost: 7.80,
          costPerUnit: 0.50
        },
        apiCalls: {
          total: 18500,
          limit: 25000,
          cost: 37.00,
          costPerUnit: 0.002
        }
      };
    }
  });

  // Fetch billing information
  const { data: billing } = useQuery({
    queryKey: ['billing-info'],
    queryFn: async (): Promise<BillingInfo> => {
      return {
        currentPlan: 'Professional',
        billingCycle: 'monthly',
        nextBillingDate: '2024-01-15',
        totalCost: 454.50,
        breakdown: [
          { 
            category: 'Conversations', 
            cost: 284.70, 
            usage: 2847, 
            limit: 5000,
            description: 'AI-powered conversation handling'
          },
          { 
            category: 'AI Processing', 
            cost: 125.00, 
            usage: 1250000, 
            limit: 2000000,
            description: 'Token usage for AI responses'
          },
          { 
            category: 'API Calls', 
            cost: 37.00, 
            usage: 18500, 
            limit: 25000,
            description: 'REST API and webhook calls'
          },
          { 
            category: 'Storage', 
            cost: 7.80, 
            usage: 15.6, 
            limit: 50,
            description: 'Document and data storage'
          }
        ],
        credits: {
          available: 250,
          used: 150,
          total: 400
        }
      };
    }
  });

  // Fetch cost projections
  const { data: projections } = useQuery({
    queryKey: ['cost-projections', selectedPeriod],
    queryFn: async (): Promise<CostProjection> => {
      return {
        current: 454.50,
        projected: 523.80,
        trend: 'up',
        recommendation: 'Consider upgrading to Enterprise plan for better rates at current usage levels'
      };
    }
  });

  const exportUsageReport = () => {
    const reportData = {
      period: selectedPeriod,
      usage,
      billing,
      projections,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-report-${selectedPeriod}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Usage & Costs</h3>
          <p className="text-muted-foreground">
            Monitor your platform usage, costs, and billing information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Month</SelectItem>
              <SelectItem value="last30">Last 30 Days</SelectItem>
              <SelectItem value="last90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportUsageReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Current Usage Overview */}
      {usage && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <UsageCard
              title="Conversations"
              used={usage.conversations.total}
              limit={usage.conversations.limit}
              cost={usage.conversations.cost}
              icon={<MessageSquare className="w-5 h-5 text-blue-500" />}
              color="blue"
            />
            <UsageCard
              title="AI Tokens"
              used={usage.aiTokens.total}
              limit={usage.aiTokens.limit}
              cost={usage.aiTokens.cost}
              icon={<Zap className="w-5 h-5 text-green-500" />}
              unit="tokens"
              color="green"
            />
            <UsageCard
              title="Storage"
              used={usage.storage.used}
              limit={usage.storage.limit}
              cost={usage.storage.cost}
              icon={<HardDrive className="w-5 h-5 text-orange-500" />}
              unit="GB"
              color="orange"
            />
            <UsageCard
              title="API Calls"
              used={usage.apiCalls.total}
              limit={usage.apiCalls.limit}
              cost={usage.apiCalls.cost}
              icon={<Cpu className="w-5 h-5 text-purple-500" />}
              color="blue"
            />
          </div>

          {/* Alerts and Notifications */}
          <div className="space-y-3">
            {usage.conversations.total / usage.conversations.limit > 0.8 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You've used {((usage.conversations.total / usage.conversations.limit) * 100).toFixed(1)}% of your conversation limit. 
                  Consider upgrading your plan to avoid service interruption.
                </AlertDescription>
              </Alert>
            )}
            
            {projections && projections.trend === 'up' && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  Your projected monthly cost is ${projections.projected.toFixed(2)}, 
                  ${(projections.projected - projections.current).toFixed(2)} higher than current usage.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </>
      )}

      <Tabs value={viewType} onValueChange={setViewType as any}>
        <TabsList>
          <TabsTrigger value="overview">Billing Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Breakdown</TabsTrigger>
          <TabsTrigger value="projections">Cost Projections</TabsTrigger>
        </TabsList>

        {/* Billing Overview */}
        <TabsContent value="overview" className="space-y-4">
          {billing && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Current Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold">{billing.currentPlan}</h3>
                      <p className="text-muted-foreground capitalize">{billing.billingCycle} billing</p>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Next billing date:</span>
                      <span className="font-medium">
                        {new Date(billing.nextBillingDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current period total:</span>
                      <span className="font-bold text-green-600">${billing.totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Credits Balance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      ${billing.credits.available}
                    </div>
                    <p className="text-sm text-muted-foreground">Available Credits</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Used</span>
                      <span>${billing.credits.used} of ${billing.credits.total}</span>
                    </div>
                    <Progress 
                      value={(billing.credits.used / billing.credits.total) * 100} 
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Detailed Breakdown */}
        <TabsContent value="detailed" className="space-y-4">
          {billing && (
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>Detailed usage and costs by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {billing.breakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.category}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <div className="mt-2">
                          <Progress 
                            value={(item.usage / item.limit) * 100} 
                            className="w-full h-2"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.usage.toLocaleString()} / {item.limit.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold">${item.cost.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">
                          {((item.cost / billing.totalCost) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cost Projections */}
        <TabsContent value="projections" className="space-y-4">
          {projections && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Cost Projection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Current Month</span>
                      <span className="text-lg font-bold">${projections.current.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Projected Next Month</span>
                      <span className={cn(
                        "text-lg font-bold",
                        projections.trend === 'up' ? 'text-orange-600' : 'text-green-600'
                      )}>
                        ${projections.projected.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span>Difference</span>
                        <span className={cn(
                          "text-lg font-bold",
                          projections.trend === 'up' ? 'text-orange-600' : 'text-green-600'
                        )}>
                          {projections.trend === 'up' ? '+' : ''}
                          ${(projections.projected - projections.current).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {projections.recommendation}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium">Optimization Tips:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Monitor usage patterns to identify peak periods</li>
                      <li>• Consider upgrading during high usage months</li>
                      <li>• Use credits during peak usage to reduce costs</li>
                      <li>• Review conversation flows for efficiency</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}