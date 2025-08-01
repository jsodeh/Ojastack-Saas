/**
 * Execution Context Manager
 * Manages workflow state, variables, and execution context
 */

import { WorkflowVariable } from './workflow-types';

export interface ContextScope {
  id: string;
  name: string;
  type: 'global' | 'workflow' | 'conversation' | 'session' | 'local';
  variables: Map<string, ContextVariable>;
  parent?: ContextScope;
  children: Set<ContextScope>;
  metadata: Record<string, any>;
  createdAt: string;
  expiresAt?: string;
}

export interface ContextVariable {
  name: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  scope: string;
  readonly: boolean;
  encrypted: boolean;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    description?: string;
    tags?: string[];
  };
}

export interface VariableAccessLog {
  timestamp: string;
  action: 'read' | 'write' | 'delete';
  variableName: string;
  scope: string;
  nodeId?: string;
  executionId?: string;
  oldValue?: any;
  newValue?: any;
}

export interface ContextSnapshot {
  id: string;
  executionId: string;
  timestamp: string;
  scopes: Record<string, any>;
  variables: Record<string, any>;
  metadata: Record<string, any>;
}

export class ExecutionContextManager {
  private static instance: ExecutionContextManager;
  private scopes: Map<string, ContextScope> = new Map();
  private accessLogs: VariableAccessLog[] = [];
  private snapshots: Map<string, ContextSnapshot> = new Map();

  static getInstance(): ExecutionContextManager {
    if (!ExecutionContextManager.instance) {
      ExecutionContextManager.instance = new ExecutionContextManager();
    }
    return ExecutionContextManager.instance;
  }

  constructor() {
    this.initializeGlobalScope();
    this.startCleanupTimer();
  }

  /**
   * Create a new execution context scope
   */
  createScope(
    name: string,
    type: ContextScope['type'],
    parentScopeId?: string,
    metadata: Record<string, any> = {}
  ): ContextScope {
    const scope: ContextScope = {
      id: crypto.randomUUID(),
      name,
      type,
      variables: new Map(),
      children: new Set(),
      metadata,
      createdAt: new Date().toISOString()
    };

    // Set expiration for temporary scopes
    if (type === 'session') {
      scope.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    } else if (type === 'local') {
      scope.expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    }

    // Link to parent scope
    if (parentScopeId) {
      const parentScope = this.scopes.get(parentScopeId);
      if (parentScope) {
        scope.parent = parentScope;
        parentScope.children.add(scope);
      }
    }

    this.scopes.set(scope.id, scope);
    return scope;
  }

  /**
   * Get or create workflow scope
   */
  getWorkflowScope(workflowId: string, executionId: string): ContextScope {
    const scopeId = `workflow_${workflowId}_${executionId}`;
    let scope = this.scopes.get(scopeId);

    if (!scope) {
      scope = this.createScope(
        `Workflow ${workflowId}`,
        'workflow',
        'global',
        { workflowId, executionId }
      );
      scope.id = scopeId;
      this.scopes.set(scopeId, scope);
    }

    return scope;
  }

  /**
   * Get or create conversation scope
   */
  getConversationScope(conversationId: string, workflowScopeId?: string): ContextScope {
    const scopeId = `conversation_${conversationId}`;
    let scope = this.scopes.get(scopeId);

    if (!scope) {
      scope = this.createScope(
        `Conversation ${conversationId}`,
        'conversation',
        workflowScopeId || 'global',
        { conversationId }
      );
      scope.id = scopeId;
      this.scopes.set(scopeId, scope);
    }

    return scope;
  }

