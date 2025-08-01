/**
 * Testing System
 * Comprehensive testing framework for agents, workflows, and deployments
 */

import { supabase } from './supabase';
import { AgentWorkflow } from './workflow-types';
import { AgentPersona } from './persona-types';
import { AgentDeployment } from './deployment-manager';

export interface TestSuite {
  id: string;
  userId: string;
  name: string;
  description?: string;
  targetType: 'agent' | 'workflow' | 'deployment' | 'persona';
  targetId: string;
  testCases: TestCase[];
  configuration: TestConfiguration;
  status: TestStatus;
  results?: TestResults;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
}

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  type: TestType;
  input: TestInput;
  expectedOutput: ExpectedOutput;
  assertions: TestAssertion[];
  timeout: number; // milliseconds
  retries: number;
  tags: string[];
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TestInput {
  type: 'text' | 'voice' | 'image' | 'file' | 'structured';
  content: any;
  metadata?: Record<string, any>;
  context?: Record<string, any>;
  variables?: Record<string, any>;
}

export interface ExpectedOutput {
  type: 'text' | 'voice' | 'image' | 'file' | 'structured' | 'action';
  content?: any;
  patterns?: string[]; // regex patterns
  contains?: string[];
  notContains?: string[];
  metadata?: Record<string, any>;
  actions?: string[];
}

export interface TestAssertion {
  type: 'equals' | 'contains' | 'matches' | 'range' | 'custom';
  field: string;
  operator: string;
  value: any;
  message?: string;
}

export type TestType = 
  | 'unit'
  | 'integration'
  | 'end-to-end'
  | 'performance'
  | 'security'
  | 'accessibility'
  | 'usability'
  | 'regression';

export type TestStatus = 
  | 'draft'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TestConfiguration {
  environment: 'development' | 'staging' | 'production';
  parallel: boolean;
  maxConcurrency: number;
  timeout: number; // milliseconds
  retries: number;
  failFast: boolean;
  coverage: boolean;
  reporting: ReportingConfig;
  notifications: NotificationConfig;
}

export interface ReportingConfig {
  enabled: boolean;
  formats: ('json' | 'html' | 'xml' | 'csv')[];
  includeScreenshots: boolean;
  includeLogs: boolean;
  includeMetrics: boolean;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: ('email' | 'slack' | 'webhook')[];
  onSuccess: boolean;
  onFailure: boolean;
  onError: boolean;
}

export interface TestResults {
  id: string;
  suiteId: string;
  status: 'passed' | 'failed' | 'error' | 'skipped';
  summary: TestSummary;
  caseResults: TestCaseResult[];
  metrics: TestMetrics;
  artifacts: TestArtifact[];
  startedAt: string;
  completedAt: string;
  duration: number; // milliseconds
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  passRate: number;
  coverage?: number;
}

export interface TestCaseResult {
  caseId: string;
  name: string;
  status: 'passed' | 'failed' | 'error' | 'skipped';
  input: TestInput;
  actualOutput: any;
  expectedOutput: ExpectedOutput;
  assertions: AssertionResult[];
  error?: string;
  logs: LogEntry[];
  metrics: CaseMetrics;
  startedAt: string;
  completedAt: string;
  duration: number;
}

export interface AssertionResult {
  assertion: TestAssertion;
  passed: boolean;
  message: string;
  actual?: any;
  expected?: any;
}

export interface TestMetrics {
  responseTime: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  };
  throughput: number; // requests per second
  errorRate: number; // percentage
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface CaseMetrics {
  responseTime: number;
  resourceUsage: {
    cpu: number;
    memory: number;
  };
  networkCalls: number;
  dataTransferred: number;
}

export interface TestArtifact {
  type: 'screenshot' | 'video' | 'log' | 'report' | 'data';
  name: string;
  url: string;
  size: number;
  createdAt: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: any;
}

export interface TestTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  targetType: 'agent' | 'workflow' | 'deployment' | 'persona';
  testCases: Omit<TestCase, 'id'>[];
  configuration: TestConfiguration;
  isOfficial: boolean;
  usageCount: number;
}

export class TestingSystem {
  private static instance: TestingSystem;
  private testSuites: Map<string, TestSuite> = new Map();
  private runningTests: Map<string, AbortController> = new Map();
  private templates: Map<string, TestTemplate> = new Map();

  static getInstance(): TestingSystem {
    if (!TestingSystem.instance) {
      TestingSystem.instance = new TestingSystem();
    }
    return TestingSystem.instance;
  }

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Create new test suite
   */
  async createTestSuite(
    userId: string,
    suiteData: {
      name: string;
      description?: string;
      targetType: 'agent' | 'workflow' | 'deployment' | 'persona';
      targetId: string;
      testCases: Omit<TestCase, 'id'>[];
      configuration: TestConfiguration;
    }
  ): Promise<TestSuite | null> {
    try {
      const testSuite: TestSuite = {
        id: crypto.randomUUID(),
        userId,
        name: suiteData.name,
        description: suiteData.description,
        targetType: suiteData.targetType,
        targetId: suiteData.targetId,
        testCases: suiteData.testCases.map(tc => ({
          ...tc,
          id: crypto.randomUUID()
        })),
        configuration: suiteData.configuration,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to database
      const { data, error } = await supabase
        .from('test_suites')
        .insert({
          id: testSuite.id,
          user_id: testSuite.userId,
          name: testSuite.name,
          description: testSuite.description,
          target_type: testSuite.targetType,
          target_id: testSuite.targetId,
          test_cases: testSuite.testCases,
          configuration: testSuite.configuration,
          status: testSuite.status
        })
        .select()
        .single();

      if (error) throw error;

      this.testSuites.set(testSuite.id, testSuite);
      return testSuite;
    } catch (error) {
      console.error('Failed to create test suite:', error);
      return null;
    }
  }

  /**
   * Run test suite
   */
  async runTestSuite(suiteId: string): Promise<TestResults | null> {
    const testSuite = await this.getTestSuite(suiteId);
    if (!testSuite) {
      return null;
    }

    try {
      // Update status
      testSuite.status = 'running';
      testSuite.lastRunAt = new Date().toISOString();
      await this.updateTestSuiteStatus(suiteId, 'running');

      const abortController = new AbortController();
      this.runningTests.set(suiteId, abortController);

      const startTime = Date.now();
      const results: TestResults = {
        id: crypto.randomUUID(),
        suiteId,
        status: 'passed',
        summary: {
          total: testSuite.testCases.length,
          passed: 0,
          failed: 0,
          skipped: 0,
          errors: 0,
          passRate: 0
        },
        caseResults: [],
        metrics: {
          responseTime: { min: 0, max: 0, avg: 0, p95: 0, p99: 0 },
          throughput: 0,
          errorRate: 0,
          resourceUsage: { cpu: 0, memory: 0, network: 0 }
        },
        artifacts: [],
        startedAt: new Date().toISOString(),
        completedAt: '',
        duration: 0
      };

      // Run test cases
      const enabledCases = testSuite.testCases.filter(tc => tc.enabled);
      
      if (testSuite.configuration.parallel) {
        // Run tests in parallel
        const promises = enabledCases.map(testCase => 
          this.runTestCase(testCase, testSuite, abortController.signal)
        );
        
        const caseResults = await Promise.allSettled(promises);
        results.caseResults = caseResults.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            return this.createErrorResult(enabledCases[index], result.reason);
          }
        });
      } else {
        // Run tests sequentially
        for (const testCase of enabledCases) {
          if (abortController.signal.aborted) break;
          
          try {
            const caseResult = await this.runTestCase(testCase, testSuite, abortController.signal);
            results.caseResults.push(caseResult);
            
            // Fail fast if enabled
            if (testSuite.configuration.failFast && caseResult.status === 'failed') {
              break;
            }
          } catch (error) {
            results.caseResults.push(this.createErrorResult(testCase, error));
            if (testSuite.configuration.failFast) break;
          }
        }
      }

