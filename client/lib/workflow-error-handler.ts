/**
 * Workflow Error Handler
 * Manages error handling, recovery, and reporting for workflow execution
 */

export interface WorkflowError {
  id: string;
  type: WorkflowErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  nodeId?: string;
  executionId?: string;
  workflowId?: string;
  timestamp: string;
  stack?: string;
  context?: Record<string, any>;
  recoverable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export type WorkflowErrorType = 
  | 'validation_error'
  | 'execution_error'
  | 'timeout_error'
  | 'connection_error'
  | 'authentication_error'
  | 'permission_error'
  | 'rate_limit_error'
  | 'data_error'
  | 'configuration_error'
  | 'system_error'
  | 'user_error';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorRecoveryStrategy {
  type: 'retry' | 'skip' | 'fallback' | 'escalate' | 'terminate';
  config: Record<string, any>;
  condition?: (error: WorkflowError) => boolean;
}

export interface ErrorHandler {
  id: string;
  name: string;
  description: string;
  errorTypes: WorkflowErrorType[];
  severities: ErrorSeverity[];
  strategy: ErrorRecoveryStrategy;
  isActive: boolean;
  priority: number;
}

export interface ErrorReport {
  id: string;
  workflowId: string;
  executionId: string;
  errors: WorkflowError[];
  summary: {
    totalErrors: number;
    errorsByType: Record<WorkflowErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recoveredErrors: number;
    unrecoveredErrors: number;
  };
  recommendations: ErrorRecommendation[];
  createdAt: string;
}

export interface ErrorRecommendation {
  type: 'fix' | 'optimization' | 'monitoring' | 'prevention';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  estimatedImpact: string;
}

export class WorkflowErrorHandler {
  private static instance: WorkflowErrorHandler;
  private errorHandlers: Map<string, ErrorHandler> = new Map();
  private errorHistory: WorkflowError[] = [];
  private errorReports: Map<string, ErrorReport> = new Map();
  private maxHistorySize = 1000;

  static getInstance(): WorkflowErrorHandler {
    if (!WorkflowErrorHandler.instance) {
      WorkflowErrorHandler.instance = new WorkflowErrorHandler();
    }
    return WorkflowErrorHandler.instance;
  }

  constructor() {
    this.initializeDefaultHandlers();
  }

  /**
   * Handle workflow error with recovery strategies
   */
  async handleError(
    error: Error | WorkflowError,
    context: {
      nodeId?: string;
      executionId?: string;
      workflowId?: string;
      additionalContext?: Record<string, any>;
    }
  ): Promise<{
    handled: boolean;
    strategy: ErrorRecoveryStrategy | null;
    shouldContinue: boolean;
    result?: any;
  }> {
    // Convert Error to WorkflowError if needed
    const workflowError = this.normalizeError(error, context);
    
    // Add to history
    this.addToHistory(workflowError);

    // Find appropriate handler
    const handler = this.findHandler(workflowError);
    
    if (!handler) {
      // No handler found, use default strategy
      return {
        handled: false,
        strategy: null,
        shouldContinue: false
      };
    }

    // Apply recovery strategy
    const result = await this.applyRecoveryStrategy(workflowError, handler.strategy);
    
    return {
      handled: true,
      strategy: handler.strategy,
      shouldContinue: result.shouldContinue,
      result: result.data
    };
  }

  /**
   * Register custom error handler
   */
  registerHandler(handler: Omit<ErrorHandler, 'id'>): ErrorHandler {
    const fullHandler: ErrorHandler = {
      id: crypto.randomUUID(),
      ...handler
    };

    this.errorHandlers.set(fullHandler.id, fullHandler);
    return fullHandler;
  }

