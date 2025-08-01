/**
 * Data Transform Node
 * Node for data manipulation and transformation operations
 */

import { BaseNode, NodeExecutionContext, NodeExecutionResult } from './base-node';

export type TransformOperation = 
  | 'map'
  | 'filter'
  | 'reduce'
  | 'sort'
  | 'group_by'
  | 'merge'
  | 'split'
  | 'flatten'
  | 'unique'
  | 'aggregate'
  | 'pivot'
  | 'unpivot'
  | 'join'
  | 'format'
  | 'validate'
  | 'convert_type'
  | 'extract'
  | 'replace'
  | 'calculate';

export interface TransformRule {
  id: string;
  operation: TransformOperation;
  sourceField?: string;
  targetField?: string;
  parameters: Record<string, any>;
  condition?: {
    field: string;
    operator: string;
    value: any;
  };
}

export interface DataTransformNodeConfig {
  transformRules: TransformRule[];
  outputFormat: 'object' | 'array' | 'primitive';
  errorHandling: 'stop' | 'skip' | 'default_value';
  defaultValue?: any;
  preserveOriginal: boolean;
  batchProcessing: boolean;
  batchSize?: number;
}

export class DataTransformNode extends BaseNode {
  type = 'data-transform';
  name = 'Data Transform';
  description = 'Transform and manipulate data with various operations';
  category = 'data';
  
  config: DataTransformNodeConfig = {
    transformRules: [],
    outputFormat: 'object',
    errorHandling: 'stop',
    preserveOriginal: false,
    batchProcessing: false
  };