      // Calculate summary
      results.summary.passed = results.caseResults.filter(r => r.status === 'passed').length;
      results.summary.failed = results.caseResults.filter(r => r.status === 'failed').length;
      results.summary.errors = results.caseResults.filter(r => r.status === 'error').length;
      results.summary.skipped = results.caseResults.filter(r => r.status === 'skipped').length;
      results.summary.passRate = (results.summary.passed / results.summary.total) * 100;

      // Calculate metrics
      const responseTimes = results.caseResults.map(r => r.duration);
      results.metrics.responseTime = this.calculateResponseTimeMetrics(responseTimes);
      results.metrics.errorRate = (results.summary.failed + results.summary.errors) / results.summary.total * 100;

      // Determine overall status
      if (results.summary.errors > 0) {
        results.status = 'error';
      } else if (results.summary.failed > 0) {
        results.status = 'failed';
      } else {
        results.status = 'passed';
      }

      const endTime = Date.now();
      results.completedAt = new Date().toISOString();
      results.duration = endTime - startTime;

      // Save results
      testSuite.results = results;
      testSuite.status = 'completed';
      await this.saveTestResults(results);
      await this.updateTestSuiteStatus(suiteId, 'completed');

      // Send notifications
      if (testSuite.configuration.notifications.enabled) {
        await this.sendNotifications(testSuite, results);
      }

