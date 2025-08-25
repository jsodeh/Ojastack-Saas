import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  EyeOff,
  Copy,
  RotateCcw
} from 'lucide-react';
import { 
  WorkflowNode,
  ConfigField,
  NODE_TEMPLATES
} from '@/lib/workflow-types';

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onChange: (updates: Partial<WorkflowNode>) => void;
}

export default function NodeConfigPanel({ node, onChange }: NodeConfigPanelProps) {
  const [config, setConfig] = useState(node.data.config);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Get the node template for configuration schema
  const template = NODE_TEMPLATES.find(t => 
    t.type === node.type && (
      t.id === node.data.config.templateId || 
      t.id.startsWith(node.type)
    )
  );

  useEffect(() => {
    setConfig(node.data.config);
    validateConfig(node.data.config);
  }, [node.data.config]);

  const validateConfig = (configData: Record<string, any>) => {
    if (!template) return;

    const errors: Record<string, string> = {};
    
    template.configSchema.forEach(field => {
      const value = configData[field.name];
      
      // Required field validation
      if (field.required && (!value || value === '')) {
        errors[field.name] = `${field.label} is required`;
        return;
      }
      
      // Type-specific validation
      if (value !== undefined && value !== '') {
        switch (field.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errors[field.name] = `${field.label} must be a number`;
            } else if (field.validation?.min !== undefined && Number(value) < field.validation.min) {
              errors[field.name] = `${field.label} must be at least ${field.validation.min}`;
            } else if (field.validation?.max !== undefined && Number(value) > field.validation.max) {
              errors[field.name] = `${field.label} must be at most ${field.validation.max}`;
            }
            break;
            
          case 'text':
          case 'textarea':
            if (field.validation?.pattern) {
              const regex = new RegExp(field.validation.pattern);
              if (!regex.test(value)) {
                errors[field.name] = field.validation.message || `${field.label} format is invalid`;
              }
            }
            break;
            
          case 'json':
            try {
              if (typeof value === 'string') {
                JSON.parse(value);
              }
            } catch (e) {
              errors[field.name] = `${field.label} must be valid JSON`;
            }
            break;
        }
      }
    });
    
    setValidationErrors(errors);
    
    // Update node validation status
    const isValid = Object.keys(errors).length === 0;
    onChange({
      data: {
        ...node.data,
        validation: {
          isValid,
          errors: Object.values(errors)
        }
      }
    });
  };

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    
    onChange({
      data: {
        ...node.data,
        config: newConfig
      }
    });
    
    validateConfig(newConfig);
  };

  const handleLabelChange = (label: string) => {
    onChange({
      data: {
        ...node.data,
        label
      }
    });
  };

  const handleDescriptionChange = (description: string) => {
    onChange({
      data: {
        ...node.data,
        description
      }
    });
  };

  const resetToDefaults = () => {
    if (template) {
      setConfig(template.defaultConfig);
      handleConfigChange('reset', template.defaultConfig);
      
      // Reset entire config
      onChange({
        data: {
          ...node.data,
          config: template.defaultConfig
        }
      });
    }
  };

  const copyNodeId = () => {
    navigator.clipboard.writeText(node.id);
  };

  const renderConfigField = (field: ConfigField) => {
    const value = config[field.name] ?? field.default;
    const hasError = validationErrors[field.name];
    const isAdvancedField = field.name.includes('advanced') || 
                           field.name.includes('timeout') || 
                           field.name.includes('retry');

    if (isAdvancedField && !showAdvanced) {
      return null;
    }

    return (
      <div key={field.name} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={field.name} className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {field.description && (
            <div className="group relative">
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs rounded p-2 whitespace-nowrap z-10">
                {field.description}
              </div>
            </div>
          )}
        </div>

        {field.type === 'text' && (
          <Input
            id={field.name}
            value={value || ''}
            onChange={(e) => handleConfigChange(field.name, e.target.value)}
            placeholder={field.default?.toString()}
            className={hasError ? 'border-red-500' : ''}
          />
        )}

        {field.type === 'password' && (
          <div className="relative">
            <Input
              id={field.name}
              type={showPasswords[field.name] ? 'text' : 'password'}
              value={value || ''}
              onChange={(e) => handleConfigChange(field.name, e.target.value)}
              placeholder={field.default?.toString()}
              className={hasError ? 'border-red-500' : ''}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPasswords(prev => ({ 
                ...prev, 
                [field.name]: !prev[field.name] 
              }))}
            >
              {showPasswords[field.name] ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {field.type === 'textarea' && (
          <Textarea
            id={field.name}
            value={value || ''}
            onChange={(e) => handleConfigChange(field.name, e.target.value)}
            placeholder={field.default?.toString()}
            rows={3}
            className={hasError ? 'border-red-500' : ''}
          />
        )}

        {field.type === 'number' && (
          <Input
            id={field.name}
            type="number"
            value={value || ''}
            onChange={(e) => handleConfigChange(field.name, Number(e.target.value))}
            placeholder={field.default?.toString()}
            min={field.validation?.min}
            max={field.validation?.max}
            className={hasError ? 'border-red-500' : ''}
          />
        )}

        {field.type === 'boolean' && (
          <div className="flex items-center space-x-2">
            <Switch
              id={field.name}
              checked={Boolean(value)}
              onCheckedChange={(checked) => handleConfigChange(field.name, checked)}
            />
            <Label htmlFor={field.name} className="text-sm text-muted-foreground">
              {Boolean(value) ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        )}

        {field.type === 'select' && field.options && (
          <Select
            value={value?.toString() || ''}
            onValueChange={(newValue) => handleConfigChange(field.name, newValue)}
          >
            <SelectTrigger className={hasError ? 'border-red-500' : ''}>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {field.type === 'multiselect' && field.options && (
          <div className="space-y-2">
            {field.options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`${field.name}-${option.value}`}
                  checked={(value || []).includes(option.value)}
                  onChange={(e) => {
                    const currentValues = value || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter((v: any) => v !== option.value);
                    handleConfigChange(field.name, newValues);
                  }}
                  className="rounded"
                />
                <Label htmlFor={`${field.name}-${option.value}`} className="text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        )}

        {field.type === 'json' && (
          <Textarea
            id={field.name}
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleConfigChange(field.name, parsed);
              } catch {
                handleConfigChange(field.name, e.target.value);
              }
            }}
            placeholder={'{\n  "key": "value"\n}'}
            rows={4}
            className={`font-mono text-xs ${hasError ? 'border-red-500' : ''}`}
          />
        )}

        {hasError && (
          <p className="text-xs text-red-600 flex items-center">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {hasError}
          </p>
        )}
      </div>
    );
  };

  if (!template) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Settings className="h-8 w-8 mx-auto mb-2" />
        <p>No configuration available</p>
        <p className="text-xs">Unknown node type: {node.type}</p>
      </div>
    );
  }

  const hasAdvancedFields = template.configSchema.some(field => 
    field.name.includes('advanced') || 
    field.name.includes('timeout') || 
    field.name.includes('retry')
  );

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  return (
    <div className="p-4 space-y-6">
      {/* Node Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{template.icon}</span>
              <div>
                <CardTitle className="text-sm">{template.name}</CardTitle>
                <CardDescription className="text-xs">
                  {template.category} • {node.type}
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant={hasValidationErrors ? "destructive" : "default"}
              className={hasValidationErrors ? "" : "bg-green-100 text-green-800"}
            >
              {hasValidationErrors ? (
                <><AlertTriangle className="h-3 w-3 mr-1" />Invalid</>
              ) : (
                <><CheckCircle className="h-3 w-3 mr-1" />Valid</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div>
            <Label htmlFor="node-label" className="text-sm font-medium">Node Name</Label>
            <Input
              id="node-label"
              value={node.data.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Enter node name"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="node-description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="node-description"
              value={node.data.description || ''}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span>ID:</span>
            <code className="bg-gray-100 px-1 rounded">{node.id}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyNodeId}
              className="h-4 w-4 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      {template.configSchema.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Configuration</CardTitle>
              <div className="flex items-center space-x-2">
                {hasAdvancedFields && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs h-6"
                  >
                    {showAdvanced ? 'Hide' : 'Show'} Advanced
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefaults}
                  className="text-xs h-6"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {template.configSchema.map(renderConfigField)}
          </CardContent>
        </Card>
      )}

      {/* Validation Summary */}
      {hasValidationErrors && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Configuration Issues:</p>
              {Object.values(validationErrors).map((error, index) => (
                <p key={index} className="text-sm">• {error}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Node Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Node Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-medium text-muted-foreground">Inputs</p>
              <p>{node.inputs.length}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Outputs</p>
              <p>{node.outputs.length}</p>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <p className="font-medium text-muted-foreground mb-1">Features</p>
            <div className="flex flex-wrap gap-1">
              {template.features?.map((feature) => (
                <Badge key={feature} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          {template.requirements && template.requirements.length > 0 && (
            <div>
              <p className="font-medium text-muted-foreground mb-1">Requirements</p>
              <ul className="space-y-1">
                {template.requirements.map((req, index) => (
                  <li key={index} className="flex items-center text-xs text-muted-foreground">
                    <Info className="h-3 w-3 mr-1" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}