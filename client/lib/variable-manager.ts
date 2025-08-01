/**
 * Variable Manager
 * Handles workflow variables, data transformation, and state management
 */

import { WorkflowVariable } from './workflow-types';
import { executionContextManager, ContextVariable } from './execution-context-manager';

export interface VariableDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
  description?: string;
  required?: boolean;
  validation?: VariableValidation;
  transformation?: VariableTransformation;
  scope?: 'global' | 'workflow' | 'conversation' | 'session' | 'local';
  readonly?: boolean;
  encrypted?: boolean;
  tags?: string[];
}

export interface VariableValidation {
  type: 'regex' | 'range' | 'length' | 'enum' | 'custom';
  rule: string | number | string[] | ((value: any) => boolean);
  message?: string;
}

export interface VariableTransformation {
  type: 'format' | 'convert' | 'extract' | 'compute' | 'custom';
  rule: string | ((value: any, context: any) => any);
  description?: string;
}

export interface VariableBinding {
  sourceVariable: string;
  targetVariable: string;
  transformation?: VariableTransformation;
  condition?: string;
}

export interface DataFlow {
  id: string;
  name: string;
  description: string;
  bindings: VariableBinding[];
  triggers: DataFlowTrigger[];
  isActive: boolean;
}

export interface DataFlowTrigger {
  type: 'variable_change' | 'node_execution' | 'time_interval' | 'condition';
  config: Record<string, any>;
}

export class VariableManager {
  private static instance: VariableManager;
  private definitions: Map<string, VariableDefinition> = new Map();
  private dataFlows: Map<string, DataFlow> = new Map();
  private transformationFunctions: Map<string, Function> = new Map();

  static getInstance(): VariableManager {
    if (!VariableManager.instance) {
      VariableManager.instance = new VariableManager();
    }
    return VariableManager.instance;
  }

  constructor() {
    this.initializeBuiltInTransformations();
  }

  /**
   * Define a variable with validation and transformation rules
   */
  defineVariable(definition: VariableDefinition): void {
    this.definitions.set(definition.name, definition);
  }

  /**
   * Get variable definition
   */
  getDefinition(name: string): VariableDefinition | null {
    return this.definitions.get(name) || null;
  }

  /**
   * Set variable with validation and transformation
   */
  async setVariable(
    scopeId: string,
    name: string,
    value: any,
    options: {
      nodeId?: string;
      executionId?: string;
      skipValidation?: boolean;
      skipTransformation?: boolean;
    } = {}
  ): Promise<boolean> {
    const definition = this.definitions.get(name);
    
    try {
      let finalValue = value;

      // Apply transformation if defined and not skipped
      if (definition?.transformation && !options.skipTransformation) {
        finalValue = await this.applyTransformation(finalValue, definition.transformation, {
          scopeId,
          nodeId: options.nodeId,
          executionId: options.executionId
        });
      }

      // Validate value if definition exists and not skipped
      if (definition && !options.skipValidation) {
        const isValid = await this.validateValue(finalValue, definition);
        if (!isValid) {
          throw new Error(`Validation failed for variable ${name}`);
        }
      }

      // Set variable in context
      const success = executionContextManager.setVariable(scopeId, name, finalValue, {
        type: definition?.type,
        readonly: definition?.readonly,
        encrypted: definition?.encrypted,
        description: definition?.description,
        tags: definition?.tags,
        nodeId: options.nodeId,
        executionId: options.executionId
      });

      // Trigger data flows if variable was set successfully
      if (success) {
        await this.triggerDataFlows('variable_change', { variableName: name, scopeId, value: finalValue });
      }

      return success;

    } catch (error) {
      console.error(`Failed to set variable ${name}:`, error);
      return false;
    }
  }

  /**
   * Get variable with automatic type conversion
   */
  getVariable(
    scopeId: string,
    name: string,
    options: {
      nodeId?: string;
      executionId?: string;
      expectedType?: string;
    } = {}
  ): any {
    const value = executionContextManager.getVariable(scopeId, name, {
      nodeId: options.nodeId,
      executionId: options.executionId
    });

    if (value === undefined) {
      const definition = this.definitions.get(name);
      return definition?.defaultValue;
    }

    // Convert type if expected type is specified
    if (options.expectedType && options.expectedType !== typeof value) {
      return this.convertType(value, options.expectedType);
    }

    return value;
  }

