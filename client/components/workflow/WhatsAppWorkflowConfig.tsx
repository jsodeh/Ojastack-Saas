/**
 * WhatsApp Workflow Configuration Component
 * Configure WhatsApp integration with visual workflows
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
  MessageSquare,
  Settings,
  Clock,
  Zap,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import { whatsappWorkflowIntegration, type WhatsAppWorkflowConfig } from '../../lib/whatsapp-workflow-integration';
import { supabase } from '../../lib/supabase';

interface WhatsAppWorkflowConfigProps {
  workflowId: string;
  userId: string;
  onConfigChange?: (config: WhatsAppWorkflowConfig) => void;
  className?: string;
}

export const WhatsAppWorkflowConfig: React.FC<WhatsAppWorkflowConfigProps> = ({
  workflowId,
  userId,
  onConfigChange,
  className = ''
}) => {
  const [config, setConfig] = useState<WhatsAppWorkflowConfig>({
    workflowId,
    userId,
    credentialId: '',
    triggerConditions: {
      messageTypes: ['text'],
      keywords: [],
      phoneNumbers: [],
      businessHours: {
        enabled: false,
        timezone: 'UTC',
        schedule: [
          { day: 'monday', start: '09:00', end: '17:00' },
          { day: 'tuesday', start: '09:00', end: '17:00' },
          { day: 'wednesday', start: '09:00', end: '17:00' },
          { day: 'thursday', start: '09:00', end: '17:00' },
          { day: 'friday', start: '09:00', end: '17:00' }
        ]
      }
    },
    responseSettings: {
      autoReply: true,
      typingIndicator: true,
      readReceipts: true,
      maxResponseTime: 30000
    }
  });

  const [credentials, setCredentials] = useState<any[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCredentials();
    loadExistingConfig();
  }, [workflowId, userId]);

  const loadCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('user_whatsapp_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      setCredentials(data || []);

      // Auto-select first credential if available
      if (data && data.length > 0 && !config.credentialId) {
        setConfig(prev => ({ ...prev, credentialId: data[0].id }));
      }
    } catch (error) {
      console.error('Failed to load WhatsApp credentials:', error);
    }
  };

  const loadExistingConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_workflow_configs')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('user_id', userId)
        .single();

      if (data && !error) {
        setConfig({
          workflowId: data.workflow_id,
          userId: data.user_id,
          credentialId: data.credential_id,
          deploymentId: data.deployment_id,
          triggerConditions: data.config_data?.triggerConditions || config.triggerConditions,
          responseSettings: data.config_data?.responseSettings || config.responseSettings
        });
        setIsActive(data.is_active);
      }
    } catch (error) {
      console.error('Failed to load existing config:', error);
    }
  };

  const handleSave = async () => {
    if (!config.credentialId) {
      alert('Please select a WhatsApp credential');
      return;
    }

    setSaving(true);
    try {
      await whatsappWorkflowIntegration.configureWorkflow(config);
      setIsActive(true);
      
      if (onConfigChange) {
        onConfigChange(config);
      }

      alert('WhatsApp workflow integration configured successfully!');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      alert(`Failed to save configuration: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.credentialId) {
      alert('Please select a WhatsApp credential and save the configuration first');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Test the workflow integration by sending a test message
      const testMessage = {
        id: 'test-' + Date.now(),
        from: '+1234567890', // Test phone number
        to: config.credentialId,
        timestamp: new Date().toISOString(),
        type: 'text' as const,
        content: {
          text: 'Test message for workflow integration'
        },
        status: 'delivered' as const
      };

      const execution = await whatsappWorkflowIntegration.processIncomingMessage(
        testMessage,
        userId,
        config.credentialId
      );

      if (execution) {
        setTestResult({
          success: true,
          executionId: execution.id,
          status: execution.status,
          duration: execution.duration,
          steps: execution.steps.length
        });
      } else {
        setTestResult({
          success: false,
          error: 'No workflow execution triggered'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  const addKeyword = () => {
    const keyword = prompt('Enter keyword to trigger workflow:');
    if (keyword && keyword.trim()) {
      setConfig(prev => ({
        ...prev,
        triggerConditions: {
          ...prev.triggerConditions!,
          keywords: [...(prev.triggerConditions?.keywords || []), keyword.trim()]
        }
      }));
    }
  };

  const removeKeyword = (index: number) => {
    setConfig(prev => ({
      ...prev,
      triggerConditions: {
        ...prev.triggerConditions!,
        keywords: prev.triggerConditions?.keywords?.filter((_, i) => i !== index) || []
      }
    }));
  };

  const addPhoneNumber = () => {
    const phoneNumber = prompt('Enter phone number (with country code):');
    if (phoneNumber && phoneNumber.trim()) {
      setConfig(prev => ({
        ...prev,
        triggerConditions: {
          ...prev.triggerConditions!,
          phoneNumbers: [...(prev.triggerConditions?.phoneNumbers || []), phoneNumber.trim()]
        }
      }));
    }
  };

  const removePhoneNumber = (index: number) => {
    setConfig(prev => ({
      ...prev,
      triggerConditions: {
        ...prev.triggerConditions!,
        phoneNumbers: prev.triggerConditions?.phoneNumbers?.filter((_, i) => i !== index) || []
      }
    }));
  };

  const updateSchedule = (dayIndex: number, field: 'start' | 'end', value: string) => {
    setConfig(prev => ({
      ...prev,
      triggerConditions: {
        ...prev.triggerConditions!,
        businessHours: {
          ...prev.triggerConditions!.businessHours!,
          schedule: prev.triggerConditions!.businessHours!.schedule.map((day, index) =>
            index === dayIndex ? { ...day, [field]: value } : day
          )
        }
      }
    }));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <MessageSquare className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">WhatsApp Workflow Integration</h3>
            <p className="text-gray-600">Configure WhatsApp to trigger this workflow</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isActive && (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
          
          <Button onClick={handleTest} disabled={testing || !config.credentialId} variant="outline">
            {testing ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-pulse" />
                Testing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Test
              </>
            )}
          </Button>
          
          <Button onClick={handleSave} disabled={saving || !config.credentialId}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Setup</TabsTrigger>
          <TabsTrigger value="triggers">Trigger Conditions</TabsTrigger>
          <TabsTrigger value="response">Response Settings</TabsTrigger>
          <TabsTrigger value="test">Test & Debug</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Credential</CardTitle>
              <CardDescription>
                Select the WhatsApp Business account to use for this workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="credential">WhatsApp Account</Label>
                  <select
                    id="credential"
                    value={config.credentialId}
                    onChange={(e) => setConfig(prev => ({ ...prev, credentialId: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="">Select WhatsApp account...</option>
                    {credentials.map(cred => (
                      <option key={cred.id} value={cred.id}>
                        {cred.display_name} ({cred.phone_number_id})
                      </option>
                    ))}
                  </select>
                </div>

                {credentials.length === 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800">No WhatsApp credentials found</p>
                        <p className="text-yellow-700 mt-1">
                          You need to add WhatsApp Business credentials before configuring workflow integration.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Types</CardTitle>
              <CardDescription>
                Select which message types should trigger the workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {['text', 'image', 'audio', 'video', 'document', 'location', 'contacts'].map(type => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.triggerConditions?.messageTypes?.includes(type) || false}
                      onChange={(e) => {
                        const messageTypes = config.triggerConditions?.messageTypes || [];
                        if (e.target.checked) {
                          setConfig(prev => ({
                            ...prev,
                            triggerConditions: {
                              ...prev.triggerConditions!,
                              messageTypes: [...messageTypes, type]
                            }
                          }));
                        } else {
                          setConfig(prev => ({
                            ...prev,
                            triggerConditions: {
                              ...prev.triggerConditions!,
                              messageTypes: messageTypes.filter(t => t !== type)
                            }
                          }));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Keywords</CardTitle>
              <CardDescription>
                Specific keywords that must be present in messages to trigger the workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {config.triggerConditions?.keywords?.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {keyword}
                      <button
                        onClick={() => removeKeyword(index)}
                        className="ml-1 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                
                <Button variant="outline" size="sm" onClick={addKeyword}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Keyword
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Phone Number Filter</CardTitle>
              <CardDescription>
                Restrict workflow to specific phone numbers (leave empty for all numbers)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {config.triggerConditions?.phoneNumbers?.map((phone, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {phone}
                      <button
                        onClick={() => removePhoneNumber(index)}
                        className="ml-1 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                
                <Button variant="outline" size="sm" onClick={addPhoneNumber}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Phone Number
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>
                Restrict workflow execution to specific business hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="businessHours"
                    checked={config.triggerConditions?.businessHours?.enabled || false}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      triggerConditions: {
                        ...prev.triggerConditions!,
                        businessHours: {
                          ...prev.triggerConditions!.businessHours!,
                          enabled: e.target.checked
                        }
                      }
                    }))}
                    className="rounded"
                  />
                  <Label htmlFor="businessHours">Enable business hours restriction</Label>
                </div>

                {config.triggerConditions?.businessHours?.enabled && (
                  <div className="space-y-3">
                    <div>
                      <Label>Timezone</Label>
                      <select
                        value={config.triggerConditions.businessHours.timezone}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          triggerConditions: {
                            ...prev.triggerConditions!,
                            businessHours: {
                              ...prev.triggerConditions!.businessHours!,
                              timezone: e.target.value
                            }
                          }
                        }))}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Weekly Schedule</Label>
                      {config.triggerConditions.businessHours.schedule.map((day, index) => (
                        <div key={day.day} className="flex items-center space-x-3">
                          <div className="w-20 text-sm capitalize">{day.day}</div>
                          <Input
                            type="time"
                            value={day.start}
                            onChange={(e) => updateSchedule(index, 'start', e.target.value)}
                            className="w-24"
                          />
                          <span className="text-sm text-gray-500">to</span>
                          <Input
                            type="time"
                            value={day.end}
                            onChange={(e) => updateSchedule(index, 'end', e.target.value)}
                            className="w-24"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Behavior</CardTitle>
              <CardDescription>
                Configure how the workflow responds to WhatsApp messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Auto Reply</Label>
                    <p className="text-xs text-gray-500">Automatically send workflow responses</p>
                  </div>
                  <Button
                    variant={config.responseSettings?.autoReply ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setConfig(prev => ({
                      ...prev,
                      responseSettings: {
                        ...prev.responseSettings!,
                        autoReply: !prev.responseSettings?.autoReply
                      }
                    }))}
                  >
                    {config.responseSettings?.autoReply ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Typing Indicator</Label>
                    <p className="text-xs text-gray-500">Show typing indicator while processing</p>
                  </div>
                  <Button
                    variant={config.responseSettings?.typingIndicator ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setConfig(prev => ({
                      ...prev,
                      responseSettings: {
                        ...prev.responseSettings!,
                        typingIndicator: !prev.responseSettings?.typingIndicator
                      }
                    }))}
                  >
                    {config.responseSettings?.typingIndicator ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Read Receipts</Label>
                    <p className="text-xs text-gray-500">Mark messages as read automatically</p>
                  </div>
                  <Button
                    variant={config.responseSettings?.readReceipts ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setConfig(prev => ({
                      ...prev,
                      responseSettings: {
                        ...prev.responseSettings!,
                        readReceipts: !prev.responseSettings?.readReceipts
                      }
                    }))}
                  >
                    {config.responseSettings?.readReceipts ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div>
                  <Label htmlFor="maxResponseTime">Max Response Time (seconds)</Label>
                  <Input
                    id="maxResponseTime"
                    type="number"
                    value={(config.responseSettings?.maxResponseTime || 30000) / 1000}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      responseSettings: {
                        ...prev.responseSettings!,
                        maxResponseTime: parseInt(e.target.value) * 1000 || 30000
                      }
                    }))}
                    min={1}
                    max={300}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum time to wait for workflow completion before timeout
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Integration</CardTitle>
              <CardDescription>
                Test the WhatsApp workflow integration with a simulated message
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <Button
                    onClick={handleTest}
                    disabled={testing || !config.credentialId}
                    size="lg"
                  >
                    {testing ? (
                      <>
                        <Zap className="h-4 w-4 mr-2 animate-pulse" />
                        Testing Integration...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Test Workflow Integration
                      </>
                    )}
                  </Button>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-lg border ${testResult.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {testResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                      <span className={`font-medium ${testResult.success
                        ? 'text-green-800'
                        : 'text-red-800'
                        }`}>
                        {testResult.success ? 'Test Successful' : 'Test Failed'}
                      </span>
                    </div>

                    {testResult.success ? (
                      <div className="text-sm text-green-700 space-y-1">
                        <p>Execution ID: {testResult.executionId}</p>
                        <p>Status: {testResult.status}</p>
                        <p>Duration: {testResult.duration}ms</p>
                        <p>Steps: {testResult.steps}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-red-700">{testResult.error}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppWorkflowConfig;