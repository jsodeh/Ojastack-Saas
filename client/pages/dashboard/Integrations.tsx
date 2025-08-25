import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Store,
  Plug,
  Settings,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Star,
  Download,
  Zap,
  Shield,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  version: string;
  status: 'connected' | 'available' | 'error';
  popularity: number;
  rating: number;
  downloads: number;
  icon: string;
  tags: string[];
  features: string[];
  requirements: string[];
  pricingModel: 'free' | 'freemium' | 'paid';
  documentationUrl?: string;
  setupComplexity: 'easy' | 'medium' | 'advanced';
}

interface Credential {
  id: string;
  name: string;
  integrationId: string;
  type: 'api_key' | 'oauth' | 'webhook' | 'token';
  status: 'active' | 'expired' | 'invalid';
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
}

const SAMPLE_INTEGRATIONS: Integration[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Connect your agents to Slack channels for seamless team communication',
    category: 'Communication',
    provider: 'Slack Technologies',
    version: '2.1.0',
    status: 'connected',
    popularity: 95,
    rating: 4.8,
    downloads: 12500,
    icon: '🔧',
    tags: ['messaging', 'team', 'notifications'],
    features: ['Real-time messaging', 'Channel integration', 'Bot commands'],
    requirements: ['Slack workspace admin access'],
    pricingModel: 'free',
    setupComplexity: 'easy'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Integrate WhatsApp Business API for customer communications',
    category: 'Communication',
    provider: 'Meta',
    version: '1.0.0',
    status: 'available',
    popularity: 88,
    rating: 4.6,
    downloads: 8900,
    icon: '💬',
    tags: ['messaging', 'customer service', 'mobile'],
    features: ['Message templates', 'Media support', 'Broadcast lists'],
    requirements: ['WhatsApp Business account', 'Phone verification'],
    pricingModel: 'paid',
    setupComplexity: 'medium'
  },
  {
    id: 'openai',
    name: 'OpenAI GPT-4',
    description: 'Power your agents with OpenAI\'s advanced language models',
    category: 'AI & ML',
    provider: 'OpenAI',
    version: '4.0.1',
    status: 'connected',
    popularity: 98,
    rating: 4.9,
    downloads: 25000,
    icon: '🤖',
    tags: ['ai', 'nlp', 'gpt'],
    features: ['GPT-4 Turbo', 'Function calling', 'Vision capabilities'],
    requirements: ['OpenAI API key'],
    pricingModel: 'paid',
    setupComplexity: 'easy'
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Automate workflows with thousands of app integrations',
    category: 'Automation',
    provider: 'Zapier Inc.',
    version: '1.2.3',
    status: 'available',
    popularity: 75,
    rating: 4.4,
    downloads: 5600,
    icon: '⚡',
    tags: ['automation', 'workflow', 'productivity'],
    features: ['Trigger automation', 'Multi-step zaps', 'Custom webhooks'],
    requirements: ['Zapier account'],
    pricingModel: 'freemium',
    setupComplexity: 'medium'
  }
];

const SAMPLE_CREDENTIALS: Credential[] = [
  {
    id: 'cred_1',
    name: 'OpenAI Production Key',
    integrationId: 'openai',
    type: 'api_key',
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z',
    lastUsed: '2024-01-22T14:20:00Z'
  },
  {
    id: 'cred_2',
    name: 'Slack Bot Token',
    integrationId: 'slack',
    type: 'oauth',
    status: 'active',
    createdAt: '2024-01-10T09:15:00Z',
    lastUsed: '2024-01-22T11:45:00Z'
  }
];