  constructor(id: string, position: { x: number; y: number }) {
    super(id, position);
    
    this.inputs = [
      {
        id: 'data',
        name: 'Data',
        type: 'data',
        required: true
      }
    ];

    this.outputs = [
      {
        id: 'transformed',
        name: 'Transformed',
        type: 'data'
      },
      {
        id: 'error',
        name: 'Error',
        type: 'flow'
      }
    ];
  }

  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    try {
      const { data, variables } = context;
      let transformedData = this.config.preserveOriginal ? { ...data } : {};
      const logs: any[] = [];

      // Apply each transform rule
      for (const rule of this.config.transformRules) {
        try {
          const ruleResult = await this.applyTransformRule(rule, data, transformedData, variables);
          
          if (ruleResult.success) {
            transformedData = ruleResult.data;
            logs.push({
              level: 'info',
              message: `Applied transform rule: ${rule.operation}`,
              timestamp: new Date().toISOString()
            });
          } else {
            if (this.config.errorHandling === 'stop') {
              throw new Error(ruleResult.error);
            } else if (this.config.errorHandling === 'default_value' && this.config.defaultValue !== undefined) {
              transformedData[rule.targetField || rule.sourceField || 'result'] = this.config.defaultValue;
            }
            
            logs.push({
              level: 'warn',
              message: `Transform rule failed: ${rule.operation} - ${ruleResult.error}`,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          if (this.config.errorHandling === 'stop') {
            throw error;
          }
          
          logs.push({
            level: 'error',
            message: `Transform rule error: ${rule.operation} - ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Format output based on configuration
      const finalOutput = this.formatOutput(transformedData);

      return {
        success: true,
        data: finalOutput,
        nextNodes: ['transformed'],
        logs
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: context.data,
        nextNodes: ['error'],
        logs: [{
          level: 'error',
          message: `Data transformation failed: ${error.message}`,
          timestamp: new Date().toISOString()
        }]
      };
    }
  }

  private async applyTransformRule(
    rule: TransformRule,
    originalData: any,
    currentData: any,
    variables: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    
    // Check condition if specified
    if (rule.condition && !this.evaluateCondition(rule.condition, originalData, variables)) {
      return { success: true, data: currentData };
    }

    const sourceValue = rule.sourceField ? 
      this.getFieldValue(rule.sourceField, originalData, variables) : originalData;

    try {
      let result: any;

      switch (rule.operation) {
        case 'map':
          result = await this.applyMapOperation(sourceValue, rule.parameters);
          break;
        
        case 'filter':
          result = await this.applyFilterOperation(sourceValue, rule.parameters);
          break;
        
        case 'reduce':
          result = await this.applyReduceOperation(sourceValue, rule.parameters);
          break;
        
        case 'sort':
          result = await this.applySortOperation(sourceValue, rule.parameters);
          break;
        
        case 'group_by':
          result = await this.applyGroupByOperation(sourceValue, rule.parameters);
          break;
        
        case 'merge':
          result = await this.applyMergeOperation(sourceValue, rule.parameters, variables);
          break;
        
        case 'split':
          result = await this.applySplitOperation(sourceValue, rule.parameters);
          break;
        
        case 'flatten':
          result = await this.applyFlattenOperation(sourceValue, rule.parameters);
          break;
        
        case 'unique':
          result = await this.applyUniqueOperation(sourceValue, rule.parameters);
          break;
        
        case 'aggregate':
          result = await this.applyAggregateOperation(sourceValue, rule.parameters);
          break;
        
        case 'format':
          result = await this.applyFormatOperation(sourceValue, rule.parameters);
          break;
        
        case 'validate':
          result = await this.applyValidateOperation(sourceValue, rule.parameters);
          break;
        
        case 'convert_type':
          result = await this.applyConvertTypeOperation(sourceValue, rule.parameters);
          break;
        
        case 'extract':
          result = await this.applyExtractOperation(sourceValue, rule.parameters);
          break;
        
        case 'replace':
          result = await this.applyReplaceOperation(sourceValue, rule.parameters);
          break;
        
        case 'calculate':
          result = await this.applyCalculateOperation(sourceValue, rule.parameters, variables);
          break;
        
        default:
          throw new Error(`Unsupported transform operation: ${rule.operation}`);
      }

      // Set the result in the target field
      const targetField = rule.targetField || rule.sourceField || 'result';
      if (targetField.includes('.')) {
        this.setNestedValue(currentData, targetField, result);
      } else {
        currentData[targetField] = result;
      }

      return { success: true, data: currentData };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async applyMapOperation(data: any, params: any): Promise<any> {
    if (!Array.isArray(data)) {
      throw new Error('Map operation requires array input');
    }

    const { expression, field } = params;
    
    return data.map((item, index) => {
      if (field) {
        return { ...item, [field]: this.evaluateExpression(expression, item, { index }) };
      } else {
        return this.evaluateExpression(expression, item, { index });
      }
    });
  }

  private async applyFilterOperation(data: any, params: any): Promise<any> {
    if (!Array.isArray(data)) {
      throw new Error('Filter operation requires array input');
    }

    const { condition } = params;
    
    return data.filter(item => this.evaluateCondition(condition, item, {}));
  }

  private async applyReduceOperation(data: any, params: any): Promise<any> {
    if (!Array.isArray(data)) {
      throw new Error('Reduce operation requires array input');
    }

    const { operation, field, initialValue } = params;
    
    switch (operation) {
      case 'sum':
        return data.reduce((acc, item) => acc + (Number(item[field]) || 0), initialValue || 0);
      case 'avg':
        const sum = data.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
        return sum / data.length;
      case 'min':
        return Math.min(...data.map(item => Number(item[field]) || 0));
      case 'max':
        return Math.max(...data.map(item => Number(item[field]) || 0));
      case 'count':
        return data.length;
      case 'concat':
        return data.reduce((acc, item) => acc + String(item[field] || ''), initialValue || '');
      default:
        throw new Error(`Unsupported reduce operation: ${operation}`);
    }
  }

  private async applySortOperation(data: any, params: any): Promise<any> {
    if (!Array.isArray(data)) {
      throw new Error('Sort operation requires array input');
    }

    const { field, direction = 'asc' } = params;
    
    return [...data].sort((a, b) => {
      const aVal = field ? a[field] : a;
      const bVal = field ? b[field] : b;
      
      if (direction === 'desc') {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });
  }

  private async applyGroupByOperation(data: any, params: any): Promise<any> {
    if (!Array.isArray(data)) {
      throw new Error('Group by operation requires array input');
    }

    const { field } = params;
    
    return data.reduce((groups, item) => {
      const key = item[field];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }

  private async applyMergeOperation(data: any, params: any, variables: Record<string, any>): Promise<any> {
    const { source, strategy = 'shallow' } = params;
    const sourceData = this.getFieldValue(source, data, variables);
    
    if (strategy === 'deep') {
      return this.deepMerge(data, sourceData);
    } else {
      return { ...data, ...sourceData };
    }
  }

  private async applySplitOperation(data: any, params: any): Promise<any> {
    const { delimiter, field } = params;
    
    if (field) {
      return {
        ...data,
        [field]: String(data[field] || '').split(delimiter)
      };
    } else {
      return String(data).split(delimiter);
    }
  }

  private async applyFlattenOperation(data: any, params: any): Promise<any> {
    const { depth = 1 } = params;
    
    if (Array.isArray(data)) {
      return data.flat(depth);
    } else {
      throw new Error('Flatten operation requires array input');
    }
  }

  private async applyUniqueOperation(data: any, params: any): Promise<any> {
    if (!Array.isArray(data)) {
      throw new Error('Unique operation requires array input');
    }

    const { field } = params;
    
    if (field) {
      const seen = new Set();
      return data.filter(item => {
        const value = item[field];
        if (seen.has(value)) {
          return false;
        }
        seen.add(value);
        return true;
      });
    } else {
      return [...new Set(data)];
    }
  }

  private async applyAggregateOperation(data: any, params: any): Promise<any> {
    if (!Array.isArray(data)) {
      throw new Error('Aggregate operation requires array input');
    }

    const { operations } = params;
    const result: any = {};
    
    for (const [key, operation] of Object.entries(operations)) {
      const { type, field } = operation as any;
      
      switch (type) {
        case 'sum':
          result[key] = data.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
          break;
        case 'avg':
          const sum = data.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
          result[key] = sum / data.length;
          break;
        case 'count':
          result[key] = data.length;
          break;
        case 'min':
          result[key] = Math.min(...data.map(item => Number(item[field]) || 0));
          break;
        case 'max':
          result[key] = Math.max(...data.map(item => Number(item[field]) || 0));
          break;
      }
    }
    
    return result;
  }

  private async applyFormatOperation(data: any, params: any): Promise<any> {
    const { format, field } = params;
    const value = field ? data[field] : data;
    
    switch (format) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'capitalize':
        return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'number':
        return Number(value);
      case 'date':
        return new Date(value).toISOString();
      case 'json':
        return JSON.stringify(value);
      default:
        return value;
    }
  }

  private async applyValidateOperation(data: any, params: any): Promise<any> {
    const { rules } = params;
    const errors: string[] = [];
    
    for (const rule of rules) {
      const { field, type, required, min, max, pattern } = rule;
      const value = data[field];
      
      if (required && (value === undefined || value === null || value === '')) {
        errors.push(`Field ${field} is required`);
        continue;
      }
      
      if (value !== undefined && value !== null) {
        switch (type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push(`Field ${field} must be a string`);
            } else {
              if (min && value.length < min) {
                errors.push(`Field ${field} must be at least ${min} characters`);
              }
              if (max && value.length > max) {
                errors.push(`Field ${field} must be at most ${max} characters`);
              }
              if (pattern && !new RegExp(pattern).test(value)) {
                errors.push(`Field ${field} does not match required pattern`);
              }
            }
            break;
          case 'number':
            if (typeof value !== 'number') {
              errors.push(`Field ${field} must be a number`);
            } else {
              if (min && value < min) {
                errors.push(`Field ${field} must be at least ${min}`);
              }
              if (max && value > max) {
                errors.push(`Field ${field} must be at most ${max}`);
              }
            }
            break;
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data
    };
  }

  private async applyConvertTypeOperation(data: any, params: any): Promise<any> {
    const { targetType, field } = params;
    const value = field ? data[field] : data;
    
    switch (targetType) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'object':
        return typeof value === 'object' ? value : { value };
      default:
        return value;
    }
  }

  private async applyExtractOperation(data: any, params: any): Promise<any> {
    const { pattern, field, flags = 'g' } = params;
    const value = String(field ? data[field] : data);
    
    const regex = new RegExp(pattern, flags);
    const matches = value.match(regex);
    
    return matches || [];
  }

  private async applyReplaceOperation(data: any, params: any): Promise<any> {
    const { pattern, replacement, field, flags = 'g' } = params;
    const value = String(field ? data[field] : data);
    
    const regex = new RegExp(pattern, flags);
    return value.replace(regex, replacement);
  }

  private async applyCalculateOperation(data: any, params: any, variables: Record<string, any>): Promise<any> {
    const { expression } = params;
    return this.evaluateExpression(expression, data, variables);
  }

  private evaluateExpression(expression: string, data: any, variables: Record<string, any>): any {
    // Simple expression evaluator - in a real implementation, you'd use a proper parser
    try {
      // Replace field references with actual values
      let processedExpression = expression;
      
      // Replace data field references (e.g., data.field)
      processedExpression = processedExpression.replace(/data\.(\w+)/g, (match, field) => {
        return JSON.stringify(data[field]);
      });
      
      // Replace variable references (e.g., $var)
      processedExpression = processedExpression.replace(/\$(\w+)/g, (match, varName) => {
        return JSON.stringify(variables[varName]);
      });
      
      // Basic math operations
      return Function(`"use strict"; return (${processedExpression})`)();
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error.message}`);
    }
  }

  private evaluateCondition(condition: any, data: any, variables: Record<string, any>): boolean {
    const { field, operator, value } = condition;
    const fieldValue = this.getFieldValue(field, data, variables);
    
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'contains':
        return String(fieldValue).includes(String(value));
      default:
        return false;
    }
  }

  private getFieldValue(field: string, data: any, variables: Record<string, any>): any {
    if (field.startsWith('$')) {
      return variables[field.substring(1)];
    }

    const parts = field.split('.');
    let value = data;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private formatOutput(data: any): any {
    switch (this.config.outputFormat) {
      case 'array':
        return Array.isArray(data) ? data : Object.values(data);
      case 'primitive':
        if (typeof data === 'object' && data !== null) {
          const keys = Object.keys(data);
          return keys.length === 1 ? data[keys[0]] : data;
        }
        return data;
      case 'object':
      default:
        return data;
    }
  }

  addTransformRule(rule: TransformRule): void {
    this.config.transformRules.push(rule);
  }

  removeTransformRule(ruleId: string): void {
    this.config.transformRules = this.config.transformRules.filter(rule => rule.id !== ruleId);
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.transformRules.length === 0) {
      errors.push('At least one transform rule is required');
    }

    for (const rule of this.config.transformRules) {
      if (!rule.operation) {
        errors.push(`Transform rule ${rule.id} is missing operation`);
      }
      
      if (!rule.parameters) {
        errors.push(`Transform rule ${rule.id} is missing parameters`);
      }
    }

    if (this.config.batchProcessing && (!this.config.batchSize || this.config.batchSize <= 0)) {
      errors.push('Batch size must be positive when batch processing is enabled');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  clone(): DataTransformNode {
    const cloned = new DataTransformNode(
      `${this.id}_copy`,
      { x: this.position.x + 50, y: this.position.y + 50 }
    );
    
    cloned.config = JSON.parse(JSON.stringify(this.config));
    
    return cloned;
  }
}

export default DataTransformNode;