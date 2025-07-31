import React, { useState, useEffect } from 'react';
import { AgentPersona, PersonaTestScenario, PersonaTestResult } from '@/lib/persona-types';
import { personaService } from '@/lib/persona-service';
import { promptGenerator } from '@/lib/prompt-generator';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Play,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  TrendingUp,
  Clock,
  Target,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScenarioTesterProps {
  persona: AgentPersona;
  onResultsChange?: (results: PersonaTestResult[]) => void;
  className?: string;
}

export default function ScenarioTester({
  persona,
  onResultsChange,
  className
}: ScenarioTesterProps) {
  const [scenarios, setScenarios] = useState<PersonaTestScenario[]>([]);
  const [results, setResults] = useState<PersonaTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<PersonaTestScenario | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [testingProgress, setTestingProgress] = useState(0);

  useEffect(() => {
    loadScenarios();
  }, []);

  useEffect(() => {
    onResultsChange?.(results);
  }, [results, onResultsChange]);

  const loadScenarios = () => {
    const testScenarios = personaService.getTestScenarios();
    setScenarios(testScenarios);
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setTestingProgress(0);
    const newResults: PersonaTestResult[] = [];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      try {
        const result = await personaService.testPersona(persona, scenario);
        newResults.push(result);
        setTestingProgress(((i + 1) / scenarios.length) * 100);
      } catch (error) {
        console.error(`Failed to test scenario ${scenario.id}:`, error);
      }
    }

    setResults(newResults);
    setIsLoading(false);
    setTestingProgress(0);
  };

  const runSingleTest = async (scenario: PersonaTestScenario) => {
    setIsLoading(true);
    try {
      const result = await personaService.testPersona(persona, scenario);
      setResults(prev => {
        const filtered = prev.filter(r => r.scenarioId !== scenario.id);
        return [...filtered, result];
      });
    } catch (error) {
      console.error(`Failed to test scenario ${scenario.id}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const runCustomTest = async () => {
    if (!customInput.trim()) return;

    const customScenario: PersonaTestScenario = {
      id: 'custom-' + Date.now(),
      name: 'Custom Test',
      description: 'User-defined test scenario',
      input: customInput.trim(),
      expectedBehavior: ['Appropriate response', 'Maintains persona'],
      category: 'edge_case',
      difficulty: 'medium'
    };

    setIsLoading(true);
    try {
      const result = await personaService.testPersona(persona, customScenario);
      setResults(prev => [...prev, result]);
      setCustomInput('');
    } catch (error) {
      console.error('Failed to run custom test:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 75) return 'secondary';
    if (score >= 60) return 'outline';
    return 'destructive';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'greeting': return MessageSquare;
      case 'question': return Target;
      case 'complaint': return AlertCircle;
      case 'complex': return TrendingUp;
      case 'edge_case': return Lightbulb;
      default: return MessageSquare;
    }
  };

  const getOverallScore = () => {
    if (results.length === 0) return 0;
    return Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
  };

  const getResultForScenario = (scenarioId: string) => {
    return results.find(r => r.scenarioId === scenarioId);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Persona Testing</h3>
          <p className="text-sm text-gray-600">
            Test your persona with different scenarios to validate behavior
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {results.length > 0 && (
            <div className="text-center">
              <div className={cn('text-2xl font-bold', getScoreColor(getOverallScore()))}>
                {getOverallScore()}%
              </div>
              <div className="text-xs text-gray-500">Overall Score</div>
            </div>
          )}
          
          <Button 
            onClick={runAllTests} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {isLoading && testingProgress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Testing scenarios...</span>
            <span>{Math.round(testingProgress)}%</span>
          </div>
          <Progress value={testingProgress} className="h-2" />
        </div>
      )}

      {/* Custom Test Input */}
      <Card className="p-4">
        <div className="space-y-3">
          <h4 className="font-medium">Custom Test</h4>
          <div className="flex gap-3">
            <Textarea
              placeholder="Enter a custom message to test how your persona responds..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button 
              onClick={runCustomTest}
              disabled={!customInput.trim() || isLoading}
              className="self-end"
            >
              <Play className="w-4 h-4 mr-2" />
              Test
            </Button>
          </div>
        </div>
      </Card>

      {/* Test Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map(scenario => {
          const result = getResultForScenario(scenario.id);
          const CategoryIcon = getCategoryIcon(scenario.category);
          
          return (
            <Card key={scenario.id} className="p-4">
              <div className="space-y-3">
                {/* Scenario Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <CategoryIcon className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">{scenario.name}</h4>
                      <p className="text-xs text-gray-600">{scenario.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {scenario.category.replace('_', ' ')}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs', getDifficultyColor(scenario.difficulty))}
                    >
                      {scenario.difficulty}
                    </Badge>
                  </div>
                </div>

                {/* Test Input */}
                <div className="p-3 bg-gray-50 rounded text-sm">
                  <strong>Test Input:</strong> "{scenario.input}"
                </div>

                {/* Expected Behavior */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">Expected Behavior:</div>
                  <div className="flex flex-wrap gap-1">
                    {scenario.expectedBehavior.map((behavior, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {behavior}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Test Result */}
                {result ? (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">Tested</span>
                      </div>
                      <Badge variant={getScoreBadgeVariant(result.score)}>
                        {result.score}%
                      </Badge>
                    </div>

                    {/* AI Response */}
                    <div className="p-3 bg-blue-50 rounded text-sm">
                      <strong>AI Response:</strong> "{result.output}"
                    </div>

                    {/* Feedback */}
                    {result.feedback.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-700">Feedback:</div>
                        {result.feedback.map((feedback, index) => (
                          <div key={index} className="text-xs text-gray-600 flex items-start gap-1">
                            <span className="text-blue-600">•</span>
                            {feedback}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Behavior Analysis */}
                    {result.behaviorAnalysis && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">Tone:</span> {result.behaviorAnalysis.tone}
                        </div>
                        <div>
                          <span className="text-gray-600">Empathy:</span> {result.behaviorAnalysis.empathy}%
                        </div>
                        <div>
                          <span className="text-gray-600">Helpfulness:</span> {result.behaviorAnalysis.helpfulness}%
                        </div>
                        <div>
                          <span className="text-gray-600">Professional:</span> {result.behaviorAnalysis.professionalism}%
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runSingleTest(scenario)}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <RotateCcw className="w-3 h-3 mr-2" />
                      Retest
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => runSingleTest(scenario)}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Run Test
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Custom Test Results */}
      {results.filter(r => r.scenarioId.startsWith('custom-')).length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Custom Test Results</h4>
          {results
            .filter(r => r.scenarioId.startsWith('custom-'))
            .map(result => (
              <Card key={result.scenarioId} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-600" />
                      <span className="font-medium text-sm">Custom Test</span>
                    </div>
                    <Badge variant={getScoreBadgeVariant(result.score)}>
                      {result.score}%
                    </Badge>
                  </div>

                  <div className="p-3 bg-gray-50 rounded text-sm">
                    <strong>Input:</strong> "{result.input}"
                  </div>

                  <div className="p-3 bg-blue-50 rounded text-sm">
                    <strong>Response:</strong> "{result.output}"
                  </div>

                  {result.feedback.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-700">Feedback:</div>
                      {result.feedback.map((feedback, index) => (
                        <div key={index} className="text-xs text-gray-600 flex items-start gap-1">
                          <span className="text-blue-600">•</span>
                          {feedback}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Summary */}
      {results.length > 0 && (
        <Card className="p-4 bg-gray-50">
          <h4 className="font-medium mb-3">Test Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{results.length}</div>
              <div className="text-gray-600">Tests Run</div>
            </div>
            <div className="text-center">
              <div className={cn('text-2xl font-bold', getScoreColor(getOverallScore()))}>
                {getOverallScore()}%
              </div>
              <div className="text-gray-600">Avg Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {results.filter(r => r.score >= 80).length}
              </div>
              <div className="text-gray-600">High Scores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {results.filter(r => r.score < 60).length}
              </div>
              <div className="text-gray-600">Need Work</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}