  /**
   * Set variable in scope
   */
  setVariable(
    scopeId: string,
    name: string,
    value: any,
    options: {
      type?: ContextVariable['type'];
      readonly?: boolean;
      encrypted?: boolean;
      description?: string;
      tags?: string[];
      nodeId?: string;
      executionId?: string;
    } = {}
  ): boolean {
    const scope = this.scopes.get(scopeId);
    if (!scope) {
      console.error(`Scope ${scopeId} not found`);
      return false;
    }

    const existingVar = scope.variables.get(name);
    
    // Check if variable is readonly
    if (existingVar?.readonly) {
      console.error(`Variable ${name} is readonly`);
      return false;
    }

    // Determine variable type
    const varType = options.type || this.inferType(value);

    // Encrypt value if needed
    let finalValue = value;
    if (options.encrypted) {
      finalValue = this.encryptValue(value);
    }

    const variable: ContextVariable = {
      name,
      value: finalValue,
      type: varType,
      scope: scopeId,
      readonly: options.readonly || false,
      encrypted: options.encrypted || false,
      metadata: {
        createdAt: existingVar?.metadata.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: options.description,
        tags: options.tags
      }
    };

    scope.variables.set(name, variable);

    // Log access
    this.logAccess('write', name, scopeId, {
      nodeId: options.nodeId,
      executionId: options.executionId,
      oldValue: existingVar?.value,
      newValue: value
    });

    return true;
  }

  /**
   * Get variable from scope (with inheritance)
   */
  getVariable(scopeId: string, name: string, options: {
    nodeId?: string;
    executionId?: string;
  } = {}): any {
    const variable = this.findVariable(scopeId, name);
    
    if (!variable) {
      return undefined;
    }

    // Log access
    this.logAccess('read', name, variable.scope, {
      nodeId: options.nodeId,
      executionId: options.executionId
    });

    // Decrypt if needed
    if (variable.encrypted) {
      return this.decryptValue(variable.value);
    }

    return variable.value;
  }

  /**
   * Delete variable from scope
   */
  deleteVariable(scopeId: string, name: string, options: {
    nodeId?: string;
    executionId?: string;
  } = {}): boolean {
    const scope = this.scopes.get(scopeId);
    if (!scope) {
      return false;
    }

    const variable = scope.variables.get(name);
    if (!variable) {
      return false;
    }

    // Check if variable is readonly
    if (variable.readonly) {
      console.error(`Variable ${name} is readonly`);
      return false;
    }

    scope.variables.delete(name);

    // Log access
    this.logAccess('delete', name, scopeId, {
      nodeId: options.nodeId,
      executionId: options.executionId,
      oldValue: variable.value
    });

    return true;
  }

  /**
   * Get all variables in scope (with inheritance)
   */
  getAllVariables(scopeId: string): Record<string, any> {
    const variables: Record<string, any> = {};
    const visited = new Set<string>();

    const collectVariables = (currentScopeId: string) => {
      if (visited.has(currentScopeId)) return;
      visited.add(currentScopeId);

      const scope = this.scopes.get(currentScopeId);
      if (!scope) return;

      // Collect from parent first (so child variables override)
      if (scope.parent) {
        collectVariables(scope.parent.id);
      }

      // Add variables from current scope
      scope.variables.forEach((variable, name) => {
        if (variable.encrypted) {
          variables[name] = this.decryptValue(variable.value);
        } else {
          variables[name] = variable.value;
        }
      });
    };

    collectVariables(scopeId);
    return variables;
  }

  /**
   * Create context snapshot
   */
  createSnapshot(executionId: string, scopeIds: string[]): ContextSnapshot {
    const snapshot: ContextSnapshot = {
      id: crypto.randomUUID(),
      executionId,
      timestamp: new Date().toISOString(),
      scopes: {},
      variables: {},
      metadata: {}
    };

    scopeIds.forEach(scopeId => {
      const scope = this.scopes.get(scopeId);
      if (scope) {
        snapshot.scopes[scopeId] = {
          name: scope.name,
          type: scope.type,
          metadata: scope.metadata
        };
        snapshot.variables[scopeId] = this.getAllVariables(scopeId);
      }
    });

    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  /**
   * Restore from snapshot
   */
  restoreSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      return false;
    }

    // Restore variables for each scope
    Object.entries(snapshot.variables).forEach(([scopeId, variables]) => {
      const scope = this.scopes.get(scopeId);
      if (scope) {
        // Clear existing variables
        scope.variables.clear();
        
        // Restore variables
        Object.entries(variables as Record<string, any>).forEach(([name, value]) => {
          this.setVariable(scopeId, name, value);
        });
      }
    });