  /**
   * Batch set multiple variables
   */
  async setVariables(
    scopeId: string,
    variables: Record<string, any>,
    options: {
      nodeId?: string;
      executionId?: string;
      skipValidation?: boolean;
      skipTransformation?: boolean;
    } = {}
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, value] of Object.entries(variables)) {
      results[name] = await this.setVariable(scopeId, name, value, options);
    }

    return results;
  }

  /**
   * Get multiple variables
   */
  getVariables(
    scopeId: string,
    names: string[],
    options: {
      nodeId?: string;
      executionId?: string;
    } = {}
  ): Record<string, any> {
    const variables: Record<string, any> = {};

    names.forEach(name => {
      variables[name] = this.getVariable(scopeId, name, options);
    });

    return variables;
  }

  /**
   * Create data flow binding
   */
  createDataFlow(dataFlow: Omit<DataFlow, 'id'>): DataFlow {
    const flow: DataFlow = {
      id: crypto.randomUUID(),
      ...dataFlow
    };

    this.dataFlows.set(flow.id, flow);
    return flow;
  }

  /**
   * Execute data flow bindings
   */
  async executeDataFlow(flowId: string, context: Record<string, any> = {}): Promise<void> {
    const flow = this.dataFlows.get(flowId);
    if (!flow || !flow.isActive) {
      return;
    }

    for (const binding of flow.bindings) {
      try {
        // Get source value
        const sourceValue = executionContextManager.getVariable(
          context.scopeId || 'global',
          binding.sourceVariable
        );

        if (sourceValue === undefined) {
          continue;
        }

        // Apply transformation if specified
        let targetValue = sourceValue;
        if (binding.transformation) {
          targetValue = await this.applyTransformation(sourceValue, binding.transformation, context);
        }

        // Check condition if specified
        if (binding.condition) {
          const conditionResult = this.evaluateCondition(binding.condition, {
            sourceValue,
            targetValue,
            ...context
          });
          if (!conditionResult) {
            continue;
          }
        }

        // Set target variable
        await this.setVariable(
          context.scopeId || 'global',
          binding.targetVariable,
          targetValue,
          {
            nodeId: context.nodeId,
            executionId: context.executionId
          }
        );

      } catch (error) {
        console.error(`Failed to execute binding ${binding.sourceVariable} -> ${binding.targetVariable}:`, error);
      }
    }
  }

  /**
   * Register custom transformation function
   */
  registerTransformation(name: string, func: Function): void {
    this.transformationFunctions.set(name, func);
  }

  /**
   * Validate variable value against definition
   */
  private async validateValue(value: any, definition: VariableDefinition): Promise<boolean> {
    // Check required
    if (definition.required && (value === undefined || value === null || value === '')) {
      return false;
    }

    // Check type
    if (value !== undefined && definition.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== definition.type && definition.type !== 'object') {
        return false;
      }
    }

    // Apply validation rules
    if (definition.validation) {
      return this.applyValidation(value, definition.validation);
    }

    return true;
  }

  /**
   * Apply validation rule
   */
  private applyValidation(value: any, validation: VariableValidation): boolean {
    switch (validation.type) {
      case 'regex':
        if (typeof validation.rule === 'string') {
          const regex = new RegExp(validation.rule);
          return regex.test(String(value));
        }
        break;

      case 'range':
        if (typeof validation.rule === 'number' && typeof value === 'number') {
          return value >= 0 && value <= validation.rule;
        }
        break;

      case 'length':
        if (typeof validation.rule === 'number') {
          const length = Array.isArray(value) ? value.length : String(value).length;
          return length <= validation.rule;
        }
        break;

      case 'enum':
        if (Array.isArray(validation.rule)) {
          return validation.rule.includes(value);
        }
        break;

      case 'custom':
        if (typeof validation.rule === 'function') {
          return validation.rule(value);
        }
        break;
    }

    return false;
  }

  /**
   * Apply transformation to value
   */
  private async applyTransformation(
    value: any,
    transformation: VariableTransformation,
    context: Record<string, any>
  ): Promise<any> {
    switch (transformation.type) {
      case 'format':
        if (typeof transformation.rule === 'string') {
          return this.formatValue(value, transformation.rule);
        }
        break;

      case 'convert':
        if (typeof transformation.rule === 'string') {
          return this.convertType(value, transformation.rule);
        }
        break;

      case 'extract':
        if (typeof transformation.rule === 'string') {
          return this.extractValue(value, transformation.rule);
        }
        break;

      case 'compute':
        if (typeof transformation.rule === 'string') {
          return this.computeValue(value, transformation.rule, context);
        }
        break;

      case 'custom':
        if (typeof transformation.rule === 'function') {
          return transformation.rule(value, context);
        } else if (typeof transformation.rule === 'string') {
          const func = this.transformationFunctions.get(transformation.rule);
          if (func) {
            return func(value, context);
          }
        }
        break;
    }

    return value;
  }

  /**
   * Format value using template
   */
  private formatValue(value: any, template: string): string {
    return template.replace(/\{value\}/g, String(value));
  }

  /**
   * Convert value to specified type
   */
  private convertType(value: any, targetType: string): any {
    switch (targetType) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'object':
        return typeof value === 'object' ? value : { value };
      default:
        return value;
    }
  }

  /**
   * Extract value using JSONPath or regex
   */
  private extractValue(value: any, rule: string): any {
    if (rule.startsWith('$.')) {
      // JSONPath extraction (simplified)
      const path = rule.substring(2).split('.');
      let result = value;
      for (const key of path) {
        if (result && typeof result === 'object') {
          result = result[key];
        } else {
          return undefined;
        }
      }
      return result;
    } else if (rule.startsWith('/') && rule.endsWith('/')) {
      // Regex extraction
      const regex = new RegExp(rule.slice(1, -1));
      const match = String(value).match(regex);
      return match ? match[1] || match[0] : null;
    }

    return value;
  }

  /**
   * Compute value using expression
   */
  private computeValue(value: any, expression: string, context: Record<string, any>): any {
    try {
      // Simple expression evaluation (in production, use a proper expression parser)
      const func = new Function('value', 'context', `return ${expression}`);
      return func(value, context);
    } catch (error) {
      console.error('Failed to compute value:', error);
      return value;
    }
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    try {
      const func = new Function('context', `with(context) { return ${condition}; }`);
      return Boolean(func(context));
    } catch (error) {
      console.error('Failed to evaluate condition:', error);
      return false;
    }
  }

  /**
   * Trigger data flows based on event
   */
  private async triggerDataFlows(eventType: string, eventData: Record<string, any>): Promise<void> {
    for (const [flowId, flow] of this.dataFlows) {
      if (!flow.isActive) continue;

      const shouldTrigger = flow.triggers.some(trigger => {
        if (trigger.type !== eventType) return false;

        switch (eventType) {
          case 'variable_change':
            return !trigger.config.variableName || trigger.config.variableName === eventData.variableName;
          default:
            return true;
        }
      });

      if (shouldTrigger) {
        await this.executeDataFlow(flowId, eventData);
      }
    }
  }

  /**
   * Initialize built-in transformation functions
   */
  private initializeBuiltInTransformations(): void {
    // String transformations
    this.registerTransformation('uppercase', (value: any) => String(value).toUpperCase());
    this.registerTransformation('lowercase', (value: any) => String(value).toLowerCase());
    this.registerTransformation('trim', (value: any) => String(value).trim());
    this.registerTransformation('reverse', (value: any) => String(value).split('').reverse().join(''));

    // Number transformations
    this.registerTransformation('abs', (value: any) => Math.abs(Number(value)));
    this.registerTransformation('round', (value: any) => Math.round(Number(value)));
    this.registerTransformation('ceil', (value: any) => Math.ceil(Number(value)));
    this.registerTransformation('floor', (value: any) => Math.floor(Number(value)));

    // Array transformations
    this.registerTransformation('length', (value: any) => {
      if (Array.isArray(value)) return value.length;
      if (typeof value === 'string') return value.length;
      if (typeof value === 'object') return Object.keys(value).length;
      return 0;
    });

    this.registerTransformation('first', (value: any) => {
      if (Array.isArray(value)) return value[0];
      return value;
    });

    this.registerTransformation('last', (value: any) => {
      if (Array.isArray(value)) return value[value.length - 1];
      return value;
    });

    // Date transformations
    this.registerTransformation('now', () => new Date().toISOString());
    this.registerTransformation('timestamp', () => Date.now());
    this.registerTransformation('date_format', (value: any, context: any) => {
      const date = new Date(value);
      const format = context.format || 'YYYY-MM-DD';
      return date.toISOString().split('T')[0]; // Simplified formatting
    });

    // JSON transformations
    this.registerTransformation('json_parse', (value: any) => {
      try {
        return JSON.parse(String(value));
      } catch {
        return value;
      }
    });

    this.registerTransformation('json_stringify', (value: any) => {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    });
  }
}

// Export singleton instance
export const variableManager = VariableManager.getInstance();