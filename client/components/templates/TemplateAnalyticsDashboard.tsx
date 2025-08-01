/**
 * Template Analytics Dashboard
 * Provides comprehensive analytics for template marketplace performance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Download,
  Star,
  Users,
  Eye,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Award,
  Target,
  Zap
} from 'lucide-react';

interface TemplateAnalytics {
  // Overview metrics
  totalTemplates: number;
  totalDownloads: number;
  totalRatings: number;
  averageRating: number;
  activeUsers: number;
  
  // Growth metrics
  templatesGrowth: number;
  downloadsGrowth: number;
  usersGrowth: number;
  
  // Top performing templates
  topTemplates: Array<{
    id: string;
    name: string;
    category: string;
    downloads: number;
    rating: number;
    growth: number;
  }>;
  
  // Category performance
  categoryStats: Array<{
    category: string;
    templateCount: number;
    downloads: number;
    averageRating: number;
    growth: number;
  }>;
  
  // User engagement
  userEngagement: {
    dailyActiveUsers: number;
    averageSessionTime: number;
    bounceRate: number;
    conversionRate: number;
  };
  
  // Time series data
  downloadTrends: Array<{
    date: string;
    downloads: number;
    newTemplates: number;
    activeUsers: number;
  }>;
  
  // Geographic data
  geographicData: Array<{
    country: string;
    users: number;
    downloads: number;
    topCategory: string;
  }>;
}

interface TemplateAnalyticsDashboardProps {
  className?: string;
}

export const TemplateAnalyticsDashboard: React.FC<TemplateAnalyticsDashboardProps> = ({
  className = ''
}) => {
  const [analytics, setAnalytics] = useState<TemplateAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'downloads' | 'users' | 'ratings'>('downloads');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Simulate API call - replace with actual analytics service
      const mockAnalytics: TemplateAnalytics = {
        totalTemplates: 247,
        totalDownloads: 15420,
        totalRatings: 3891,
        averageRating: 4.3,
        activeUsers: 1205,
        
        templatesGrowth: 12.5,
        downloadsGrowth: 23.8,
        usersGrowth: 18.2,
        
        topTemplates: [
          {
            id: '1',
            name: 'Customer Support Assistant',
            category: 'Customer Service',
            downloads: 2341,
            rating: 4.8,
            growth: 15.2
          },
          {
            id: '2',
            name: 'Sales Lead Qualifier',
            category: 'Sales',
            downloads: 1987,
            rating: 4.6,
            growth: 22.1
          },
          {
            id: '3',
            name: 'E-commerce Helper',
            category: 'E-commerce',
            downloads: 1654,
            rating: 4.5,
            growth: 8.7
          },
          {
            id: '4',
            name: 'HR Onboarding Bot',
            category: 'HR',
            downloads: 1432,
            rating: 4.4,
            growth: 31.5
          },
          {
            id: '5',
            name: 'Technical Support Agent',
            category: 'Support',
            downloads: 1298,
            rating: 4.7,
            growth: 19.3
          }
        ],
        
        categoryStats: [
          {
            category: 'Customer Service',
            templateCount: 45,
            downloads: 4521,
            averageRating: 4.4,
            growth: 18.2
          },
          {
            category: 'Sales',
            templateCount: 38,
            downloads: 3987,
            averageRating: 4.3,
            growth: 25.1
          },
          {
            category: 'E-commerce',
            templateCount: 32,
            downloads: 2876,
            averageRating: 4.2,
            growth: 12.8
          },
          {
            category: 'Support',
            templateCount: 29,
            downloads: 2341,
            averageRating: 4.5,
            growth: 21.4
          },
          {
            category: 'HR',
            templateCount: 24,
            downloads: 1695,
            averageRating: 4.1,
            growth: 33.7
          }
        ],
        
        userEngagement: {
          dailyActiveUsers: 342,
          averageSessionTime: 8.5,
          bounceRate: 23.1,
          conversionRate: 12.8
        },
        
        downloadTrends: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          downloads: Math.floor(Math.random() * 200) + 300,
          newTemplates: Math.floor(Math.random() * 5),
          activeUsers: Math.floor(Math.random() * 100) + 200
        })),
        
        geographicData: [
          { country: 'United States', users: 456, downloads: 5432, topCategory: 'Customer Service' },
          { country: 'United Kingdom', users: 234, downloads: 2876, topCategory: 'Sales' },
          { country: 'Germany', users: 198, downloads: 2341, topCategory: 'E-commerce' },
          { country: 'Canada', users: 167, downloads: 1987, topCategory: 'Support' },
          { country: 'Australia', users: 145, downloads: 1654, topCategory: 'HR' }
        ]
      };
      
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatGrowth = (growth: number): string => {
    return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    growth: number,
    icon: React.ReactNode,
    description?: string
  ) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          {growth > 0 ? (
            <TrendingUp className="h-3 w-3 text-green-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <span className={growth > 0 ? 'text-green-500' : 'text-red-500'}>
            {formatGrowth(growth)}
          </span>
          <span>from last period</span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  const renderTopTemplatesTable = () => (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Templates</CardTitle>
        <CardDescription>Most downloaded templates in the selected period</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {analytics?.topTemplates.map((template, index) => (
            <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-gray-600">{template.category}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="font-medium">{formatNumber(template.downloads)}</div>
                  <div className="text-gray-500">Downloads</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="font-medium">{template.rating}</span>
                  </div>
                  <div className="text-gray-500">Rating</div>
                </div>
                
                <div className="text-center">
                  <div className={`font-medium ${template.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatGrowth(template.growth)}
                  </div>
                  <div className="text-gray-500">Growth</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderCategoryPerformance = () => (
    <Card>
      <CardHeader>
        <CardTitle>Category Performance</CardTitle>
        <CardDescription>Performance breakdown by template category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {analytics?.categoryStats.map((category) => (
            <div key={category.category} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">{category.category}</h4>
                  <Badge variant="outline" className="text-xs">
                    {category.templateCount} templates
                  </Badge>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span>{formatNumber(category.downloads)} downloads</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span>{category.averageRating}</span>
                  </div>
                  <span className={`${category.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatGrowth(category.growth)}
                  </span>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(category.downloads / Math.max(...analytics.categoryStats.map(c => c.downloads))) * 100}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderEngagementMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics?.userEngagement.dailyActiveUsers}</div>
          <p className="text-xs text-muted-foreground">
            Users who interacted with templates today
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Session Time</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics?.userEngagement.averageSessionTime}m</div>
          <p className="text-xs text-muted-foreground">
            Average time spent browsing templates
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics?.userEngagement.bounceRate}%</div>
          <p className="text-xs text-muted-foreground">
            Users who left without interaction
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics?.userEngagement.conversionRate}%</div>
          <p className="text-xs text-muted-foreground">
            Visitors who downloaded templates
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderGeographicData = () => (
    <Card>
      <CardHeader>
        <CardTitle>Geographic Distribution</CardTitle>
        <CardDescription>Template usage by country</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {analytics?.geographicData.map((country) => (
            <div key={country.country} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">{country.country}</h4>
                <p className="text-sm text-gray-600">Top category: {country.topCategory}</p>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="font-medium">{country.users}</div>
                  <div className="text-gray-500">Users</div>
                </div>
                
                <div className="text-center">
                  <div className="font-medium">{formatNumber(country.downloads)}</div>
                  <div className="text-gray-500">Downloads</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load analytics data</p>
        <Button onClick={loadAnalytics} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Template Analytics</h1>
          <p className="text-gray-600">Insights into template marketplace performance</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {renderMetricCard(
          'Total Templates',
          analytics.totalTemplates,
          analytics.templatesGrowth,
          <Award className="h-4 w-4 text-muted-foreground" />
        )}
        
        {renderMetricCard(
          'Total Downloads',
          formatNumber(analytics.totalDownloads),
          analytics.downloadsGrowth,
          <Download className="h-4 w-4 text-muted-foreground" />
        )}
        
        {renderMetricCard(
          'Active Users',
          formatNumber(analytics.activeUsers),
          analytics.usersGrowth,
          <Users className="h-4 w-4 text-muted-foreground" />
        )}
        
        {renderMetricCard(
          'Total Ratings',
          formatNumber(analytics.totalRatings),
          12.3,
          <Star className="h-4 w-4 text-muted-foreground" />
        )}
        
        {renderMetricCard(
          'Avg. Rating',
          analytics.averageRating.toFixed(1),
          2.1,
          <Star className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderTopTemplatesTable()}
            {renderCategoryPerformance()}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {renderTopTemplatesTable()}
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          {renderCategoryPerformance()}
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          {renderEngagementMetrics()}
          
          <Card>
            <CardHeader>
              <CardTitle>Engagement Trends</CardTitle>
              <CardDescription>User engagement metrics over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <BarChart3 className="h-8 w-8 mr-2" />
                Chart visualization would go here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-6">
          {renderGeographicData()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TemplateAnalyticsDashboard;