import React, { useState, useEffect } from 'react';
import { AgentPersona, PersonaTemplate } from '@/lib/persona-types';
import { personaService } from '@/lib/persona-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight,
  Sparkles,
  Star,
  Users,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleDefinitionStepProps {
  personaData: Partial<AgentPersona>;
  onUpdate: (data: Partial<AgentPersona>) => void;
  onNext: () => void;
  errors: Record<string, string>;
}

export default function RoleDefinitionStep({
  personaData,
  onUpdate,
  onNext,
  errors
}: RoleDefinitionStepProps) {
  const [name, setName] = useState(personaData.name || '');
  const [role, setRole] = useState(personaData.role || '');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PersonaTemplate | null>(null);
  const [templates, setTemplates] = useState<PersonaTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(true);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const templateList = await personaService.getPersonaTemplates();
      setTemplates(templateList);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: PersonaTemplate) => {
    setSelectedTemplate(template);
    setName(template.name);
    setRole(template.presetConfig.role || '');
    setDescription(template.description);
    setShowTemplates(false);

    // Update persona data with template preset
    const updatedData = {
      ...personaData,
      name: template.name,
      role: template.presetConfig.role || '',
      ...template.presetConfig
    };
    
    onUpdate(updatedData);
  };

  // Handle custom role creation
  const handleCustomRole = () => {
    setSelectedTemplate(null);
    setShowTemplates(false);
    setName('');
    setRole('');
    setDescription('');
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!name.trim() || !role.trim()) {
      return;
    }

    const updatedData = {
      ...personaData,
      name: name.trim(),
      role: role.trim()
    };

    onUpdate(updatedData);
    onNext();
  };

  // Handle input changes
  const handleNameChange = (value: string) => {
    setName(value);
    const updatedData = { ...personaData, name: value.trim() };
    onUpdate(updatedData);
  };

  const handleRoleChange = (value: string) => {
    setRole(value);
    const updatedData = { ...personaData, role: value.trim() };
    onUpdate(updatedData);
  };

  const isValid = name.trim() !== '' && role.trim() !== '';

  if (showTemplates) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Choose a Starting Point</h3>
          <p className="text-gray-600">
            Select a template to get started quickly, or create a custom persona from scratch
          </p>
        </div>

        {/* Custom Option */}
        <Card 
          className="p-4 cursor-pointer hover:shadow-md transition-shadow border-2 border-dashed border-gray-300 hover:border-blue-400"
          onClick={handleCustomRole}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Create Custom Persona</h4>
              <p className="text-sm text-gray-600">
                Build a unique persona tailored to your specific needs
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </Card>

        {/* Templates */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Popular Templates</h4>
          
          {isLoadingTemplates ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <Card
                  key={template.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow hover:border-blue-300"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{template.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {template.name}
                        </h4>
                        {template.isOfficial && (
                          <Badge variant="secondary" className="text-xs">
                            Official
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {template.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {template.usageCount.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {template.rating}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {template.category.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected Template Info */}
      {selectedTemplate && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{selectedTemplate.icon}</div>
            <div>
              <h4 className="font-medium text-blue-900">
                Starting from: {selectedTemplate.name}
              </h4>
              <p className="text-sm text-blue-700">
                You can customize all settings in the following steps
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(true)}
              className="ml-auto"
            >
              Change Template
            </Button>
          </div>
        </Card>
      )}

      {/* Form */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Persona Name */}
          <div className="space-y-2">
            <Label htmlFor="persona-name">
              Persona Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="persona-name"
              placeholder="e.g., Sarah, Alex, Customer Support Bot"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={cn(errors.name && 'border-red-500')}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
            <p className="text-xs text-gray-500">
              This is how your agent will introduce itself to users
            </p>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="persona-role">
              Role/Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="persona-role"
              placeholder="e.g., Customer Service Representative, Sales Assistant"
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className={cn(errors.role && 'border-red-500')}
            />
            {errors.role && (
              <p className="text-sm text-red-600">{errors.role}</p>
            )}
            <p className="text-xs text-gray-500">
              The professional role or function of your agent
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="persona-description">
            Description (Optional)
          </Label>
          <Textarea
            id="persona-description"
            placeholder="Briefly describe what this persona is designed to do and how it should behave..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-gray-500">
            This helps guide the persona's behavior and responses
          </p>
        </div>

        {/* Examples */}
        <Card className="p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Examples</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Customer Service</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• Name: "Sarah"</li>
                <li>• Role: "Customer Service Representative"</li>
                <li>• Focus: Helping customers resolve issues</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Sales Support</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• Name: "Alex"</li>
                <li>• Role: "Sales Assistant"</li>
                <li>• Focus: Product recommendations & sales</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => setShowTemplates(true)}
        >
          Back to Templates
        </Button>
        
        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          className="flex items-center gap-2"
        >
          Continue to Personality
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}