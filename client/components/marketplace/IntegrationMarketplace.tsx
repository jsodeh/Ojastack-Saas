import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Store,
  Search,
  Star,
  Download,
  Users,
  Zap,
  MessageSquare,
  Database,
  Globe,
  Shield,
  Clock,
  CheckCircle,
  ExternalLink,
  Filter,
  Sparkles,
  TrendingUp,
  Award,
  Heart
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Integration {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  provider: string;
  category: 'communication' | 'productivity' | 'analytics' | 'storage' | 'ai' | 'crm';
  status: 'available' | 'installed' | 'coming-soon';
  rating: number;
  reviews: number;
  installs: number;
  price: 'free' | 'premium' | 'enterprise';
  icon: string;
  images: string[];
  features: string[];
  supportedPlatforms: string[];
  setupComplexity: 'easy' | 'moderate' | 'advanced';
  documentation: string;
  website: string;
  tags: string[];
  lastUpdated: Date;
  version: string;
  compatibility: string[];
}

interface IntegrationMarketplaceProps {
  onInstall?: (integration: Integration) => void;
  onConfigure?: (integration: Integration) => void;
}

const INTEGRATION_CATEGORIES = [
  { id: 'all', name: 'All Categories', icon: Store },
  { id: 'communication', name: 'Communication', icon: MessageSquare },
  { id: 'productivity', name: 'Productivity', icon: Zap },
  { id: 'analytics', name: 'Analytics', icon: TrendingUp },
  { id: 'storage', name: 'Storage', icon: Database },
  { id: 'ai', name: 'AI & ML', icon: Sparkles },
  { id: 'crm', name: 'CRM', icon: Users }
];

const MOCK_INTEGRATIONS: Integration[] = [
  {
    id: 'whatsapp-business',
    name: 'WhatsApp Business',
    description: 'Connect your WhatsApp Business account to handle customer conversations through the world\'s most popular messaging platform.',
    shortDescription: 'Customer messaging via WhatsApp',
    provider: 'Meta',
    category: 'communication',
    status: 'installed',
    rating: 4.8,
    reviews: 1247,
    installs: 25000,
    price: 'free',
    icon: '/integrations/whatsapp.png',
    images: [],
    features: ['Message Automation', 'Rich Media', 'Business Profile', 'Analytics'],
    supportedPlatforms: ['Web', 'Mobile'],
    setupComplexity: 'moderate',
    documentation: 'https://developers.facebook.com/docs/whatsapp',
    website: 'https://business.whatsapp.com',
    tags: ['messaging', 'customer-service', 'automation'],
    lastUpdated: new Date('2024-01-10'),
    version: '2.1.0',
    compatibility: ['agent-v2', 'workflows']
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Integrate with Slack to bring AI agents directly into your team workspace for seamless collaboration.',
    shortDescription: 'Team collaboration and AI assistance',
    provider: 'Slack Technologies',
    category: 'communication',
    status: 'installed',
    rating: 4.9,
    reviews: 892,
    installs: 18500,
    price: 'free',
    icon: '/integrations/slack.png',
    images: [],
    features: ['Bot Integration', 'Slash Commands', 'Channel Support', 'DM Support'],
    supportedPlatforms: ['Web', 'Desktop', 'Mobile'],
    setupComplexity: 'easy',
    documentation: 'https://api.slack.com/bot-users',
    website: 'https://slack.com',
    tags: ['team', 'collaboration', 'productivity'],
    lastUpdated: new Date('2024-01-08'),
    version: '1.4.2',
    compatibility: ['agent-v2', 'workflows', 'analytics']
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Deploy AI agents in Discord servers for community management, customer support, and interactive experiences.',
    shortDescription: 'Community engagement on Discord',
    provider: 'Discord Inc.',
    category: 'communication',
    status: 'available',
    rating: 4.6,
    reviews: 634,
    installs: 12300,
    price: 'free',
    icon: '/integrations/discord.png',
    images: [],
    features: ['Server Integration', 'Slash Commands', 'Voice Support', 'Moderation'],
    supportedPlatforms: ['Web', 'Desktop', 'Mobile'],
    setupComplexity: 'moderate',
    documentation: 'https://discord.com/developers/docs',
    website: 'https://discord.com',
    tags: ['gaming', 'community', 'moderation'],
    lastUpdated: new Date('2024-01-05'),
    version: '1.2.1',
    compatibility: ['agent-v2']
  }
];

