import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  EyeOff, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Play,
  Wand2,
  Copy,
  Download,
  Upload,
  MessageSquare
} from 'lucide-react';
import { 
  promptGenerator, 
  PromptValidationResult, 
  PromptTestScenario, 
  PromptTestResult,
  PromptGenerationOptions 
} from '@/lib/prompt-generator';
import { PersonalityConfig, AgentTemplate, isPersonalityConfig } from '@/lib/agent-service';

interface PromptEditorProps {
  personality: PersonalityConfig;
  options: PromptGenerationOptions;
  onPromptChange: (prompt: string) => void;
  className?: string;
}

export default function PromptEditor({ 
  personality, 
  options, 
  onPromptChange, 
  className = '' 
}: PromptEditorProps) {
  const [prompt, setPrompt] = useState(personality.systemPrompt || '');
  const [isEditing, setIsEditing] = useState(false);
  const [validation, setValidation] = useState<PromptValidationResult | null>(null);
  const [testScenarios, setTestScenarios] = useState<PromptTestScenario[]>([]);
  const [testResults, setTestResults] = useState<Map<string, PromptTestResult>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');

  // Load test scenarios on mount
  useEffect(() => {
    const scenarios = promptGenerator.getTestScenarios();
    setTestScenarios(scenarios);
  }, []);

  // Validate prompt when it changes
  useEffect(() => {
    if (prompt.trim()) {
      const validationResult = promptGenerator.validatePrompt(prompt);
      setValidation(validationResult);
    } else {
      setValidation(null);
    }
  }, [prompt]);

  // Generate prompt automatically when personality changes
  useEffect(() => {
    if (!isEditing && personality) {
      const generatedPrompt = promptGenerator.generateSystemPrompt(personality, options);
      setPrompt(generatedPrompt);
      onPromptChange(generatedPrompt);
    }
  }, [personality, options, isEditing, onPromptChange]);

  const handlePromptChange = useCallback((newPrompt: string) => {
    setPrompt(newPrompt);
    onPromptChange(newPrompt);
    setIsEditing(true);
  }, [onPromptChange]);

  const handleRegeneratePrompt = async () => {
    setIsGenerating(true);
    try {
      const generatedPrompt = promptGenerator.generateSystemPrompt(personality, options);
      setPrompt(generatedPrompt);
      onPromptChange(generatedPrompt);
      setIsEditing(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTestScenario = async (scenario: PromptTestScenario) => {
    setIsTesting(true);
    try {
      const result = await promptGenerator.testPrompt(prompt, scenario);
      setTestResults(prev => new Map(prev.set(scenario.id, result)));
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestAllScenarios = async () => {
    setIsTesting(true);
    try {
      const results = new Map<string, PromptTestResult>();
      
      for (const scenario of testScenarios) {
        const result = await promptGenerator.testPrompt(prompt, scenario);
        results.set(scenario.id, result);
      }
      
      setTestResults(results);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
  };

  const handleExportPrompt = () => {
    const blob = new Blob([prompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${options.agentName || 'agent'}-system-prompt.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportPrompt = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handlePromptChange(content);
      };
      reader.readAsText(file);
    }
  };

  const getValidationColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTestResultColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 75) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const averageTestScore = testResults.size > 0 
    ? Array.from(testResults.values()).reduce((sum, result) => sum + result.score, 0) / testResults.size
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                System Prompt Editor
              </CardTitle>
              <CardDescription>
                Configure and test your agent's system prompt
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegeneratePrompt}
                disabled={isGenerating}
              >
                <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPrompt}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPrompt}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4" />
                    Import
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".txt,.md"
                  onChange={handleImportPrompt}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="template">Template</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={isEditing ? "destructive" : "default"}>
                      {isEditing ? "Custom" : "Generated"}
                    </Badge>
                    {validation && (
                      <Badge variant="outline" className={getValidationColor(validation.score)}>
                        Score: {validation.score}/100
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {prompt.length} characters
                  </div>
                </div>

                <Textarea
                  value={prompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder="System prompt will be generated based on your personality settings..."
                  rows={20}
                  className="font-mono text-sm resize-none"
                />

                {isEditing && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      You're editing a custom prompt. Changes to personality settings won't automatically update this prompt.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="template" className="space-y-4">
              {options.template ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{options.template.category === 'customer_service' ? '🎧' : 
                                                options.template.category === 'sales' ? '💼' :
                                                options.template.category === 'support' ? '🔧' :
                                                options.template.category === 'education' ? '📚' :
                                                options.template.category === 'healthcare' ? '🏥' :
                                                options.template.category === 'finance' ? '💰' :
                                                options.template.category === 'legal' ? '⚖️' :
                                                options.template.category === 'hr' ? '👥' :
                                                options.template.category === 'marketing' ? '📈' : '🤖'}</div>
                    <div>
                      <h3 className="text-lg font-medium">{options.template.name}</h3>
                      <p className="text-sm text-muted-foreground">{options.template.description}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Template Category</h4>
                      <Badge variant="outline" className="capitalize">
                        {options.template.category.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Default Personality Settings</h4>
                      <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                        {isPersonalityConfig((options.template.personality as unknown) as PersonalityConfig) && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span>Tone:</span>
                              <Badge variant="outline">{(options.template.personality as unknown as PersonalityConfig).tone}</Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Creativity Level:</span>
                              <Badge variant="outline">{(options.template.personality as unknown as PersonalityConfig).creativityLevel}%</Badge>
                            </div>
                            {(options.template.personality as unknown as PersonalityConfig).responseStyle && (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span>Response Length:</span>
                                  <Badge variant="outline">{(options.template.personality as unknown as PersonalityConfig).responseStyle.length}</Badge>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Empathy Level:</span>
                                  <Badge variant="outline">{(options.template.personality as unknown as PersonalityConfig).responseStyle.empathy}</Badge>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    

                    <div>
                      <h4 className="font-medium mb-2">Template Capabilities</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries((options.template.configuration as any).capabilities).map(([capability, config]) => (
                          (config as any).enabled && (
                            <Badge key={capability} variant="secondary">
                              {capability === 'text' ? '💬 Text' :
                               capability === 'voice' ? '🎤 Voice' :
                               capability === 'image' ? '🖼️ Image' :
                               capability === 'video' ? '📹 Video' : capability}
                            </Badge>
                          )
                        ))}
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        These template settings influence the generated system prompt. You can override them by customizing your personality configuration or editing the prompt directly.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                  <p>No template selected</p>
                  <p className="text-sm">Select a template to see customization options</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="validation" className="space-y-4">
              {validation ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Validation Results</h3>
                    <Badge className={getValidationColor(validation.score)}>
                      {validation.isValid ? (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 mr-1" />
                      )}
                      {validation.score}/100
                    </Badge>
                  </div>

                  <Progress value={validation.score} className="w-full" />

                  {validation.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600">Errors</h4>
                      {validation.errors.map((error, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>{error.type}:</strong> {error.message}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {validation.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-yellow-600">Warnings</h4>
                      {validation.warnings.map((warning, index) => (
                        <Alert key={index}>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <strong>{warning.type}:</strong> {warning.message}
                            {warning.suggestion && (
                              <div className="mt-1 text-sm text-muted-foreground">
                                Suggestion: {warning.suggestion}
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {validation.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Suggestions</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {validation.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto mb-2" />
                  <p>Enter a prompt to see validation results</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="testing" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Prompt Testing</h3>
                <div className="flex items-center gap-2">
                  {testResults.size > 0 && (
                    <Badge variant="outline">
                      Average Score: {Math.round(averageTestScore)}/100
                    </Badge>
                  )}
                  <Button
                    onClick={handleTestAllScenarios}
                    disabled={isTesting || !prompt.trim()}
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Test All Scenarios
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {testScenarios.map((scenario) => {
                  const result = testResults.get(scenario.id);
                  
                  return (
                    <Card key={scenario.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{scenario.name}</CardTitle>
                            <CardDescription>{scenario.description}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {result && (
                              <Badge className={getTestResultColor(result.score)}>
                                {result.score}/100
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestScenario(scenario)}
                              disabled={isTesting || !prompt.trim()}
                            >
                              <Play className="h-4 w-4" />
                              Test
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      {result && (
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <div>
                              <h5 className="font-medium text-sm mb-1">Input:</h5>
                              <p className="text-sm bg-gray-50 p-2 rounded italic">
                                "{scenario.input}"
                              </p>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-sm mb-1">Response:</h5>
                              <p className="text-sm bg-blue-50 p-2 rounded">
                                {result.output}
                              </p>
                            </div>
                            
                            {result.feedback.length > 0 && (
                              <div>
                                <h5 className="font-medium text-sm mb-1">Feedback:</h5>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {result.feedback.map((feedback, index) => (
                                    <li key={index} className="flex items-start gap-1">
                                      <span className="text-xs mt-1">•</span>
                                      {feedback}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>

              {testScenarios.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="h-8 w-8 mx-auto mb-2" />
                  <p>No test scenarios available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}