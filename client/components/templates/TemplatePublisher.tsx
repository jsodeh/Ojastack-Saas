/**
 * Template Publisher Component
 * Allows users to publish their templates to the marketplace
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import {
  Upload,
  Eye,
  Globe,
  Lock,
  Tag,
  Image,
  FileText,
  Settings,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2
} from 'lucide-react';
import { templateManager, type AgentTemplate, type TemplateCategory } from '../../lib/template-manager';
import { supabase } from '../../lib/supabase';

interface TemplatePublisherProps {
  workflowId?: string;
  personaId?: string;
  onPublished?: (template: AgentTemplate) => void;
  onCancel?: () => void;
  className?: string;
}

export const TemplatePublisher: React.FC<TemplatePublisherProps> = ({
  workflowId,
  personaId,
  onPublished,
  onCancel,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [publishing, setPublishing] = useState(false);
  const [template, setTemplate] = useState<Partial<AgentTemplate>>({
    name: '',
    description: '',
    category: 'general',
    tags: [],
    isPublic: true,
    isOfficial: false,
    workflowId,
    personaId,
    configuration: {},
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
      author: '',
      license: 'MIT',
      compatibility: {
        minVersion: '1.0.0',
        requiredFeatures: []
      }
    }
  });

  const [newTag, setNewTag] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [newUseCase, setNewUseCase] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setTemplate(prev => ({
          ...prev,
          metadata: {
            ...prev.metadata!,
            author: user.email || user.id
          }
        }));
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  };

  const validateTemplate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!template.name?.trim()) {
      errors.name = 'Template name is required';
    }

    if (!template.description?.trim()) {
      errors.description = 'Template description is required';
    }

    if (template.description && template.description.length < 50) {
      errors.description = 'Description should be at least 50 characters';
    }

    if (!template.category) {
      errors.category = 'Template category is required';
    }

    if (!template.tags || template.tags.length === 0) {
      errors.tags = 'At least one tag is required';
    }

    if (!template.previewData?.features || template.previewData.features.length === 0) {
      errors.features = 'At least one feature is required';
    }

    if (!template.previewData?.useCases || template.previewData.useCases.length === 0) {
      errors.useCases = 'At least one use case is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePublish = async () => {
    if (!validateTemplate()) {
      setActiveTab('basic');
      return;
    }

    setPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const publishedTemplate = await templateManager.createTemplate(user.id, template as any);
      
      if (publishedTemplate) {
        if (onPublished) {
          onPublished(publishedTemplate);
        }
        alert('Template published successfully!');
      } else {
        throw new Error('Failed to publish template');
      }

    } catch (error) {
      console.error('Failed to publish template:', error);
      alert(`Failed to publish template: ${error.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !template.tags?.includes(newTag.trim())) {
      setTemplate(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTemplate(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setTemplate(prev => ({
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
    setTemplate(prev => ({
      ...prev,
      previewData: {
        ...prev.previewData!,
        features: prev.previewData?.features?.filter((_, i) => i !== index) || []
      }
    }));
  };

  const addUseCase = () => {
    if (newUseCase.trim()) {
      setTemplate(prev => ({
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
    setTemplate(prev => ({
      ...prev,
      previewData: {
        ...prev.previewData!,
        useCases: prev.previewData?.useCases?.filter((_, i) => i !== index) || []
      }
    }));
  };

  const categories: Array<{ value: TemplateCategory; label: string }> = [
    { value: 'customer_service', label: 'Customer Service' },
    { value: 'sales', label: 'Sales' },
    { value: 'support', label: 'Support' },
    { value: 'education', label: 'Education' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Finance' },
    { value: 'legal', label: 'Legal' },
    { value: 'hr', label: 'Human Resources' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'general', label: 'General' }
  ];

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Publish Template</h2>
          <p className="text-gray-600">Share your template with the community</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={handlePublish} disabled={publishing}>
            {publishing ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
                Publishing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Publish Template
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Provide basic information about your template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={template.name || ''}
                  onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name..."
                  className={validationErrors.name ? 'border-red-500' : ''}
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={template.description || ''}
                  onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what your template does and how it helps users..."
                  rows={4}
                  className={validationErrors.description ? 'border-red-500' : ''}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {template.description?.length || 0} characters (minimum 50)
                </p>
                {validationErrors.description && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.description}</p>
                )}
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  value={template.category || 'general'}
                  onChange={(e) => setTemplate(prev => ({ ...prev, category: e.target.value as TemplateCategory }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Tags *</Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {template.tags?.map(tag => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag..."
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button variant="outline" size="sm" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {validationErrors.tags && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.tags}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Visibility</Label>
                  <p className="text-xs text-gray-500">Choose who can see your template</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={template.isPublic ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTemplate(prev => ({ ...prev, isPublic: true }))}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Public
                  </Button>
                  <Button
                    variant={!template.isPublic ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTemplate(prev => ({ ...prev, isPublic: false }))}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Private
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preview Information</CardTitle>
              <CardDescription>
                Help users understand what your template offers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Key Features *</Label>
                <div className="space-y-2">
                  <div className="space-y-1">
                    {template.previewData?.features?.map((feature, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{feature}</span>
                        <button
                          onClick={() => removeFeature(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Add feature..."
                      onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                    />
                    <Button variant="outline" size="sm" onClick={addFeature}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {validationErrors.features && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.features}</p>
                )}
              </div>

              <div>
                <Label>Use Cases *</Label>
                <div className="space-y-2">
                  <div className="space-y-1">
                    {template.previewData?.useCases?.map((useCase, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{useCase}</span>
                        <button
                          onClick={() => removeUseCase(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      value={newUseCase}
                      onChange={(e) => setNewUseCase(e.target.value)}
                      placeholder="Add use case..."
                      onKeyPress={(e) => e.key === 'Enter' && addUseCase()}
                    />
                    <Button variant="outline" size="sm" onClick={addUseCase}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {validationErrors.useCases && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.useCases}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
              <CardDescription>
                Help users set up and configure your template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-400">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Setup instructions editor coming soon</p>
                <p className="text-xs">Users will be guided through template setup</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Metadata</CardTitle>
              <CardDescription>
                Additional information about your template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={template.metadata?.version || '1.0.0'}
                    onChange={(e) => setTemplate(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata!, version: e.target.value }
                    }))}
                    placeholder="1.0.0"
                  />
                </div>

                <div>
                  <Label htmlFor="license">License</Label>
                  <select
                    id="license"
                    value={template.metadata?.license || 'MIT'}
                    onChange={(e) => setTemplate(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata!, license: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="MIT">MIT</option>
                    <option value="Apache-2.0">Apache 2.0</option>
                    <option value="GPL-3.0">GPL 3.0</option>
                    <option value="BSD-3-Clause">BSD 3-Clause</option>
                    <option value="CC0-1.0">CC0 1.0</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="supportUrl">Support URL (Optional)</Label>
                <Input
                  id="supportUrl"
                  value={template.metadata?.supportUrl || ''}
                  onChange={(e) => setTemplate(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata!, supportUrl: e.target.value }
                  }))}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="documentationUrl">Documentation URL (Optional)</Label>
                <Input
                  id="documentationUrl"
                  value={template.metadata?.documentationUrl || ''}
                  onChange={(e) => setTemplate(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata!, documentationUrl: e.target.value }
                  }))}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Validation Summary */}
      {Object.keys(validationErrors).length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Please fix the following issues:</h4>
                <ul className="text-sm text-red-700 mt-1 space-y-1">
                  {Object.values(validationErrors).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TemplatePublisher;