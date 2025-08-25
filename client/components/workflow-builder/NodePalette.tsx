import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Info
} from 'lucide-react';
import { 
  NodeTemplate, 
  WORKFLOW_CATEGORIES,
  NODE_TEMPLATES
} from '@/lib/workflow-types';

interface NodePaletteProps {
  onNodeSelect: (template: NodeTemplate, position: { x: number; y: number }) => void;
}

export default function NodePalette({ onNodeSelect }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Triggers', 'Actions']) // Default expanded categories
  );
  const [selectedTemplate, setSelectedTemplate] = useState<NodeTemplate | null>(null);
  const [draggedTemplate, setDraggedTemplate] = useState<NodeTemplate | null>(null);

  // Filter templates based on search query
  const filteredTemplates = NODE_TEMPLATES.filter(template => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query) ||
      template.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // Group templates by category
  const groupedTemplates = WORKFLOW_CATEGORIES.reduce((acc, category) => {
    acc[category.name] = filteredTemplates.filter(template => template.category === category.name);
    return acc;
  }, {} as Record<string, NodeTemplate[]>);

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, template: NodeTemplate) => {
    setDraggedTemplate(template);
    e.dataTransfer.setData('application/json', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedTemplate(null);
  };

  const handleTemplateClick = (template: NodeTemplate) => {
    setSelectedTemplate(template);
    // Add node at center of canvas
    onNodeSelect(template, { x: 400, y: 300 });
  };

  const getTemplateIcon = (template: NodeTemplate) => {
    return template.icon || '⚙️';
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-8"
          />
        </div>
      </div>

      {/* Node Categories */}
      <div className="flex-1 overflow-y-auto">
        {WORKFLOW_CATEGORIES.map((category) => {
          const categoryTemplates = groupedTemplates[category.name] || [];
          const isExpanded = expandedCategories.has(category.name);
          
          if (categoryTemplates.length === 0 && searchQuery) {
            return null; // Hide empty categories when searching
          }

          return (
            <div key={category.id} className="border-b last:border-b-0">
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto font-medium text-left"
                onClick={() => toggleCategory(category.name)}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{category.icon}</span>
                  <span>{category.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {categoryTemplates.length}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>

              {isExpanded && (
                <div className="pb-2">
                  {categoryTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`mx-2 mb-2 p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm hover:border-blue-300 ${
                        draggedTemplate?.id === template.id ? 'opacity-50' : ''
                      } ${selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, template)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleTemplateClick(template)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-xl">{getTemplateIcon(template)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium truncate">{template.name}</h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getComplexityColor(template.setupComplexity)}`}
                            >
                              {template.setupComplexity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {template.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              {template.inputs.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {template.inputs.length} in
                                </Badge>
                              )}
                              {template.outputs.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {template.outputs.length} out
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              {template.webhookSupport && (
                                <div className="w-2 h-2 bg-green-400 rounded-full" title="Webhook Support" />
                              )}
                              {template.oauthSupport && (
                                <div className="w-2 h-2 bg-blue-400 rounded-full" title="OAuth Support" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* No results message */}
        {searchQuery && Object.values(groupedTemplates).every(templates => templates.length === 0) && (
          <div className="text-center py-8 px-4 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No nodes match your search</p>
            <p className="text-xs">Try different keywords or browse categories</p>
          </div>
        )}
      </div>

      {/* Quick Add Section */}
      <div className="border-t p-3 bg-gray-50">
        <div className="text-xs font-medium text-muted-foreground mb-2">Quick Add</div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              const triggerTemplate = NODE_TEMPLATES.find(t => t.id === 'user_message_trigger');
              if (triggerTemplate) handleTemplateClick(triggerTemplate);
            }}
          >
            💬 Trigger
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              const aiTemplate = NODE_TEMPLATES.find(t => t.id === 'ai_response');
              if (aiTemplate) handleTemplateClick(aiTemplate);
            }}
          >
            🤖 AI Response
          </Button>
        </div>
      </div>

      {/* Template Details Panel */}
      {selectedTemplate && (
        <div className="border-t bg-white">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{selectedTemplate.name}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTemplate(null)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mb-3">
              {selectedTemplate.description}
            </p>

            <div className="space-y-2">
              <div>
                <div className="text-xs font-medium mb-1">Provider</div>
                <Badge variant="outline" className="text-xs">
                  {selectedTemplate.provider || 'Built-in'}
                </Badge>
              </div>

              {selectedTemplate.requirements && selectedTemplate.requirements.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-1">Requirements</div>
                  <div className="space-y-1">
                    {selectedTemplate.requirements.map((req, index) => (
                      <div key={index} className="text-xs text-muted-foreground flex items-center">
                        <Info className="h-3 w-3 mr-1" />
                        {req}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTemplate.features && selectedTemplate.features.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-1">Features</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}