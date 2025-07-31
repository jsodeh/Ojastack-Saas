import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  Star, 
  Users, 
  Eye, 
  ArrowRight,
  Sparkles,
  MessageSquare,
  Headphones,
  Video,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";

interface AgentTemplate {
  id: string;
  name: string;
  category: 'sales' | 'support' | 'internal' | 'ecommerce' | 'booking' | 'custom';
  description: string;
  icon: string;
  personality: {
    tone: string;
    style: string;
    language: string;
    creativity_level: number;
  };
  features: {
    voice_enabled: boolean;
    video_enabled: boolean;
    multimodal: boolean;
    tools: string[];
    integrations: string[];
  };
  is_featured: boolean;
  usage_count: number;
  rating: number;
}

const categoryIcons = {
  sales: '💼',
  support: '🎧',
  internal: '👥',
  ecommerce: '🛒',
  booking: '📅',
  custom: '⚡'
};

const categoryNames = {
  sales: 'Sales',
  support: 'Customer Support',
  internal: 'Internal Support',
  ecommerce: 'E-commerce',
  booking: 'Appointment Booking',
  custom: 'Custom'
};

export default function TemplateGallery() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterAndSortTemplates();
  }, [templates, searchQuery, selectedCategory, sortBy]);

  const fetchTemplates = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockTemplates: AgentTemplate[] = [
        {
          id: '1',
          name: 'Sales Agent',
          category: 'sales',
          description: 'Intelligent sales assistant that qualifies leads, manages CRM data, and automates follow-ups to boost your conversion rates.',
          icon: '💼',
          personality: {
            tone: 'professional',
            style: 'persuasive',
            language: 'en',
            creativity_level: 60
          },
          features: {
            voice_enabled: true,
            video_enabled: true,
            multimodal: true,
            tools: ['web_search', 'calculator', 'calendar'],
            integrations: ['hubspot', 'salesforce', 'email']
          },
          is_featured: true,
          usage_count: 1250,
          rating: 4.8
        },
        {
          id: '2',
          name: 'Customer Support Agent',
          category: 'support',
          description: 'Comprehensive support assistant that handles tickets, searches knowledge bases, and escalates complex issues seamlessly.',
          icon: '🎧',
          personality: {
            tone: 'helpful',
            style: 'detailed',
            language: 'en',
            creativity_level: 40
          },
          features: {
            voice_enabled: true,
            video_enabled: true,
            multimodal: true,
            tools: ['web_search', 'file_system', 'datetime'],
            integrations: ['zendesk', 'intercom', 'slack']
          },
          is_featured: true,
          usage_count: 980,
          rating: 4.9
        },
        {
          id: '3',
          name: 'Internal Support Agent',
          category: 'internal',
          description: 'Employee assistance agent for HR policies, IT support, and internal processes to streamline workplace operations.',
          icon: '👥',
          personality: {
            tone: 'friendly',
            style: 'concise',
            language: 'en',
            creativity_level: 30
          },
          features: {
            voice_enabled: true,
            video_enabled: false,
            multimodal: true,
            tools: ['file_system', 'datetime', 'web_search'],
            integrations: ['slack', 'teams', 'google_workspace']
          },
          is_featured: false,
          usage_count: 650,
          rating: 4.6
        },
        {
          id: '4',
          name: 'E-commerce Assistant',
          category: 'ecommerce',
          description: 'Shopping assistant that helps customers find products, track orders, and process returns with integrated payment support.',
          icon: '🛒',
          personality: {
            tone: 'enthusiastic',
            style: 'conversational',
            language: 'en',
            creativity_level: 70
          },
          features: {
            voice_enabled: true,
            video_enabled: false,
            multimodal: true,
            tools: ['web_search', 'calculator'],
            integrations: ['shopify', 'stripe', 'email']
          },
          is_featured: true,
          usage_count: 820,
          rating: 4.7
        },
        {
          id: '5',
          name: 'Appointment Booking Agent',
          category: 'booking',
          description: 'Intelligent scheduling assistant that manages calendars, books appointments, and sends automated reminders.',
          icon: '📅',
          personality: {
            tone: 'professional',
            style: 'efficient',
            language: 'en',
            creativity_level: 20
          },
          features: {
            voice_enabled: true,
            video_enabled: true,
            multimodal: true,
            tools: ['datetime', 'calendar'],
            integrations: ['google_calendar', 'outlook', 'calendly']
          },
          is_featured: false,
          usage_count: 450,
          rating: 4.5
        }
      ];

      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTemplates = () => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Sort templates
    switch (sortBy) {
      case 'featured':
        filtered.sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return b.usage_count - a.usage_count;
        });
        break;
      case 'popular':
        filtered.sort((a, b) => b.usage_count - a.usage_count);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    setFilteredTemplates(filtered);
  };

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'voice_enabled': return <Headphones className="h-4 w-4" />;
      case 'video_enabled': return <Video className="h-4 w-4" />;
      case 'multimodal': return <MessageSquare className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Agent Templates</h1>
            <p className="text-muted-foreground">Choose a template to get started quickly</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agent Templates</h1>
          <p className="text-muted-foreground">Choose a template to get started quickly</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/agents/create/custom">
            <Sparkles className="h-4 w-4 mr-2" />
            Create Custom Agent
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="support">Customer Support</SelectItem>
                <SelectItem value="internal">Internal Support</SelectItem>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="booking">Appointment Booking</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters to find the perfect template.
            </p>
            <Button asChild>
              <Link to="/dashboard/agents/create/custom">
                Create Custom Agent
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{template.icon}</div>
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{template.name}</span>
                        {template.is_featured && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {categoryNames[template.category]}
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardDescription className="line-clamp-3">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  {template.features.voice_enabled && (
                    <Badge variant="secondary" className="text-xs">
                      <Headphones className="h-3 w-3 mr-1" />
                      Voice
                    </Badge>
                  )}
                  {template.features.video_enabled && (
                    <Badge variant="secondary" className="text-xs">
                      <Video className="h-3 w-3 mr-1" />
                      Video
                    </Badge>
                  )}
                  {template.features.multimodal && (
                    <Badge variant="secondary" className="text-xs">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Multimodal
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {template.usage_count.toLocaleString()}
                    </div>
                    <div className="flex items-center">
                      <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                      {template.rating}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button size="sm" className="flex-1" asChild>
                    <Link to={`/dashboard/agents/create/${template.id}`}>
                      Use Template
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}