      this.runningTests.delete(suiteId);
      return results;
    } catch (error) {
      console.error('Test suite execution failed:', error);
      
      testSuite.status = 'failed';
      await this.updateTestSuiteStatus(suiteId, 'failed');
      this.runningTests.delete(suiteId);
      
      return null;
    }
  }

  /**
   * Run individual test case
   */
  private async runTestCase(
    testCase: TestCase,
    testSuite: TestSuite,
    signal: AbortSignal
  ): Promise<TestCaseResult> {
    const startTime = Date.now();
    const result: TestCaseResult = {
      caseId: testCase.id,
      name: testCase.name,
      status: 'passed',
      input: testCase.input,
      actualOutput: null,
      expectedOutput: testCase.expectedOutput,
      assertions: [],
      logs: [],
      metrics: {
        responseTime: 0,
        resourceUsage: { cpu: 0, memory: 0 },
        networkCalls: 0,
        dataTransferred: 0
      },
      startedAt: new Date().toISOString(),
      completedAt: '',
      duration: 0
    };

    try {
      // Execute test based on target type
      let actualOutput: any;
      
      switch (testSuite.targetType) {
        case 'agent':
          actualOutput = await this.executeAgentTest(testSuite.targetId, testCase.input, signal);
          break;
        case 'workflow':
          actualOutput = await this.executeWorkflowTest(testSuite.targetId, testCase.input, signal);
          break;
        case 'deployment':
          actualOutput = await this.executeDeploymentTest(testSuite.targetId, testCase.input, signal);
          break;
        case 'persona':
          actualOutput = await this.executePersonaTest(testSuite.targetId, testCase.input, signal);
          break;
        default:
          throw new Error(`Unsupported target type: ${testSuite.targetType}`);
      }

      result.actualOutput = actualOutput;

      // Run assertions
      for (const assertion of testCase.assertions) {
        const assertionResult = await this.runAssertion(assertion, actualOutput, testCase.expectedOutput);
        result.assertions.push(assertionResult);
        
        if (!assertionResult.passed) {
          result.status = 'failed';
        }
      }

      // Additional validation based on expected output
      if (result.status === 'passed') {
        const validationResult = await this.validateOutput(actualOutput, testCase.expectedOutput);
        if (!validationResult.passed) {
          result.status = 'failed';
          result.assertions.push(validationResult);
        }
      }

    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      result.logs.push({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: error.message,
        metadata: { error }
      });
    }

    const endTime = Date.now();
    result.completedAt = new Date().toISOString();
    result.duration = endTime - startTime;
    result.metrics.responseTime = result.duration;

    return result;
  }

  /**
   * Execute agent test
   */
  private async executeAgentTest(
    agentId: string,
    input: TestInput,
    signal: AbortSignal
  ): Promise<any> {
    // Mock agent execution
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));
    
    if (signal.aborted) {
      throw new Error('Test aborted');
    }

    // Simulate agent response based on input
    switch (input.type) {
      case 'text':
        return {
          type: 'text',
          content: `Agent response to: ${input.content}`,
          confidence: 0.95,
          processingTime: Math.random() * 1000
        };
      case 'voice':
        return {
          type: 'voice',
          content: 'Generated voice response',
          duration: 3.5,
          format: 'mp3'
        };
      case 'image':
        return {
          type: 'text',
          content: 'I can see an image with various objects',
          detectedObjects: ['person', 'car', 'building'],
          confidence: 0.87
        };
      default:
        return {
          type: 'text',
          content: 'Default agent response',
          confidence: 0.8
        };
    }
  }

  /**
   * Execute workflow test
   */
  private async executeWorkflowTest(
    workflowId: string,
    input: TestInput,
    signal: AbortSignal
  ): Promise<any> {
    // Mock workflow execution
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 800));
    
    if (signal.aborted) {
      throw new Error('Test aborted');
    }

    return {
      workflowId,
      executionId: crypto.randomUUID(),
      status: 'completed',
      steps: [
        { id: 'step1', status: 'completed', output: 'Step 1 result' },
        { id: 'step2', status: 'completed', output: 'Step 2 result' }
      ],
      finalOutput: 'Workflow completed successfully',
      executionTime: Math.random() * 2000
    };
  }

  /**
   * Execute deployment test
   */
  private async executeDeploymentTest(
    deploymentId: string,
    input: TestInput,
    signal: AbortSignal
  ): Promise<any> {
    // Mock deployment test
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 200));
    
    if (signal.aborted) {
      throw new Error('Test aborted');
    }

    return {
      deploymentId,
      status: 'healthy',
      responseTime: Math.random() * 500,
      uptime: 99.9,
      version: '1.0.0',
      endpoints: [
        { url: '/api/chat', status: 'healthy', responseTime: 120 },
        { url: '/api/status', status: 'healthy', responseTime: 45 }
      ]
    };
  }

  /**
   * Execute persona test
   */
  private async executePersonaTest(
    personaId: string,
    input: TestInput,
    signal: AbortSignal
  ): Promise<any> {
    // Mock persona test
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 300));
    
    if (signal.aborted) {
      throw new Error('Test aborted');
    }

    return {
      personaId,
      response: `Persona-specific response to: ${input.content}`,
      personality: {
        tone: 'professional',
        style: 'helpful',
        expertise: 'demonstrated'
      },
      consistency: 0.92
    };
  }

  /**
   * Run assertion
   */
  private async runAssertion(
    assertion: TestAssertion,
    actualOutput: any,
    expectedOutput: ExpectedOutput
  ): Promise<AssertionResult> {
    try {
      const actual = this.getFieldValue(actualOutput, assertion.field);
      let passed = false;
      let message = assertion.message || `Assertion failed for field: ${assertion.field}`;

      switch (assertion.type) {
        case 'equals':
          passed = actual === assertion.value;
          break;
        case 'contains':
          passed = String(actual).includes(String(assertion.value));
          break;
        case 'matches':
          const regex = new RegExp(assertion.value);
          passed = regex.test(String(actual));
          break;
        case 'range':
          const [min, max] = assertion.value;
          passed = actual >= min && actual <= max;
          break;
        case 'custom':
          // Custom assertion logic would go here
          passed = true;
          break;
      }

      return {
        assertion,
        passed,
        message: passed ? `Assertion passed: ${message}` : `Assertion failed: ${message}`,
        actual,
        expected: assertion.value
      };
    } catch (error) {
      return {
        assertion,
        passed: false,
        message: `Assertion error: ${error.message}`,
        actual: null,
        expected: assertion.value
      };
    }
  }

  /**
   * Validate output against expected output
   */
  private async validateOutput(
    actualOutput: any,
    expectedOutput: ExpectedOutput
  ): Promise<AssertionResult> {
    try {
      let passed = true;
      let message = 'Output validation passed';

      // Check contains
      if (expectedOutput.contains) {
        for (const item of expectedOutput.contains) {
          if (!String(actualOutput.content || actualOutput).includes(item)) {
            passed = false;
            message = `Output does not contain: ${item}`;
            break;
          }
        }
      }

      // Check not contains
      if (passed && expectedOutput.notContains) {
        for (const item of expectedOutput.notContains) {
          if (String(actualOutput.content || actualOutput).includes(item)) {
            passed = false;
            message = `Output should not contain: ${item}`;
            break;
          }
        }
      }

      // Check patterns
      if (passed && expectedOutput.patterns) {
        for (const pattern of expectedOutput.patterns) {
          const regex = new RegExp(pattern);
          if (!regex.test(String(actualOutput.content || actualOutput))) {
            passed = false;
            message = `Output does not match pattern: ${pattern}`;
            break;
          }
        }
      }

      return {
        assertion: {
          type: 'custom',
          field: 'output',
          operator: 'validates',
          value: expectedOutput
        },
        passed,
        message,
        actual: actualOutput,
        expected: expectedOutput
      };
    } catch (error) {
      return {
        assertion: {
          type: 'custom',
          field: 'output',
          operator: 'validates',
          value: expectedOutput
        },
        passed: false,
        message: `Validation error: ${error.message}`,
        actual: actualOutput,
        expected: expectedOutput
      };
    }
  }

  /**
   * Get field value from object using dot notation
   */
  private getFieldValue(obj: any, field: string): any {
    return field.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Create error result for failed test case
   */
  private createErrorResult(testCase: TestCase, error: any): TestCaseResult {
    return {
      caseId: testCase.id,
      name: testCase.name,
      status: 'error',
      input: testCase.input,
      actualOutput: null,
      expectedOutput: testCase.expectedOutput,
      assertions: [],
      error: error.message || String(error),
      logs: [{
        timestamp: new Date().toISOString(),
        level: 'error',
        message: error.message || String(error),
        metadata: { error }
      }],
      metrics: {
        responseTime: 0,
        resourceUsage: { cpu: 0, memory: 0 },
        networkCalls: 0,
        dataTransferred: 0
      },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      duration: 0
    };
  }

  /**
   * Calculate response time metrics
   */
  private calculateResponseTimeMetrics(responseTimes: number[]) {
    if (responseTimes.length === 0) {
      return { min: 0, max: 0, avg: 0, p95: 0, p99: 0 };
    }

    const sorted = responseTimes.sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * Get test suite
   */
  async getTestSuite(suiteId: string): Promise<TestSuite | null> {
    // Check cache first
    let testSuite = this.testSuites.get(suiteId);
    if (testSuite) {
      return testSuite;
    }

    // Load from database
    try {
      const { data, error } = await supabase
        .from('test_suites')
        .select('*')
        .eq('id', suiteId)
        .single();

      if (error || !data) {
        return null;
      }

      testSuite = this.transformTestSuiteData(data);
      this.testSuites.set(suiteId, testSuite);
      
      return testSuite;
    } catch (error) {
      console.error('Failed to get test suite:', error);
      return null;
    }
  }

  /**
   * Get user test suites
   */
  async getUserTestSuites(userId: string): Promise<TestSuite[]> {
    try {
      const { data, error } = await supabase
        .from('test_suites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformTestSuiteData);
    } catch (error) {
      console.error('Failed to get user test suites:', error);
      return [];
    }
  }

  /**
   * Get test templates
   */
  getTestTemplates(): TestTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Cancel running test
   */
  async cancelTest(suiteId: string): Promise<boolean> {
    const abortController = this.runningTests.get(suiteId);
    if (abortController) {
      abortController.abort();
      this.runningTests.delete(suiteId);
      
      await this.updateTestSuiteStatus(suiteId, 'cancelled');
      return true;
    }
    return false;
  }

  private async updateTestSuiteStatus(suiteId: string, status: TestStatus): Promise<void> {
    try {
      await supabase
        .from('test_suites')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', suiteId);
    } catch (error) {
      console.error('Failed to update test suite status:', error);
    }
  }

  private async saveTestResults(results: TestResults): Promise<void> {
    try {
      await supabase
        .from('test_results')
        .insert({
          id: results.id,
          suite_id: results.suiteId,
          status: results.status,
          summary: results.summary,
          case_results: results.caseResults,
          metrics: results.metrics,
          artifacts: results.artifacts,
          started_at: results.startedAt,
          completed_at: results.completedAt,
          duration: results.duration
        });
    } catch (error) {
      console.error('Failed to save test results:', error);
    }
  }

  private async sendNotifications(testSuite: TestSuite, results: TestResults): Promise<void> {
    const config = testSuite.configuration.notifications;
    
    if ((config.onSuccess && results.status === 'passed') ||
        (config.onFailure && results.status === 'failed') ||
        (config.onError && results.status === 'error')) {
      
      // Mock notification sending
      console.log(`Sending notification for test suite ${testSuite.name}: ${results.status}`);
    }
  }

  private transformTestSuiteData(data: any): TestSuite {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      targetType: data.target_type,
      targetId: data.target_id,
      testCases: data.test_cases || [],
      configuration: data.configuration || {},
      status: data.status,
      results: data.results,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastRunAt: data.last_run_at
    };
  }

  private initializeTemplates(): void {
    // Basic agent test template
    this.templates.set('basic-agent', {
      id: 'basic-agent',
      name: 'Basic Agent Test',
      description: 'Basic test suite for agent functionality',
      category: 'agent',
      targetType: 'agent',
      testCases: [
        {
          name: 'Text Response Test',
          description: 'Test agent response to text input',
          type: 'unit',
          input: {
            type: 'text',
            content: 'Hello, how are you?'
          },
          expectedOutput: {
            type: 'text',
            contains: ['hello', 'good', 'fine']
          },
          assertions: [
            {
              type: 'contains',
              field: 'content',
              operator: 'includes',
              value: 'hello'
            }
          ],
          timeout: 5000,
          retries: 2,
          tags: ['basic', 'text'],
          enabled: true,
          priority: 'high'
        }
      ],
      configuration: {
        environment: 'development',
        parallel: false,
        maxConcurrency: 1,
        timeout: 30000,
        retries: 1,
        failFast: false,
        coverage: false,
        reporting: {
          enabled: true,
          formats: ['json'],
          includeScreenshots: false,
          includeLogs: true,
          includeMetrics: true
        },
        notifications: {
          enabled: false,
          channels: [],
          onSuccess: false,
          onFailure: true,
          onError: true
        }
      },
      isOfficial: true,
      usageCount: 0
    });

    // Performance test template
    this.templates.set('performance', {
      id: 'performance',
      name: 'Performance Test',
      description: 'Performance and load testing template',
      category: 'performance',
      targetType: 'deployment',
      testCases: [
        {
          name: 'Response Time Test',
          description: 'Test response time under load',
          type: 'performance',
          input: {
            type: 'text',
            content: 'Performance test message'
          },
          expectedOutput: {
            type: 'text'
          },
          assertions: [
            {
              type: 'range',
              field: 'responseTime',
              operator: 'between',
              value: [0, 1000]
            }
          ],
          timeout: 10000,
          retries: 0,
          tags: ['performance', 'load'],
          enabled: true,
          priority: 'critical'
        }
      ],
      configuration: {
        environment: 'staging',
        parallel: true,
        maxConcurrency: 10,
        timeout: 60000,
        retries: 0,
        failFast: false,
        coverage: false,
        reporting: {
          enabled: true,
          formats: ['json', 'html'],
          includeScreenshots: false,
          includeLogs: true,
          includeMetrics: true
        },
        notifications: {
          enabled: true,
          channels: ['email'],
          onSuccess: false,
          onFailure: true,
          onError: true
        }
      },
      isOfficial: true,
      usageCount: 0
    });
  }
}

export default TestingSystem;