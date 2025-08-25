import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Search,
  Star,
  Users,
  MessageSquare,
  Mic,
  Image,
  Video
} from 'lucide-react';

import { useAgentCreation } from '../AgentCreationContext';
import { 
  fetchAgentTemplates, 
  type AgentTemplate, 
  getCapabilityLabels 
} from '@/lib/agent-service';

import { StepProps } from '../AgentCreationWizard';

export default function TemplateSelectionStep({ onNext, onPrevious }: StepProps) {
  const { state, setTemplate, setAgentInfo } = useAgentCreation();
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(state.template || null);
  const [customMode, setCustomMode] = useState(!state.template);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const templatesData = await fetchAgentTemplates({ 
        sortBy: 'rating', 
        sortOrder: 'desc' 
      });
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setTemplate(template);
    setCustomMode(false);
  };

  const handleCustomMode = () => {
    setSelectedTemplate(null);
    setCustomMode(true);
    // Clear template from state but keep any existing agent info
    if (state.agentName || state.agentDescription) {
      setAgentInfo(state.agentName, state.agentDescription);
    }
  };

  const handleAgentInfoChange = (name: string, description: string) => {
    setAgentInfo(name, description);
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="flex items-center space-x-4">
        <Button
          variant={!customMode ? 'default' : 'outline'}
          onClick={() => setCustomMode(false)}
          className="flex items-center space-x-2"
        >
          <Sparkles className="h-4 w-4" />
          <span>Use Template</span>
        </Button>
        <Button
          variant={customMode ? 'default' : 'outline'}
          onClick={handleCustomMode}
          className="flex items-center space-x-2"
        >
          <span>Start from Scratch</span>
        </Button>
      </div>

      {customMode ? (
        /* Custom Agent Creation */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Custom Agent</CardTitle>
              <CardDescription>
                Build your agent from scratch with complete customization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent Name *</Label>
                <Input
                  id="agent-name"
                  placeholder="Enter your agent's name"
                  value={state.agentName}
                  onChange={(e) => handleAgentInfoChange(e.target.value, state.agentDescription)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agent-description">Description</Label>
                <Textarea
                  id="agent-description"
                  placeholder="Describe what your agent does and how it helps users"
                  value={state.agentDescription}
                  onChange={(e) => handleAgentInfoChange(state.agentName, e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Template Selection */
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-3 bg-muted rounded w-full"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => {
                const capabilities = getCapabilityLabels(template.capabilities);
                const isSelected = selectedTemplate?.id === template.id;

                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary border-primary' : ''
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            {template.featured && (
                              <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="mb-2">{template.category}</Badge>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        {/* Capabilities */}
                        <div className="flex flex-wrap gap-1">
                          {capabilities.map(capability => (
                            <Badge key={capability} variant="secondary" className="text-xs">
                              {capability === 'Text' && <MessageSquare className="h-3 w-3 mr-1" />}
                              {capability === 'Voice' && <Mic className="h-3 w-3 mr-1" />}
                              {capability === 'Image' && <Image className="h-3 w-3 mr-1" />}
                              {capability === 'Video' && <Video className="h-3 w-3 mr-1" />}
                              {capability}
                            </Badge>
                          ))}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{template.rating.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{template.usage_count.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Selected Template Info */}
          {selectedTemplate && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Selected: {selectedTemplate.name}</span>
                  {selectedTemplate.featured && (
                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  You can customize this template in the following steps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-agent-name">Agent Name</Label>
                    <Input
                      id="template-agent-name"
                      value={state.agentName}
                      onChange={(e) => handleAgentInfoChange(e.target.value, state.agentDescription)}
                      placeholder="Customize the agent name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="template-agent-description">Description</Label>
                    <Textarea
                      id="template-agent-description"
                      value={state.agentDescription}
                      onChange={(e) => handleAgentInfoChange(state.agentName, e.target.value)}
                      placeholder="Customize the agent description"
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}