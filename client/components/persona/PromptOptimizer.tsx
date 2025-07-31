import React, { useState, useEffect } from 'react';
import { AgentPersona } from '@/lib/persona-types';
import { promptGenerator, PromptOptimizationResult, PromptGenerationOptions } from '@/lib/prompt-generator';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Wand2,
  Copy,
  Download,
  RefreshCw,
  TrendingUp,
  FileText,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromptOptimizerProps {
  persona: AgentPersona;
  onPromptChange?: (prompt: string) => void;
  className?: string;
}

export default function PromptOptimizer({
  persona,
  onPromptChange,
  className
}: PromptOptimizerProps) {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [optimizationResult, setOptimizationResult] = useState<PromptOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<PromptGenerationOptions>({
    includeExamples: true,
    includeConstraints: true,
    includeEscalation: true,
    optimizeForModel: 'generic',
    tone: 'balanced'
  });
  const [activeTab, setActiveTab] = useState<'generate' | 'optimize' | 'analyze'>('generate');

  useEffect(() => {
    if (persona.generatedPrompt) {
      setCurrentPrompt(persona.generatedPrompt);
    } else {
      generateInitialPrompt();
    }
  }, [persona]);

  useEffect(() => {
    onPromptChange?.(currentPrompt);
  }, [currentPrompt, onPromptChange]);

  const generateInitialPrompt = async () => {
    setIsGenerating(true);
    try {
      const prompt = await promptGenerator.generateSystemPrompt(persona, generationOptions);
      setCurrentPrompt(prompt);
    } catch (error) {
      console.error('Failed to generate prompt:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const regeneratePrompt = async () => {
    setIsGenerating(true);
    try {
      const prompt = await promptGenerator.generateSystemPrompt(persona, generationOptions);
      setCurrentPrompt(prompt);
      setOptimizationResult(null); // Clear previous optimization
    } catch (error) {
      console.error('Failed to regenerate prompt:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const optimizePrompt = async () => {
    if (!currentPrompt.trim()) return;

    setIsOptimizing(true);
    try {
      const result = await promptGenerator.optimizePrompt(currentPrompt, persona);
      setOptimizationResult(result);
    } catch (error) {
      console.error('Failed to optimize prompt:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const applyOptimization = () => {
    if (optimizationResult) {
      setCurrentPrompt(optimizationResult.optimizedPrompt);
      setOptimizationResult(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const downloadPrompt = () => {
    const blob = new Blob([currentPrompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${persona.name.replace(/\s+/g, '_')}_prompt.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Prompt Generator & Optimizer</h3>
          <p className="text-sm text-gray-600">
            Generate and optimize system prompts for your persona
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => copyToClipboard(currentPrompt)}
            disabled={!currentPrompt}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          <Button
            variant="outline"
            onClick={downloadPrompt}
            disabled={!currentPrompt}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'generate', label: 'Generate', icon: Wand2 },
          { id: 'optimize', label: 'Optimize', icon: TrendingUp },
          { id: 'analyze', label: 'Analyze', icon: BarChart3 }
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

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          {/* Generation Options */}
          <Card className="p-4">
            <h4 className="font-medium mb-4">Generation Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeExamples"
                    checked={generationOptions.includeExamples}
                    onChange={(e) => setGenerationOptions(prev => ({
                      ...prev,
                      includeExamples: e.target.checked
                    }))}
                  />
                  <Label htmlFor="includeExamples" className="text-sm">
                    Include Examples
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeConstraints"
                    checked={generationOptions.includeConstraints}
                    onChange={(e) => setGenerationOptions(prev => ({
                      ...prev,
                      includeConstraints: e.target.checked
                    }))}
                  />
                  <Label htmlFor="includeConstraints" className="text-sm">
                    Include Constraints
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeEscalation"
                    checked={generationOptions.includeEscalation}
                    onChange={(e) => setGenerationOptions(prev => ({
                      ...prev,
                      includeEscalation: e.target.checked
                    }))}
                  />
                  <Label htmlFor="includeEscalation" className="text-sm">
                    Include Escalation Rules
                  </Label>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Optimize for Model</Label>
                  <select
                    value={generationOptions.optimizeForModel}
                    onChange={(e) => setGenerationOptions(prev => ({
                      ...prev,
                      optimizeForModel: e.target.value as any
                    }))}
                    className="w-full mt-1 text-sm border rounded px-2 py-1"
                  >
                    <option value="generic">Generic</option>
                    <option value="gpt-3.5">GPT-3.5</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="claude">Claude</option>
                  </select>
                </div>
                
                <div>
                  <Label className="text-sm">Tone</Label>
                  <select
                    value={generationOptions.tone}
                    onChange={(e) => setGenerationOptions(prev => ({
                      ...prev,
                      tone: e.target.value as any
                    }))}
                    className="w-full mt-1 text-sm border rounded px-2 py-1"
                  >
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                    <option value="balanced">Balanced</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button
                onClick={regeneratePrompt}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate Prompt'}
              </Button>
            </div>
          </Card>

          {/* Generated Prompt */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Generated System Prompt</h4>
              <Badge variant="outline">
                {currentPrompt.length} characters
              </Badge>
            </div>
            
            <Textarea
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              rows={20}
              className="font-mono text-sm"
              placeholder="Generated prompt will appear here..."
            />
          </Card>
        </div>
      )}

      {/* Optimize Tab */}
      {activeTab === 'optimize' && (
        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Prompt Optimization</h4>
              <Button
                onClick={optimizePrompt}
                disabled={isOptimizing || !currentPrompt.trim()}
                className="flex items-center gap-2"
              >
                {isOptimizing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                {isOptimizing ? 'Optimizing...' : 'Optimize Prompt'}
              </Button>
            </div>

            {optimizationResult && (
              <div className="space-y-6">
                {/* Metrics Comparison */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Token Count</div>
                    <div className="text-lg font-semibold">
                      {optimizationResult.metrics.tokenCount}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Readability</div>
                    <div className={cn('text-lg font-semibold', getScoreColor(optimizationResult.metrics.readabilityScore))}>
                      {Math.round(optimizationResult.metrics.readabilityScore)}%
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Specificity</div>
                    <div className={cn('text-lg font-semibold', getScoreColor(optimizationResult.metrics.specificityScore))}>
                      {Math.round(optimizationResult.metrics.specificityScore)}%
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Overall</div>
                    <div className={cn('text-lg font-semibold', getScoreColor(optimizationResult.metrics.overallScore))}>
                      {Math.round(optimizationResult.metrics.overallScore)}%
                    </div>
                  </div>
                </div>

                {/* Improvements */}
                {optimizationResult.improvements.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-3">Applied Improvements</h5>
                    <div className="space-y-2">
                      {optimizationResult.improvements.map((improvement, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          <div>
                            <div className="font-medium text-sm text-green-900">
                              {improvement.type.charAt(0).toUpperCase() + improvement.type.slice(1)}
                            </div>
                            <div className="text-sm text-green-700">
                              {improvement.description}
                            </div>
                            <Badge 
                              variant={improvement.impact === 'high' ? 'default' : 'secondary'}
                              className="mt-1 text-xs"
                            >
                              {improvement.impact} impact
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {optimizationResult.suggestions.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-3">Additional Suggestions</h5>
                    <div className="space-y-2">
                      {optimizationResult.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded">
                          <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="text-sm text-blue-700">{suggestion}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optimized Prompt Preview */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium">Optimized Prompt</h5>
                    <Button
                      onClick={applyOptimization}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Apply Changes
                    </Button>
                  </div>
                  <Textarea
                    value={optimizationResult.optimizedPrompt}
                    readOnly
                    rows={15}
                    className="font-mono text-sm bg-gray-50"
                  />
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Analyze Tab */}
      {activeTab === 'analyze' && (
        <div className="space-y-6">
          <Card className="p-4">
            <h4 className="font-medium mb-4">Prompt Analysis</h4>
            
            {currentPrompt ? (
              <div className="space-y-6">
                {/* Basic Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Characters</div>
                    <div className="text-lg font-semibold">{currentPrompt.length}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Words</div>
                    <div className="text-lg font-semibold">
                      {currentPrompt.split(/\s+/).filter(w => w.length > 0).length}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Lines</div>
                    <div className="text-lg font-semibold">
                      {currentPrompt.split('\n').length}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Est. Tokens</div>
                    <div className="text-lg font-semibold">
                      {Math.ceil(currentPrompt.length / 4)}
                    </div>
                  </div>
                </div>

                {/* Structure Analysis */}
                <div>
                  <h5 className="font-medium mb-3">Structure Analysis</h5>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Headers (##)</span>
                      <Badge variant="outline">
                        {(currentPrompt.match(/##/g) || []).length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Bullet Points</span>
                      <Badge variant="outline">
                        {(currentPrompt.match(/^- /gm) || []).length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Examples</span>
                      <Badge variant="outline">
                        {(currentPrompt.match(/example/gi) || []).length}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Content Analysis */}
                <div>
                  <h5 className="font-medium mb-3">Content Analysis</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Personality Keywords</div>
                      <div className="flex flex-wrap gap-1">
                        {['friendly', 'professional', 'helpful', 'empathetic', 'patient']
                          .filter(keyword => currentPrompt.toLowerCase().includes(keyword))
                          .map(keyword => (
                            <Badge key={keyword} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Action Keywords</div>
                      <div className="flex flex-wrap gap-1">
                        {['help', 'assist', 'provide', 'explain', 'guide', 'support']
                          .filter(keyword => currentPrompt.toLowerCase().includes(keyword))
                          .map(keyword => (
                            <Badge key={keyword} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No prompt to analyze</p>
                <p className="text-sm">Generate a prompt first to see analysis</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}