    return true;
  }

  /**
   * Clean up expired scopes
   */
  cleanup(): void {
    const now = new Date().toISOString();
    const expiredScopes: string[] = [];

    this.scopes.forEach((scope, scopeId) => {
      if (scope.expiresAt && scope.expiresAt < now) {
        expiredScopes.push(scopeId);
      }
    });

    expiredScopes.forEach(scopeId => {
      this.destroyScope(scopeId);
    });

    // Clean up old access logs (keep last 1000)
    if (this.accessLogs.length > 1000) {
      this.accessLogs = this.accessLogs.slice(-1000);
    }

    // Clean up old snapshots (keep last 100)
    if (this.snapshots.size > 100) {
      const sortedSnapshots = Array.from(this.snapshots.entries())
        .sort(([, a], [, b]) => b.timestamp.localeCompare(a.timestamp));
      
      sortedSnapshots.slice(100).forEach(([id]) => {
        this.snapshots.delete(id);
      });
    }
  }

  /**
   * Get variable access logs
   */
  getAccessLogs(filters: {
    variableName?: string;
    scope?: string;
    nodeId?: string;
    executionId?: string;
    action?: VariableAccessLog['action'];
    since?: string;
  } = {}): VariableAccessLog[] {
    return this.accessLogs.filter(log => {
      if (filters.variableName && log.variableName !== filters.variableName) return false;
      if (filters.scope && log.scope !== filters.scope) return false;
      if (filters.nodeId && log.nodeId !== filters.nodeId) return false;
      if (filters.executionId && log.executionId !== filters.executionId) return false;
      if (filters.action && log.action !== filters.action) return false;
      if (filters.since && log.timestamp < filters.since) return false;
      return true;
    });
  }

  private initializeGlobalScope(): void {
    const globalScope: ContextScope = {
      id: 'global',
      name: 'Global Scope',
      type: 'global',
      variables: new Map(),
      children: new Set(),
      metadata: {},
      createdAt: new Date().toISOString()
    };

    this.scopes.set('global', globalScope);

    // Set some default global variables
    this.setVariable('global', 'SYSTEM_VERSION', '1.0.0', { readonly: true });
    this.setVariable('global', 'EXECUTION_START_TIME', new Date().toISOString(), { readonly: true });
  }

  private findVariable(scopeId: string, name: string): ContextVariable | null {
    const scope = this.scopes.get(scopeId);
    if (!scope) return null;

    // Check current scope
    const variable = scope.variables.get(name);
    if (variable) return variable;

    // Check parent scope
    if (scope.parent) {
      return this.findVariable(scope.parent.id, name);
    }

    return null;
  }

  private inferType(value: any): ContextVariable['type'] {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  private encryptValue(value: any): string {
    // Simple base64 encoding for demo - use proper encryption in production
    return btoa(JSON.stringify(value));
  }

  private decryptValue(encryptedValue: string): any {
    try {
      return JSON.parse(atob(encryptedValue));
    } catch {
      return encryptedValue;
    }
  }

  private logAccess(
    action: VariableAccessLog['action'],
    variableName: string,
    scope: string,
    options: {
      nodeId?: string;
      executionId?: string;
      oldValue?: any;
      newValue?: any;
    } = {}
  ): void {
    const log: VariableAccessLog = {
      timestamp: new Date().toISOString(),
      action,
      variableName,
      scope,
      nodeId: options.nodeId,
      executionId: options.executionId,
      oldValue: options.oldValue,
      newValue: options.newValue
    };

    this.accessLogs.push(log);
  }

  private destroyScope(scopeId: string): void {
    const scope = this.scopes.get(scopeId);
    if (!scope) return;

    // Remove from parent's children
    if (scope.parent) {
      scope.parent.children.delete(scope);
    }

    // Destroy child scopes
    scope.children.forEach(childScope => {
      this.destroyScope(childScope.id);
    });

    // Remove scope
    this.scopes.delete(scopeId);
  }

  private startCleanupTimer(): void {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }
}

// Export singleton instance
export const executionContextManager = ExecutionContextManager.getInstance();