  /**
   * Remove error handler
   */
  removeHandler(handlerId: string): boolean {
    return this.errorHandlers.delete(handlerId);
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(filters: {
    workflowId?: string;
    executionId?: string;
    nodeId?: string;
    timeRange?: { start: string; end: string };
    errorTypes?: WorkflowErrorType[];
    severities?: ErrorSeverity[];
  } = {}): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    errorsByNode: Record<string, number>;
    recoveryRate: number;
    trends: Array<{ date: string; count: number }>;
  } {
    const filteredErrors = this.filterErrors(filters);

    const stats = {
      totalErrors: filteredErrors.length,
      errorsByType: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
      errorsByNode: {} as Record<string, number>,
      recoveryRate: 0,
      trends: [] as Array<{ date: string; count: number }>
    };

    let recoveredCount = 0;

    filteredErrors.forEach(error => {
      // Count by type
      stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
      
      // Count by severity
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
      
      // Count by node
      if (error.nodeId) {
        stats.errorsByNode[error.nodeId] = (stats.errorsByNode[error.nodeId] || 0) + 1;
      }

      // Count recovered errors
      if (error.recoverable && (error.retryCount || 0) > 0) {
        recoveredCount++;
      }
    });

    stats.recoveryRate = filteredErrors.length > 0 ? (recoveredCount / filteredErrors.length) * 100 : 0;

    // Generate trends (simplified - group by day)
    const trendMap = new Map<string, number>();
    filteredErrors.forEach(error => {
      const date = error.timestamp.split('T')[0];
      trendMap.set(date, (trendMap.get(date) || 0) + 1);
    });

    stats.trends = Array.from(trendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return stats;
  }

  /**
   * Generate error report
   */
  generateErrorReport(
    workflowId: string,
    executionId?: string,
    timeRange?: { start: string; end: string }
  ): ErrorReport {
    const filters: any = { workflowId };
    if (executionId) filters.executionId = executionId;
    if (timeRange) filters.timeRange = timeRange;

    const errors = this.filterErrors(filters);
    const stats = this.getErrorStatistics(filters);

    const report: ErrorReport = {
      id: crypto.randomUUID(),
      workflowId,
      executionId: executionId || 'all',
      errors,
      summary: {
        totalErrors: stats.totalErrors,
        errorsByType: stats.errorsByType as Record<WorkflowErrorType, number>,
        errorsBySeverity: stats.errorsBySeverity as Record<ErrorSeverity, number>,
        recoveredErrors: Math.round((stats.recoveryRate / 100) * stats.totalErrors),
        unrecoveredErrors: stats.totalErrors - Math.round((stats.recoveryRate / 100) * stats.totalErrors)
      },
      recommendations: this.generateRecommendations(errors, stats),
      createdAt: new Date().toISOString()
    };

    this.errorReports.set(report.id, report);
    return report;
  }

  /**
   * Get error report
   */
  getErrorReport(reportId: string): ErrorReport | null {
    return this.errorReports.get(reportId) || null;
  }

  /**
   * Clear error history
   */
  clearHistory(filters?: {
    workflowId?: string;
    executionId?: string;
    olderThan?: string;
  }): number {
    const initialLength = this.errorHistory.length;

    if (!filters) {
      this.errorHistory = [];
      return initialLength;
    }

    this.errorHistory = this.errorHistory.filter(error => {
      if (filters.workflowId && error.workflowId !== filters.workflowId) return true;
      if (filters.executionId && error.executionId !== filters.executionId) return true;
      if (filters.olderThan && error.timestamp >= filters.olderThan) return true;
      return false;
    });

    return initialLength - this.errorHistory.length;
  }

  private normalizeError(
    error: Error | WorkflowError,
    context: {
      nodeId?: string;
      executionId?: string;
      workflowId?: string;
      additionalContext?: Record<string, any>;
    }
  ): WorkflowError {
    if ('type' in error && 'severity' in error) {
      // Already a WorkflowError
      return error as WorkflowError;
    }

    // Convert Error to WorkflowError
    const workflowError: WorkflowError = {
      id: crypto.randomUUID(),
      type: this.classifyError(error),
      severity: this.determineSeverity(error),
      message: error.message,
      details: error,
      nodeId: context.nodeId,
      executionId: context.executionId,
      workflowId: context.workflowId,
      timestamp: new Date().toISOString(),
      stack: error.stack,
      context: context.additionalContext,
      recoverable: this.isRecoverable(error),
      retryCount: 0,
      maxRetries: 3
    };

    return workflowError;
  }

  private classifyError(error: Error): WorkflowErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return 'timeout_error';
    if (message.includes('connection')) return 'connection_error';
    if (message.includes('auth')) return 'authentication_error';
    if (message.includes('permission')) return 'permission_error';
    if (message.includes('rate limit')) return 'rate_limit_error';
    if (message.includes('validation')) return 'validation_error';
    if (message.includes('config')) return 'configuration_error';
    if (message.includes('data')) return 'data_error';
    
    return 'execution_error';
  }

  private determineSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) return 'critical';
    if (message.includes('timeout') || message.includes('connection')) return 'high';
    if (message.includes('validation') || message.includes('data')) return 'medium';
    