export default function IntegrationMarketplace({ onInstall, onConfigure }: IntegrationMarketplaceProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'name' | 'recent'>('popular');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch integrations
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations', selectedCategory, searchQuery, sortBy, priceFilter],
    queryFn: async (): Promise<Integration[]> => {
      // Filter and sort mock data
      let filtered = [...MOCK_INTEGRATIONS];
      
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(i => i.category === selectedCategory);
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(i => 
          i.name.toLowerCase().includes(query) ||
          i.description.toLowerCase().includes(query) ||
          i.tags.some(tag => tag.includes(query))
        );
      }
      
      if (priceFilter !== 'all') {
        filtered = filtered.filter(i => i.price === priceFilter);
      }
      
      // Sort
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'popular': return b.installs - a.installs;
          case 'rating': return b.rating - a.rating;
          case 'name': return a.name.localeCompare(b.name);
          case 'recent': return b.lastUpdated.getTime() - a.lastUpdated.getTime();
          default: return 0;
        }
      });
      
      return filtered;
    }
  });

  const handleInstallIntegration = (integration: Integration) => {
    toast.success(`Installing ${integration.name}...`);
    onInstall?.(integration);
  };

  const handleConfigureIntegration = (integration: Integration) => {
    onConfigure?.(integration);
  };

  const getStatusBadge = (status: Integration['status']) => {
    const variants = {
      'available': { variant: 'default' as const, text: 'Available' },
      'installed': { variant: 'secondary' as const, text: 'Installed' },
      'coming-soon': { variant: 'outline' as const, text: 'Coming Soon' }
    };
    return variants[status];
  };

  const getPriceBadge = (price: Integration['price']) => {
    const variants = {
      'free': { variant: 'secondary' as const, text: 'Free' },
      'premium': { variant: 'default' as const, text: 'Premium' },
      'enterprise': { variant: 'outline' as const, text: 'Enterprise' }
    };
    return variants[price];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-8 h-8" />
            Integration Marketplace
          </h3>
          <p className="text-muted-foreground">
            Discover and install integrations to extend your platform capabilities
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={setSortBy as any}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="recent">Recent</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={priceFilter} onValueChange={setPriceFilter as any}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Categories Sidebar */}
        <div className="lg:w-64">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {INTEGRATION_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted/50 transition-colors",
                        selectedCategory === category.id && "bg-muted text-primary"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Integrations Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted h-48 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : integrations && integrations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.map((integration) => (
                <Card key={integration.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={integration.icon} />
                          <AvatarFallback>{integration.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{integration.provider}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge {...getStatusBadge(integration.status)} />
                        <Badge {...getPriceBadge(integration.price)} />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {integration.shortDescription}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{integration.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        <span>{integration.installs.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {integration.features.slice(0, 2).map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {integration.features.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{integration.features.length - 2} more
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      {integration.status === 'installed' ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleConfigureIntegration(integration)}
                        >
                          Configure
                        </Button>
                      ) : integration.status === 'available' ? (
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleInstallIntegration(integration)}
                        >
                          Install
                        </Button>
                      ) : (
                        <Button size="sm" className="flex-1" disabled>
                          Coming Soon
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedIntegration(integration);
                          setShowDetails(true);
                        }}
                      >
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No integrations found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or browse different categories.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Integration Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedIntegration && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={selectedIntegration.icon} />
                    <AvatarFallback>{selectedIntegration.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{selectedIntegration.name}</DialogTitle>
                    <DialogDescription>by {selectedIntegration.provider}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Badge {...getStatusBadge(selectedIntegration.status)} />
                  <Badge {...getPriceBadge(selectedIntegration.price)} />
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{selectedIntegration.rating}</span>
                    <span className="text-muted-foreground">({selectedIntegration.reviews} reviews)</span>
                  </div>
                </div>
                
                <p className="text-muted-foreground">{selectedIntegration.description}</p>
                
                <div>
                  <h4 className="font-semibold mb-2">Features</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedIntegration.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Setup Complexity</h4>
                    <Badge variant="outline" className="capitalize">
                      {selectedIntegration.setupComplexity}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Version</h4>
                    <Badge variant="outline">{selectedIntegration.version}</Badge>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  {selectedIntegration.status === 'installed' ? (
                    <Button 
                      className="flex-1"
                      onClick={() => handleConfigureIntegration(selectedIntegration)}
                    >
                      Configure Integration
                    </Button>
                  ) : selectedIntegration.status === 'available' ? (
                    <Button 
                      className="flex-1"
                      onClick={() => handleInstallIntegration(selectedIntegration)}
                    >
                      Install Integration
                    </Button>
                  ) : (
                    <Button className="flex-1" disabled>
                      Coming Soon
                    </Button>
                  )}
                  <Button variant="outline" asChild>
                    <a href={selectedIntegration.website} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Website
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}