/**
 * Conditional Logic Node
 * Advanced node for complex conditional logic with visual condition builder
 */

import { BaseNode, NodeExecutionContext, NodeExecutionResult } from './base-node';

export interface Condition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
}

export interface ConditionGroup {
  id: string;
  operator: 'AND' | 'OR';
  conditions: (Condition | ConditionGroup)[];
}

export type ConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in'
  | 'matches_regex'
  | 'is_null'
  | 'is_not_null';

export interface ConditionalLogicNodeConfig {
  conditionGroups: ConditionGroup[];
  defaultPath: string;
  paths: {
    [key: string]: {
      name: string;
      description?: string;
      conditionGroupId: string;
    };
  };
}

export class ConditionalLogicNode extends BaseNode {
  type = 'conditional-logic';
  name = 'Conditional Logic';
  description = 'Advanced conditional logic with visual condition builder';
  category = 'logic';
  
  config: ConditionalLogicNodeConfig = {
    conditionGroups: [],
    defaultPath: 'default',
    paths: {
      default: {
        name: 'Default',
        description: 'Default path when no conditions match',
        conditionGroupId: ''
      }
    }
  };

  constructor(id: string, position: { x: number; y: number }) {
    super(id, position);
    this.outputs = [
      {
        id: 'default',
        name: 'Default',
        type: 'flow'
      }
    ];
  }

  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    try {
      const { data, variables } = context;
      
      // Evaluate all condition groups
      for (const [pathId, pathConfig] of Object.entries(this.config.paths)) {
        if (pathId === 'default') continue;
        
        const conditionGroup = this.config.conditionGroups.find(
          group => group.id === pathConfig.conditionGroupId
        );
        
        if (conditionGroup && this.evaluateConditionGroup(conditionGroup, data, variables)) {
          return {
            success: true,
            data: {
              ...data,
              conditionResult: {
                path: pathId,
                pathName: pathConfig.name,
                matched: true
              }
            },
            nextNodes: [pathId],
            logs: [{
              level: 'info',
              message: `Condition matched: ${pathConfig.name}`,
              timestamp: new Date().toISOString()
            }]
          };
        }
      }

      // No conditions matched, use default path
      return {
        success: true,
        data: {
          ...data,
          conditionResult: {
            path: 'default',
            pathName: 'Default',
            matched: false
          }
        },
        nextNodes: ['default'],
        logs: [{
          level: 'info',
          message: 'No conditions matched, using default path',
          timestamp: new Date().toISOString()
        }]
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: context.data,
        logs: [{
          level: 'error',
          message: `Conditional logic execution failed: ${error.message}`,
          timestamp: new Date().toISOString()
        }]
      };
    }
  }

  private evaluateConditionGroup(
    group: ConditionGroup, 
    data: any, 
    variables: Record<string, any>
  ): boolean {
    const results = group.conditions.map(condition => {
      if ('conditions' in condition) {
        // Nested condition group
        return this.evaluateConditionGroup(condition, data, variables);
      } else {
        // Individual condition
        return this.evaluateCondition(condition, data, variables);
      }
    });

    if (group.operator === 'AND') {
      return results.every(result => result);
    } else {
      return results.some(result => result);
    }
  }

  private evaluateCondition(
    condition: Condition, 
    data: any, 
    variables: Record<string, any>
  ): boolean {
    const fieldValue = this.getFieldValue(condition.field, data, variables);
    const compareValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === compareValue;
      
      case 'not_equals':
        return fieldValue !== compareValue;
      
      case 'greater_than':
        return Number(fieldValue) > Number(compareValue);
      
      case 'less_than':
        return Number(fieldValue) < Number(compareValue);
      
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(compareValue);
      
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(compareValue);
      
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      
      case 'starts_with':
        return String(fieldValue).toLowerCase().startsWith(String(compareValue).toLowerCase());
      
      case 'ends_with':
        return String(fieldValue).toLowerCase().endsWith(String(compareValue).toLowerCase());
      
      case 'is_empty':
        return !fieldValue || fieldValue === '' || 
               (Array.isArray(fieldValue) && fieldValue.length === 0) ||
               (typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0);
      
      case 'is_not_empty':
        return fieldValue && fieldValue !== '' && 
               (!Array.isArray(fieldValue) || fieldValue.length > 0) &&
               (typeof fieldValue !== 'object' || Object.keys(fieldValue).length > 0);
      
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      
      case 'not_in':
        return !Array.isArray(compareValue) || !compareValue.includes(fieldValue);
      
      case 'matches_regex':
        try {
          const regex = new RegExp(compareValue);
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }
      
      case 'is_null':
        return fieldValue === null || fieldValue === undefined;
      
      case 'is_not_null':
        return fieldValue !== null && fieldValue !== undefined;
      
      default:
        return false;
    }
  }

  private getFieldValue(field: string, data: any, variables: Record<string, any>): any {
    // Support dot notation for nested fields
    const parts = field.split('.');
    let value = data;

    // Check if it's a variable reference
    if (field.startsWith('$')) {
      const varName = field.substring(1);
      value = variables[varName];
    } else {
      // Navigate through the data object
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return undefined;
        }
      }
    }

    return value;
  }

  addConditionGroup(group: ConditionGroup): void {
    this.config.conditionGroups.push(group);
  }

  removeConditionGroup(groupId: string): void {
    this.config.conditionGroups = this.config.conditionGroups.filter(
      group => group.id !== groupId
    );
  }

  addPath(pathId: string, name: string, conditionGroupId: string, description?: string): void {
    this.config.paths[pathId] = {
      name,
      description,
      conditionGroupId
    };

    // Add output for this path
    this.outputs.push({
      id: pathId,
      name,
      type: 'flow'
    });
  }

  removePath(pathId: string): void {
    if (pathId === 'default') return; // Can't remove default path
    
    delete this.config.paths[pathId];
    this.outputs = this.outputs.filter(output => output.id !== pathId);
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if there are condition groups
    if (this.config.conditionGroups.length === 0) {
      errors.push('At least one condition group is required');
    }

    // Validate condition groups
    for (const group of this.config.conditionGroups) {
      if (group.conditions.length === 0) {
        errors.push(`Condition group ${group.id} has no conditions`);
      }

      // Validate individual conditions
      for (const condition of group.conditions) {
        if ('conditions' in condition) {
          // Nested group validation would go here
          continue;
        }

        if (!condition.field) {
          errors.push(`Condition ${condition.id} is missing field`);
        }

        if (condition.value === undefined && 
            !['is_empty', 'is_not_empty', 'is_null', 'is_not_null'].includes(condition.operator)) {
          errors.push(`Condition ${condition.id} is missing value`);
        }
      }
    }

    // Check if all paths have valid condition groups
    for (const [pathId, pathConfig] of Object.entries(this.config.paths)) {
      if (pathId === 'default') continue;
      
      if (!pathConfig.conditionGroupId) {
        errors.push(`Path ${pathId} is missing condition group`);
      } else {
        const groupExists = this.config.conditionGroups.some(
          group => group.id === pathConfig.conditionGroupId
        );
        if (!groupExists) {
          errors.push(`Path ${pathId} references non-existent condition group`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getAvailableOperators(type: Condition['type']): ConditionOperator[] {
    const baseOperators: ConditionOperator[] = ['equals', 'not_equals', 'is_null', 'is_not_null'];
    
    switch (type) {
      case 'string':
        return [
          ...baseOperators,
          'contains', 'not_contains', 'starts_with', 'ends_with',
          'is_empty', 'is_not_empty', 'matches_regex', 'in', 'not_in'
        ];
      
      case 'number':
        return [
          ...baseOperators,
          'greater_than', 'less_than', 'greater_than_or_equal', 
          'less_than_or_equal', 'in', 'not_in'
        ];
      
      case 'boolean':
        return baseOperators;
      
      case 'date':
        return [
          ...baseOperators,
          'greater_than', 'less_than', 'greater_than_or_equal', 
          'less_than_or_equal'
        ];
      
      case 'array':
        return [
          ...baseOperators,
          'is_empty', 'is_not_empty', 'contains', 'not_contains'
        ];
      
      case 'object':
        return [
          ...baseOperators,
          'is_empty', 'is_not_empty'
        ];
      
      default:
        return baseOperators;
    }
  }

  clone(): ConditionalLogicNode {
    const cloned = new ConditionalLogicNode(
      `${this.id}_copy`,
      { x: this.position.x + 50, y: this.position.y + 50 }
    );
    
    cloned.config = JSON.parse(JSON.stringify(this.config));
    cloned.outputs = JSON.parse(JSON.stringify(this.outputs));
    
    return cloned;
  }
}

export default ConditionalLogicNode;