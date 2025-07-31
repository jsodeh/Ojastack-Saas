import React, { useState, useMemo } from 'react';
import { NodeDefinition } from '@/lib/workflow-types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Filter,
  ChevronDown,
  ChevronRight,
  Zap,
  Play,
  GitBranch,
  Database,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodePaletteProps {
  nodeDefinitions: NodeDefinition[];
  onNodeDragStart: (nodeType: string, e: React.DragEvent) => void;
  className?: string;
}

const categoryIcons = {
  triggers: Zap,
  actions: Play,
  conditions: GitBranch,
  integrations: Database,
  utilities: Settings
};

const categoryColors = {
  triggers: '#3B82F6',
  actions: '#10B981',
  conditions: '#F59E0B',
  integrations: '#8B5CF6',
  utilities: '#6B7280'
};

export default function NodePalette({
  nodeDefinitions,
  onNodeDragStart,
  className
}: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['triggers', 'actions'])
  );

  // Group nodes by category
  const nodesByCategory = useMemo(() => {
    const filtered = nodeDefinitions.filter(node =>
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped = filtered.reduce((acc, node) => {
      if (!acc[node.category]) {
        acc[node.category] = [];
      }
      acc[node.category].push(node);
      return acc;
    }, {} as Record<string, NodeDefinition[]>);

    // Sort nodes within each category
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  }, [nodeDefinitions, searchTerm]);

  const categories = Object.keys(nodesByCategory).sort();

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleNodeDragStart = (nodeType: string, e: React.DragEvent) => {
    e.dataTransfer.setData('application/node-type', nodeType);
    e.dataTransfer.effectAllowed = 'copy';
    onNodeDragStart(nodeType, e);
  };

  return (
    <div className={cn('w-80 bg-white border-r border-gray-200 flex flex-col', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-lg mb-3">Node Palette</h3>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="text-xs"
          >
            All
          </Button>
          {categories.map(category => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons];
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(
                  selectedCategory === category ? null : category
                )}
                className="text-xs"
              >
                {Icon && <Icon className="w-3 h-3 mr-1" />}
                {category}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto p-2">
        {categories
          .filter(category => !selectedCategory || category === selectedCategory)
          .map(category => {
            const nodes = nodesByCategory[category];
            const isExpanded = expandedCategories.has(category);
            const Icon = categoryIcons[category as keyof typeof categoryIcons];
            const color = categoryColors[category as keyof typeof categoryColors];

            return (
              <div key={category} className="mb-4">
                {/* Category header */}
                <Button
                  variant="ghost"
                  className="w-full justify-start p-2 h-auto"
                  onClick={() => toggleCategory(category)}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 mr-2" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mr-2" />
                  )}
                  {Icon && <Icon className="w-4 h-4 mr-2" style={{ color }} />}
                  <span className="font-medium capitalize">{category}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {nodes.length}
                  </Badge>
                </Button>

                {/* Category nodes */}
                {isExpanded && (
                  <div className="ml-4 space-y-2">
                    {nodes.map(node => (
                      <Card
                        key={node.id}
                        className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={(e) => handleNodeDragStart(node.type, e)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                            style={{ backgroundColor: node.color }}
                          >
                            {node.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm mb-1 truncate">
                              {node.name}
                            </h4>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {node.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                v{node.version}
                              </Badge>
                              {node.isSystem && (
                                <Badge variant="secondary" className="text-xs">
                                  System
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

        {/* No results */}
        {categories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No nodes found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
        <p>Drag nodes onto the canvas to add them to your workflow</p>
      </div>
    </div>
  );
}