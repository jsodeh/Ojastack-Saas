/**
 * Testing Dashboard
 * Main dashboard for managing and running tests
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  BarChart3,
  FileText,
  Zap,
  TestTube,
  Target,
  TrendingUp
} from 'lucide-react';
import TestingSystem, { TestSuite, TestResults, TestStatus } from '../../lib/testing-system';
import { useAuth } from '../../hooks/useAuth';

interface TestingDashboardProps {
  className?: string;
}

export const TestingDashboard: React.FC<TestingDashboardProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const testingSystem = TestingSystem.getInstance();

  useEffect(() => {
    if (user) {
      loadTestSuites();
    }
  }, [user]);

  const loadTestSuites = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userTestSuites = await testingSystem.getUserTestSuites(user.id);
      setTestSuites(userTestSuites);
      
      if (userTestSuites.length > 0 && !selectedSuite) {
        setSelectedSuite(userTestSuites[0]);
      }
    } catch (error) {
      console.error('Failed to load test suites:', error);
    } finally {
      setLoading(false);
    }
  };

  const runTestSuite = async (suiteId: string) => {
    try {
      setRunningTests(prev => new Set(prev).add(suiteId));
      
      const results = await testingSystem.runTestSuite(suiteId);
      
      if (results) {
        // Update the suite with results
        setTestSuites(prev => prev.map(suite => 
          suite.id === suiteId 
            ? { ...suite, results, status: 'completed' as TestStatus }
            : suite
        ));
        
        if (selectedSuite?.id === suiteId) {
          setSelectedSuite(prev => prev ? { ...prev, results, status: 'completed' as TestStatus } : null);
        }
      }
    } catch (error) {
      console.error('Failed to run test suite:', error);
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(suiteId);
        return newSet;
      });
    }
  };

  const cancelTest = async (suiteId: string) => {
    try {
      await testingSystem.cancelTest(suiteId);
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(suiteId);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to cancel test:', error);
    }
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <TestTube className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: TestStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultStatusIcon = (status: 'passed' | 'failed' | 'error' | 'skipped') => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'skipped':
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Testing</h1>
          <p className="text-gray-600">Run and manage tests for your agents and workflows</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={loadTestSuites}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Zap className="h-4 w-4 mr-2" />
            New Test Suite
          </Button>
        </div>
      </div>

      {testSuites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TestTube className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No test suites yet</h3>
            <p className="text-gray-600 text-center mb-6">
              Create your first test suite to start testing your agents and workflows.
            </p>
            <Button>
              <Zap className="h-4 w-4 mr-2" />
              Create Test Suite
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Suites List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Test Suites</CardTitle>
                <CardDescription>
                  {testSuites.length} test suite{testSuites.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {testSuites.map((suite) => (
                    <div
                      key={suite.id}
                      className={`p-4 cursor-pointer border-l-4 hover:bg-gray-50 ${
                        selectedSuite?.id === suite.id
                          ? 'bg-blue-50 border-l-blue-500'
                          : 'border-l-transparent'
                      }`}
                      onClick={() => setSelectedSuite(suite)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{suite.name}</h4>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(suite.status)}
                          {runningTests.has(suite.id) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelTest(suite.id);
                              }}
                            >
                              <Square className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <Badge className={getStatusColor(suite.status)}>
                          {suite.status}
                        </Badge>
                        <span className="text-gray-500 capitalize">
                          {suite.targetType}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {suite.testCases.length} test{suite.testCases.length !== 1 ? 's' : ''}
                        </span>
                        {suite.results && (
                          <span className="text-green-600">
                            {suite.results.summary.passRate.toFixed(0)}% pass
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Suite Details */}
          <div className="lg:col-span-2">
            {selectedSuite ? (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="results">Results</TabsTrigger>
                  <TabsTrigger value="cases">Test Cases</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {/* Status Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <span>{selectedSuite.name}</span>
                            {getStatusIcon(selectedSuite.status)}
                          </CardTitle>
                          <CardDescription>
                            {selectedSuite.description || 'No description'}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!runningTests.has(selectedSuite.id) ? (
                            <Button
                              onClick={() => runTestSuite(selectedSuite.id)}
                              disabled={selectedSuite.status === 'running'}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Run Tests
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => cancelTest(selectedSuite.id)}
                            >
                              <Square className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {selectedSuite.testCases.length}
                          </div>
                          <div className="text-sm text-gray-600">Total Tests</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {selectedSuite.results?.summary.passed || 0}
                          </div>
                          <div className="text-sm text-gray-600">Passed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {selectedSuite.results?.summary.failed || 0}
                          </div>
                          <div className="text-sm text-gray-600">Failed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {selectedSuite.results?.summary.passRate.toFixed(0) || 0}%
                          </div>
                          <div className="text-sm text-gray-600">Pass Rate</div>
                        </div>
                      </div>
                      
                      {selectedSuite.results && (
                        <div className="mt-6">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Test Progress</span>
                            <span className="text-sm text-gray-600">
                              {selectedSuite.results.summary.passed + selectedSuite.results.summary.failed} / {selectedSuite.results.summary.total}
                            </span>
                          </div>
                          <Progress 
                            value={(selectedSuite.results.summary.passed + selectedSuite.results.summary.failed) / selectedSuite.results.summary.total * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Target Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Test Target</CardTitle>
                      <CardDescription>
                        Information about what is being tested
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Target className="h-5 w-5 text-gray-400" />
                          <span className="font-medium capitalize">{selectedSuite.targetType}</span>
                        </div>
                        <div className="text-gray-600">
                          ID: {selectedSuite.targetId}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Results */}
                  {selectedSuite.results && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Latest Results</CardTitle>
                        <CardDescription>
                          Results from the most recent test run
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Status:</span>
                            <div className="flex items-center space-x-2">
                              {getResultStatusIcon(selectedSuite.results.status)}
                              <span className="font-medium capitalize">{selectedSuite.results.status}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Duration:</span>
                            <span className="font-medium">{formatDuration(selectedSuite.results.duration)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Started:</span>
                            <span className="font-medium">
                              {new Date(selectedSuite.results.startedAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Avg Response Time:</span>
                            <span className="font-medium">
                              {formatDuration(selectedSuite.results.metrics.responseTime.avg)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="results" className="space-y-4">
                  {selectedSuite.results ? (
                    <>
                      {/* Results Summary */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Test Results Summary</CardTitle>
                          <CardDescription>
                            Detailed breakdown of test execution results
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">
                                {selectedSuite.results.summary.total}
                              </div>
                              <div className="text-sm text-blue-600">Total</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">
                                {selectedSuite.results.summary.passed}
                              </div>
                              <div className="text-sm text-green-600">Passed</div>
                            </div>
                            <div className="text-center p-3 bg-red-50 rounded-lg">
                              <div className="text-2xl font-bold text-red-600">
                                {selectedSuite.results.summary.failed}
                              </div>
                              <div className="text-sm text-red-600">Failed</div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                              <div className="text-2xl font-bold text-orange-600">
                                {selectedSuite.results.summary.errors}
                              </div>
                              <div className="text-sm text-orange-600">Errors</div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-2xl font-bold text-gray-600">
                                {selectedSuite.results.summary.skipped}
                              </div>
                              <div className="text-sm text-gray-600">Skipped</div>
                            </div>
                          </div>

                          {/* Performance Metrics */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-3 border rounded-lg">
                              <div className="text-lg font-bold text-purple-600">
                                {formatDuration(selectedSuite.results.metrics.responseTime.avg)}
                              </div>
                              <div className="text-sm text-gray-600">Avg Response Time</div>
                            </div>
                            <div className="text-center p-3 border rounded-lg">
                              <div className="text-lg font-bold text-indigo-600">
                                {selectedSuite.results.metrics.errorRate.toFixed(1)}%
                              </div>
                              <div className="text-sm text-gray-600">Error Rate</div>
                            </div>
                            <div className="text-center p-3 border rounded-lg">
                              <div className="text-lg font-bold text-teal-600">
                                {formatDuration(selectedSuite.results.duration)}
                              </div>
                              <div className="text-sm text-gray-600">Total Duration</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Individual Test Results */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Individual Test Results</CardTitle>
                          <CardDescription>
                            Results for each test case
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {selectedSuite.results.caseResults.map((result, index) => (
                              <div
                                key={result.caseId}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex items-center space-x-3">
                                  {getResultStatusIcon(result.status)}
                                  <div>
                                    <div className="font-medium">{result.name}</div>
                                    <div className="text-sm text-gray-600">
                                      {formatDuration(result.duration)}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge 
                                    variant={result.status === 'passed' ? 'default' : 'destructive'}
                                  >
                                    {result.status}
                                  </Badge>
                                  {result.assertions.length > 0 && (
                                    <span className="text-sm text-gray-500">
                                      {result.assertions.filter(a => a.passed).length}/{result.assertions.length} assertions
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No results yet</h3>
                        <p className="text-gray-600 text-center mb-6">
                          Run the test suite to see detailed results here.
                        </p>
                        <Button onClick={() => runTestSuite(selectedSuite.id)}>
                          <Play className="h-4 w-4 mr-2" />
                          Run Tests
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="cases" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Test Cases</CardTitle>
                      <CardDescription>
                        {selectedSuite.testCases.length} test case{selectedSuite.testCases.length !== 1 ? 's' : ''} in this suite
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedSuite.testCases.map((testCase, index) => (
                          <div
                            key={testCase.id}
                            className="p-4 border rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{testCase.name}</h4>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="capitalize">
                                  {testCase.type}
                                </Badge>
                                <Badge variant={testCase.enabled ? 'default' : 'secondary'}>
                                  {testCase.enabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                              </div>
                            </div>
                            {testCase.description && (
                              <p className="text-sm text-gray-600 mb-3">
                                {testCase.description}
                              </p>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Input Type:</span>
                                <span className="ml-2 font-medium capitalize">
                                  {testCase.input.type}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Timeout:</span>
                                <span className="ml-2 font-medium">
                                  {formatDuration(testCase.timeout)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Priority:</span>
                                <span className="ml-2 font-medium capitalize">
                                  {testCase.priority}
                                </span>
                              </div>
                            </div>
                            {testCase.tags.length > 0 && (
                              <div className="mt-3 flex items-center space-x-2">
                                <span className="text-sm text-gray-600">Tags:</span>
                                {testCase.tags.map((tag, tagIndex) => (
                                  <Badge key={tagIndex} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Test Configuration</CardTitle>
                      <CardDescription>
                        Configuration settings for this test suite
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-medium mb-2">Environment</h4>
                          <Badge>{selectedSuite.configuration.environment}</Badge>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Execution Settings</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Parallel Execution:</span>
                              <span className="ml-2 font-medium">
                                {selectedSuite.configuration.parallel ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Max Concurrency:</span>
                              <span className="ml-2 font-medium">
                                {selectedSuite.configuration.maxConcurrency}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Timeout:</span>
                              <span className="ml-2 font-medium">
                                {formatDuration(selectedSuite.configuration.timeout)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Fail Fast:</span>
                              <span className="ml-2 font-medium">
                                {selectedSuite.configuration.failFast ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Reporting</h4>
                          <div className="text-sm">
                            <div className="mb-2">
                              <span className="text-gray-600">Formats:</span>
                              <div className="ml-2 flex items-center space-x-2">
                                {selectedSuite.configuration.reporting.formats.map((format, index) => (
                                  <Badge key={index} variant="outline" className="text-xs uppercase">
                                    {format}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Include Logs:</span>
                              <span className="ml-2 font-medium">
                                {selectedSuite.configuration.reporting.includeLogs ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <Button>
                            <FileText className="h-4 w-4 mr-2" />
                            Edit Configuration
                          </Button>
                          <Button variant="outline">
                            Export Settings
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a test suite
                    </h3>
                    <p className="text-gray-600">
                      Choose a test suite from the list to view its details
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestingDashboard;