import React, { useState, useEffect } from 'react';
import { AgentTemplate, CustomizationOption, templateManager } from '@/lib/template-manager';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Save,
  Plus,
  X,
  Eye,
  Settings,
  Image,
  Code,
  FileText,
  Palette,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateEditorProps {
  template?: AgentTemplate;
  onSave?: (template: AgentTemplate) => void;
  onCancel?: () => void;
  userId: string;
  className?: string;
}

export default function TemplateEditor({
  template,
  onSave,
  onCancel,
  userId,
  className
}: TemplateEditorProps) {
  const [formData, setFormData] = useState<Partial<AgentTemplate>>({
    name: '',
    description: '',
    category: 'general',
    tags: [],
    isPublic: false,
    isOfficial: false,
    customizationOptions: [],
    setupInstructions: [],
    previewData: {
      screenshots: [],
      features: [],
      useCases: [],
      integrations: []
    },
    metadata: {
      version: '1.0.0',
      author: userId,
      license: 'MIT'
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'customization' | 'setup' | 'preview'>('basic');
  const [newTag, setNewTag] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [newUseCase, setNewUseCase] = useState('');

  useEffect(() => {
    if (template) {
      setFormData(template);
    }
  }, [template]);

  const handleSave = async () => {
    if (!formData.name || !formData.description) {
      return;
    }

    setIsSaving(true);
    try {
      let savedTemplate: AgentTemplate | null;

      if (template?.id) {
        // Update existing template
        savedTemplate = await templateManager.updateTemplate(
          template.id,
          userId,
          formData as AgentTemplate
        );
      } else {
        // Create new template
        savedTemplate = await templateManager.createTemplate(
          userId,
          formData as Omit<AgentTemplate, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'usageCount' | 'rating'>
        );
      }

      if (savedTemplate) {
        onSave?.(savedTemplate);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        previewData: {
          ...prev.previewData!,
          features: [...(prev.previewData?.features || []), newFeature.trim()]
        }
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      previewData: {
        ...prev.previewData!,
        features: prev.previewData?.features?.filter((_, i) => i !== index) || []
      }
    }));
  };

  const addUseCase = () => {
    if (newUseCase.trim()) {
      setFormData(prev => ({
        ...prev,
        previewData: {
          ...prev.previewData!,
          useCases: [...(prev.previewData?.useCases || []), newUseCase.trim()]
        }
      }));
      setNewUseCase('');
    }
  };

  const removeUseCase = (index: number) => {
    setFormData(prev => ({
      ...prev,
      previewData: {
        ...prev.previewData!,
        useCases: prev.previewData?.useCases?.filter((_, i) => i !== index) || []
      }
    }));
  };

  const addCustomizationOption = () => {
    const newOption: CustomizationOption = {
      id: crypto.randomUUID(),
      field: '',
      label: '',
      type: 'text',
      required: false,
      description: ''
    };

    setFormData(prev => ({
      ...prev,
      customizationOptions: [...(prev.customizationOptions || []), newOption]
    }));
  };

  const updateCustomizationOption = (index: number, updates: Partial<CustomizationOption>) => {
    setFormData(prev => ({
      ...prev,
      customizationOptions: prev.customizationOptions?.map((option, i) =>
        i === index ? { ...option, ...updates } : option
      ) || []
    }));
  };

  const removeCustomizationOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customizationOptions: prev.customizationOptions?.filter((_, i) => i !== index) || []
    }));
  };

  const renderBasicTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Template Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter template name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="general">General</option>
            <option value="customer_service">Customer Service</option>
            <option value="sales">Sales</option>
            <option value="support">Support</option>
            <option value="education">Education</option>
            <option value="healthcare">Healthcare</option>
            <option value="finance">Finance</option>
            <option value="legal">Legal</option>
            <option value="hr">HR</option>
            <option value="marketing">Marketing</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe what this template does and who it's for"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add a tag"
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
          />
          <Button onClick={addTag} disabled={!newTag.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags?.map(tag => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
            className="flex items-center gap-2"
          >
            {formData.isPublic ? (
              <ToggleRight className="w-5 h-5 text-blue-600" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-gray-400" />
            )}
            <Label>Make Public</Label>
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Public templates can be discovered and used by other users
        </p>
      </div>
    </div>
  );

  const renderCustomizationTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Customization Options</h3>
          <p className="text-sm text-gray-600">
            Define what users can customize when using this template
          </p>
        </div>
        <Button onClick={addCustomizationOption}>
          <Plus className="w-4 h-4 mr-2" />
          Add Option
        </Button>
      </div>

      <div className="space-y-4">
        {formData.customizationOptions?.map((option, index) => (
          <Card key={option.id} className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Option {index + 1}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCustomizationOption(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Field Path</Label>
                  <Input
                    value={option.field}
                    onChange={(e) => updateCustomizationOption(index, { field: e.target.value })}
                    placeholder="e.g., persona.name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={option.label}
                    onChange={(e) => updateCustomizationOption(index, { label: e.target.value })}
                    placeholder="Display label for users"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <select
                    value={option.type}
                    onChange={(e) => updateCustomizationOption(index, { type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="text">Text</option>
                    <option value="select">Select</option>
                    <option value="multiselect">Multi-select</option>
                    <option value="boolean">Boolean</option>
                    <option value="number">Number</option>
                    <option value="color">Color</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Default Value</Label>
                  <Input
                    value={option.defaultValue || ''}
                    onChange={(e) => updateCustomizationOption(index, { defaultValue: e.target.value })}
                    placeholder="Default value"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={option.description || ''}
                  onChange={(e) => updateCustomizationOption(index, { description: e.target.value })}
                  placeholder="Help text for users"
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => updateCustomizationOption(index, { required: !option.required })}
                  className="flex items-center gap-2"
                >
                  {option.required ? (
                    <ToggleRight className="w-5 h-5 text-blue-600" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-gray-400" />
                  )}
                  <Label>Required</Label>
                </button>
              </div>
            </div>
          </Card>
        ))}

        {formData.customizationOptions?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No customization options defined</p>
            <p className="text-sm">Add options to let users customize this template</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderPreviewTab = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Features</h3>
        <div className="flex gap-2">
          <Input
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            placeholder="Add a key feature"
            onKeyPress={(e) => e.key === 'Enter' && addFeature()}
          />
          <Button onClick={addFeature} disabled={!newFeature.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.previewData?.features?.map((feature, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {feature}
              <button onClick={() => removeFeature(index)} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Use Cases</h3>
        <div className="flex gap-2">
          <Input
            value={newUseCase}
            onChange={(e) => setNewUseCase(e.target.value)}
            placeholder="Add a use case"
            onKeyPress={(e) => e.key === 'Enter' && addUseCase()}
          />
          <Button onClick={addUseCase} disabled={!newUseCase.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.previewData?.useCases?.map((useCase, index) => (
            <Badge key={index} variant="outline" className="flex items-center gap-1">
              {useCase}
              <button onClick={() => removeUseCase(index)} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Screenshots</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Image className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">Upload screenshots of your template</p>
          <p className="text-sm text-gray-500">Drag and drop images here or click to browse</p>
          <Button variant="outline" className="mt-4">
            <Image className="w-4 h-4 mr-2" />
            Add Screenshots
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSetupTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Setup Instructions</h3>
          <p className="text-sm text-gray-600">
            Guide users through setting up this template
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Step
        </Button>
      </div>

      <div className="text-center py-8 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No setup instructions defined</p>
        <p className="text-sm">Add step-by-step instructions to help users</p>
      </div>
    </div>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {template ? 'Edit Template' : 'Create Template'}
          </h2>
          <p className="text-gray-600">
            {template ? 'Update your template configuration' : 'Create a new agent template'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !formData.name || !formData.description}>
            {isSaving ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'basic', label: 'Basic Info', icon: FileText },
          { id: 'customization', label: 'Customization', icon: Settings },
          { id: 'preview', label: 'Preview', icon: Eye },
          { id: 'setup', label: 'Setup', icon: Code }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <Card className="p-6">
        {activeTab === 'basic' && renderBasicTab()}
        {activeTab === 'customization' && renderCustomizationTab()}
        {activeTab === 'preview' && renderPreviewTab()}
        {activeTab === 'setup' && renderSetupTab()}
      </Card>
    </div>
  );
}