export default function Integrations() {
  const [activeTab, setActiveTab] = useState('marketplace');
  const [integrations, setIntegrations] = useState<Integration[]>(SAMPLE_INTEGRATIONS);
  const [credentials, setCredentials] = useState<Credential[]>(SAMPLE_CREDENTIALS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCredentials, setShowCredentials] = useState<{[key: string]: boolean}>({});

  const categories = ['all', ...new Set(integrations.map(i => i.category))];
  
  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleConnect = (integrationId: string) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === integrationId 
        ? { ...integration, status: 'connected' as const }
        : integration
    ));
  };

  const handleDisconnect = (integrationId: string) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === integrationId 
        ? { ...integration, status: 'available' as const }
        : integration
    ));
  };

  const toggleCredentialVisibility = (credId: string) => {
    setShowCredentials(prev => ({ ...prev, [credId]: !prev[credId] }));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">
            Connect external services to enhance your AI agents
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Zap className="h-3 w-3" />
            <span>{integrations.filter(i => i.status === 'connected').length} Active</span>
          </Badge>
          <Button variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Documentation
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="marketplace" className="flex items-center space-x-2">
            <Store className="h-4 w-4" />
            <span>Marketplace</span>
          </TabsTrigger>
          <TabsTrigger value="connected" className="flex items-center space-x-2">
            <Plug className="h-4 w-4" />
            <span>Connected</span>
          </TabsTrigger>
          <TabsTrigger value="credentials" className="flex items-center space-x-2">
            <Key className="h-4 w-4" />
            <span>Credentials</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border rounded-md px-3 py-2 bg-background"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Integration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration) => (
              <Card key={integration.id} className="hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{integration.icon}</div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {integration.provider} • v{integration.version}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={
                      integration.status === 'connected' ? 'bg-green-100 text-green-800' :
                      integration.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {integration.status === 'connected' ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                      ) : integration.status === 'error' ? (
                        <><XCircle className="h-3 w-3 mr-1" /> Error</>
                      ) : (
                        'Available'
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {integration.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{integration.rating}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Download className="h-3 w-3" />
                      <span>{integration.downloads.toLocaleString()}</span>
                    </div>
                    <Badge 
                      variant={
                        integration.pricingModel === 'free' ? 'secondary' :
                        integration.pricingModel === 'freemium' ? 'outline' : 'default'
                      }
                      className="text-xs"
                    >
                      {integration.pricingModel}
                    </Badge>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    {integration.status === 'connected' ? (
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDisconnect(integration.id)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleConnect(integration.id)}
                      >
                        <Plug className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="connected" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {integrations
              .filter(integration => integration.status === 'connected')
              .map((integration) => (
                <Card key={integration.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{integration.icon}</div>
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          <CardDescription>
                            Connected • Last used 2 hours ago
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch defaultChecked />
                        <Settings className="h-4 w-4 text-muted-foreground cursor-pointer" />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold">156</div>
                        <div className="text-xs text-muted-foreground">API Calls</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">99.2%</div>
                        <div className="text-xs text-muted-foreground">Uptime</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">45ms</div>
                        <div className="text-xs text-muted-foreground">Avg Response</div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        View Logs
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        Test Connection
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">API Credentials</h3>
              <p className="text-sm text-muted-foreground">
                Manage your integration credentials securely
              </p>
            </div>
            <Button>
              <Key className="h-4 w-4 mr-2" />
              Add Credential
            </Button>
          </div>

          <div className="space-y-4">
            {credentials.map((credential) => {
              const integration = integrations.find(i => i.id === credential.integrationId);
              return (
                <Card key={credential.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-xl">{integration?.icon}</div>
                        <div>
                          <div className="font-medium">{credential.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {integration?.name} • {credential.type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Badge className={
                          credential.status === 'active' ? 'bg-green-100 text-green-800' :
                          credential.status === 'expired' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {credential.status}
                        </Badge>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCredentialVisibility(credential.id)}
                        >
                          {showCredentials[credential.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Created</div>
                        <div>{new Date(credential.createdAt).toLocaleDateString()}</div>
                      </div>
                      {credential.lastUsed && (
                        <div>
                          <div className="text-muted-foreground">Last Used</div>
                          <div>{new Date(credential.lastUsed).toLocaleDateString()}</div>
                        </div>
                      )}
                      {credential.expiresAt && (
                        <div>
                          <div className="text-muted-foreground">Expires</div>
                          <div>{new Date(credential.expiresAt).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>

                    {showCredentials[credential.id] && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center justify-between">
                          <code className="text-sm">sk-proj-*********************</code>
                          <Button size="sm" variant="outline">
                            Copy
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}