    return 'low';
  }

  private isRecoverable(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Non-recoverable errors
    if (message.includes('permission') || message.includes('auth')) return false;
    if (message.includes('configuration') || message.includes('validation')) return false;
    
    // Recoverable errors
    if (message.includes('timeout') || message.includes('connection')) return true;
    if (message.includes('rate limit')) return true;
    
    return true; // Default to recoverable
  }

  private findHandler(error: WorkflowError): ErrorHandler | null {
    const candidates = Array.from(this.errorHandlers.values())
      .filter(handler => 
        handler.isActive &&
        (handler.errorTypes.length === 0 || handler.errorTypes.includes(error.type)) &&
        (handler.severities.length === 0 || handler.severities.includes(error.severity))
      )
      .filter(handler => 
        !handler.strategy.condition || handler.strategy.condition(error)
      )
      .sort((a, b) => b.priority - a.priority);

    return candidates[0] || null;
  }

  private async applyRecoveryStrategy(
    error: WorkflowError,
    strategy: ErrorRecoveryStrategy
  ): Promise<{ shouldContinue: boolean; data?: any }> {
    switch (strategy.type) {
      case 'retry':
        return this.handleRetry(error, strategy.config);
      
      case 'skip':
        return this.handleSkip(error, strategy.config);
      
      case 'fallback':
        return this.handleFallback(error, strategy.config);
      
      case 'escalate':
        return this.handleEscalate(error, strategy.config);
      
      case 'terminate':
        return this.handleTerminate(error, strategy.config);
      
      default:
        return { shouldContinue: false };
    }
  }

  private async handleRetry(
    error: WorkflowError,
    config: Record<string, any>
  ): Promise<{ shouldContinue: boolean; data?: any }> {
    const maxRetries = config.maxRetries || error.maxRetries || 3;
    const retryDelay = config.delay || 1000;
    const backoffMultiplier = config.backoffMultiplier || 2;

    if ((error.retryCount || 0) >= maxRetries) {
      return { shouldContinue: false };
    }

    // Calculate delay with exponential backoff
    const delay = retryDelay * Math.pow(backoffMultiplier, error.retryCount || 0);
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Increment retry count
    error.retryCount = (error.retryCount || 0) + 1;
    
    return { shouldContinue: true, data: { retryAttempt: error.retryCount } };
  }

  private async handleSkip(
    error: WorkflowError,
    config: Record<string, any>
  ): Promise<{ shouldContinue: boolean; data?: any }> {
    // Log that we're skipping
    console.warn(`Skipping error: ${error.message}`);
    
    return { 
      shouldContinue: true, 
      data: { 
        skipped: true, 
        reason: config.reason || 'Error recovery strategy: skip' 
      } 
    };
  }

  private async handleFallback(
    error: WorkflowError,
    config: Record<string, any>
  ): Promise<{ shouldContinue: boolean; data?: any }> {
    const fallbackValue = config.fallbackValue;
    const fallbackFunction = config.fallbackFunction;
    
    let result = null;
    
    if (fallbackFunction && typeof fallbackFunction === 'function') {
      try {
        result = await fallbackFunction(error);
      } catch (fallbackError) {
        console.error('Fallback function failed:', fallbackError);
        return { shouldContinue: false };
      }
    } else if (fallbackValue !== undefined) {
      result = fallbackValue;
    }
    
    return { 
      shouldContinue: true, 
      data: { 
        fallback: true, 
        value: result 
      } 
    };
  }

  private async handleEscalate(
    error: WorkflowError,
    config: Record<string, any>
  ): Promise<{ shouldContinue: boolean; data?: any }> {
    // In a real implementation, this would notify administrators
    console.error('Escalating error:', error);
    
    // Could send notifications, create tickets, etc.
    if (config.notifyAdmins) {
      // Send notification
    }
    
    if (config.createTicket) {
      // Create support ticket
    }
    
    return { 
      shouldContinue: config.continueAfterEscalation || false,
      data: { 
        escalated: true, 
        escalationId: crypto.randomUUID() 
      } 
    };
  }

  private async handleTerminate(
    error: WorkflowError,
    config: Record<string, any>
  ): Promise<{ shouldContinue: boolean; data?: any }> {
    console.error('Terminating workflow due to error:', error);
    
    return { 
      shouldContinue: false, 
      data: { 
        terminated: true, 
        reason: config.reason || 'Critical error encountered' 
      } 
    };
  }

  private addToHistory(error: WorkflowError): void {
    this.errorHistory.push(error);
    
    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  private filterErrors(filters: {
    workflowId?: string;
    executionId?: string;
    nodeId?: string;
    timeRange?: { start: string; end: string };
    errorTypes?: WorkflowErrorType[];
    severities?: ErrorSeverity[];
  }): WorkflowError[] {
    return this.errorHistory.filter(error => {
      if (filters.workflowId && error.workflowId !== filters.workflowId) return false;
      if (filters.executionId && error.executionId !== filters.executionId) return false;
      if (filters.nodeId && error.nodeId !== filters.nodeId) return false;
      if (filters.timeRange) {
        if (error.timestamp < filters.timeRange.start || error.timestamp > filters.timeRange.end) {
          return false;
        }
      }
      if (filters.errorTypes && !filters.errorTypes.includes(error.type)) return false;
      if (filters.severities && !filters.severities.includes(error.severity)) return false;
      return true;
    });
  }

  private generateRecommendations(
    errors: WorkflowError[],
    stats: any
  ): ErrorRecommendation[] {
    const recommendations: ErrorRecommendation[] = [];

    // High error rate recommendation
    if (stats.totalErrors > 10) {
      recommendations.push({
        type: 'optimization',
        title: 'High Error Rate Detected',
        description: `This workflow has ${stats.totalErrors} errors. Consider reviewing the workflow logic and adding more error handling.`,
        priority: 'high',
        actionable: true,
        estimatedImpact: 'Significant reduction in error rate'
      });
    }

    // Timeout errors recommendation
    if (stats.errorsByType['timeout_error'] > 0) {
      recommendations.push({
        type: 'fix',
        title: 'Timeout Errors Present',
        description: 'Consider increasing timeout values or optimizing slow operations.',
        priority: 'medium',
        actionable: true,
        estimatedImpact: 'Reduced timeout failures'
      });
    }

    // Connection errors recommendation
    if (stats.errorsByType['connection_error'] > 0) {
      recommendations.push({
        type: 'monitoring',
        title: 'Connection Issues',
        description: 'Monitor external service availability and implement retry mechanisms.',
        priority: 'medium',
        actionable: true,
        estimatedImpact: 'Improved reliability'
      });
    }

    // Low recovery rate recommendation
    if (stats.recoveryRate < 50) {
      recommendations.push({
        type: 'prevention',
        title: 'Low Error Recovery Rate',
        description: 'Implement better error recovery strategies and fallback mechanisms.',
        priority: 'high',
        actionable: true,
        estimatedImpact: 'Higher success rate'
      });
    }

    return recommendations;
  }

  private initializeDefaultHandlers(): void {
    // Retry handler for recoverable errors
    this.registerHandler({
      name: 'Retry Handler',
      description: 'Automatically retry recoverable errors',
      errorTypes: ['timeout_error', 'connection_error', 'rate_limit_error'],
      severities: ['low', 'medium'],
      strategy: {
        type: 'retry',
        config: {
          maxRetries: 3,
          delay: 1000,
          backoffMultiplier: 2
        }
      },
      isActive: true,
      priority: 100
    });

    // Skip handler for non-critical errors
    this.registerHandler({
      name: 'Skip Handler',
      description: 'Skip non-critical errors and continue execution',
      errorTypes: ['data_error'],
      severities: ['low'],
      strategy: {
        type: 'skip',
        config: {
          reason: 'Non-critical data error'
        }
      },
      isActive: true,
      priority: 50
    });

    // Escalate handler for critical errors
    this.registerHandler({
      name: 'Escalation Handler',
      description: 'Escalate critical errors to administrators',
      errorTypes: [],
      severities: ['critical'],
      strategy: {
        type: 'escalate',
        config: {
          notifyAdmins: true,
          createTicket: true,
          continueAfterEscalation: false
        }
      },
      isActive: true,
      priority: 200
    });

    // Terminate handler for authentication/permission errors
    this.registerHandler({
      name: 'Terminate Handler',
      description: 'Terminate execution for unrecoverable errors',
      errorTypes: ['authentication_error', 'permission_error'],
      severities: ['high', 'critical'],
      strategy: {
        type: 'terminate',
        config: {
          reason: 'Unrecoverable authentication or permission error'
        }
      },
      isActive: true,
      priority: 150
    });
  }
}

// Export singleton instance
export const workflowErrorHandler = WorkflowErrorHandler.getInstance();