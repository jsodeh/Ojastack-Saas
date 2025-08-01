/**
 * Condition Builder
 * Visual interface for building complex conditional logic
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ChevronDown, 
  ChevronRight,
  Parentheses,
  Zap
} from 'lucide-react';
import { Condition, ConditionGroup, ConditionOperator } from '../../lib/workflow-nodes/conditional-logic-node';

interface ConditionBuilderProps {
  conditionGroups: ConditionGroup[];
  onConditionGroupsChange: (groups: ConditionGroup[]) => void;
  availableFields: string[];
  className?: string;
}

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  conditionGroups,
  onConditionGroupsChange,
  availableFields,
  className = ''
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const addConditionGroup = () => {
    const newGroup: ConditionGroup = {
      id: crypto.randomUUID(),
      operator: 'AND',
      conditions: []
    };
    
    onConditionGroupsChange([...conditionGroups, newGroup]);
    setExpandedGroups(prev => new Set(prev).add(newGroup.id));
  };

  const removeConditionGroup = (groupId: string) => {
    onConditionGroupsChange(conditionGroups.filter(group => group.id !== groupId));
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupId);
      return newSet;
    });
  };

  const updateConditionGroup = (groupId: string, updates: Partial<ConditionGroup>) => {
    onConditionGroupsChange(
      conditionGroups.map(group => 
        group.id === groupId ? { ...group, ...updates } : group
      )
    );
  };

  const addCondition = (groupId: string) => {
    const newCondition: Condition = {
      id: crypto.randomUUID(),
      field: '',
      operator: 'equals',
      value: '',
      type: 'string'
    };

    updateConditionGroup(groupId, {
      conditions: [
        ...conditionGroups.find(g => g.id === groupId)?.conditions || [],
        newCondition
      ]
    });
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    const group = conditionGroups.find(g => g.id === groupId);
    if (group) {
      updateConditionGroup(groupId, {
        conditions: group.conditions.filter(c => 
          'id' in c ? c.id !== conditionId : true
        )
      });
    }
  };

  const updateCondition = (groupId: string, conditionId: string, updates: Partial<Condition>) => {
    const group = conditionGroups.find(g => g.id === groupId);
    if (group) {
      updateConditionGroup(groupId, {
        conditions: group.conditions.map(c => 
          'id' in c && c.id === conditionId ? { ...c, ...updates } : c
        )
      });
    }
  };

  const duplicateConditionGroup = (groupId: string) => {
    const group = conditionGroups.find(g => g.id === groupId);
    if (group) {
      const duplicatedGroup: ConditionGroup = {
        ...group,
        id: crypto.randomUUID(),
        conditions: group.conditions.map(c => 
          'id' in c ? { ...c, id: crypto.randomUUID() } : c
        )
      };
      
      onConditionGroupsChange([...conditionGroups, duplicatedGroup]);
    }
  };

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const getOperatorOptions = (type: Condition['type']): ConditionOperator[] => {
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
  };

  const getOperatorLabel = (operator: ConditionOperator): string => {
    const labels: Record<ConditionOperator, string> = {
      equals: 'Equals',
      not_equals: 'Not Equals',
      greater_than: 'Greater Than',
      less_than: 'Less Than',
      greater_than_or_equal: 'Greater Than or Equal',
      less_than_or_equal: 'Less Than or Equal',
      contains: 'Contains',
      not_contains: 'Does Not Contain',
      starts_with: 'Starts With',
      ends_with: 'Ends With',
      is_empty: 'Is Empty',
      is_not_empty: 'Is Not Empty',
      in: 'In List',
      not_in: 'Not In List',
      matches_regex: 'Matches Regex',
      is_null: 'Is Null',
      is_not_null: 'Is Not Null'
    };
    return labels[operator] || operator;
  };

  const renderCondition = (condition: Condition, groupId: string) => {
    const operatorOptions = getOperatorOptions(condition.type);
    const needsValue = !['is_null', 'is_not_null', 'is_empty', 'is_not_empty'].includes(condition.operator);

    return (
      <div key={condition.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <div className="flex-1 grid grid-cols-4 gap-2">
          {/* Field Selection */}
          <div>
            <Label className="text-xs text-gray-500">Field</Label>
            <select
              value={condition.field}
              onChange={(e) => updateCondition(groupId, condition.id, { field: e.target.value })}
              className="w-full px-2 py-1 text-sm border rounded"
            >
              <option value="">Select field...</option>
              {availableFields.map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>
          </div>

          {/* Type Selection */}
          <div>
            <Label className="text-xs text-gray-500">Type</Label>
            <select
              value={condition.type}
              onChange={(e) => updateCondition(groupId, condition.id, { 
                type: e.target.value as Condition['type'],
                operator: 'equals' // Reset operator when type changes
              })}
              className="w-full px-2 py-1 text-sm border rounded"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="date">Date</option>
              <option value="array">Array</option>
              <option value="object">Object</option>
            </select>
          </div>

          {/* Operator Selection */}
          <div>
            <Label className="text-xs text-gray-500">Operator</Label>
            <select
              value={condition.operator}
              onChange={(e) => updateCondition(groupId, condition.id, { operator: e.target.value as ConditionOperator })}
              className="w-full px-2 py-1 text-sm border rounded"
            >
              {operatorOptions.map(op => (
                <option key={op} value={op}>{getOperatorLabel(op)}</option>
              ))}
            </select>
          </div>

          {/* Value Input */}
          <div>
            <Label className="text-xs text-gray-500">Value</Label>
            {needsValue ? (
              condition.type === 'boolean' ? (
                <select
                  value={condition.value}
                  onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
                  className="w-full px-2 py-1 text-sm border rounded"
                >
                  <option value="">Select...</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : condition.operator === 'in' || condition.operator === 'not_in' ? (
                <Input
                  placeholder="value1,value2,value3"
                  value={condition.value}
                  onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
                  className="text-sm"
                />
              ) : (
                <Input
                  type={condition.type === 'number' ? 'number' : condition.type === 'date' ? 'datetime-local' : 'text'}
                  placeholder="Enter value..."
                  value={condition.value}
                  onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
                  className="text-sm"
                />
              )
            ) : (
              <div className="px-2 py-1 text-xs text-gray-400 bg-gray-100 rounded">
                No value needed
              </div>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeCondition(groupId, condition.id)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const renderConditionGroup = (group: ConditionGroup, index: number) => {
    const isExpanded = expandedGroups.has(group.id);
    const hasConditions = group.conditions.length > 0;

    return (
      <Card key={group.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleGroupExpansion(group.id)}
                className="p-1"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              
              <Parentheses className="h-4 w-4 text-gray-400" />
              
              <CardTitle className="text-sm">
                Group {index + 1}
              </CardTitle>
              
              <Badge variant={group.operator === 'AND' ? 'default' : 'secondary'}>
                {group.operator}
              </Badge>
              
              {hasConditions && (
                <Badge variant="outline" className="text-xs">
                  {group.conditions.length} condition{group.conditions.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => duplicateConditionGroup(group.id)}
                className="p-1"
              >
                <Copy className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeConditionGroup(group.id)}
                className="p-1 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="flex items-center gap-2 mt-2">
              <Label className="text-xs text-gray-500">Group Operator:</Label>
              <select
                value={group.operator}
                onChange={(e) => updateConditionGroup(group.id, { operator: e.target.value as 'AND' | 'OR' })}
                className="px-2 py-1 text-sm border rounded"
              >
                <option value="AND">AND (all conditions must be true)</option>
                <option value="OR">OR (any condition can be true)</option>
              </select>
            </div>
          )}
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              {group.conditions.map((condition) => 
                renderCondition(condition as Condition, group.id)
              )}
              
              {group.conditions.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conditions yet</p>
                  <p className="text-xs">Add a condition to get started</p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => addCondition(group.id)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Condition Builder</h3>
          <p className="text-sm text-gray-500">
            Build complex conditional logic with multiple condition groups
          </p>
        </div>
        
        <Button onClick={addConditionGroup} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Group
        </Button>
      </div>

      {conditionGroups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Parentheses className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <CardTitle className="text-lg mb-2">No Condition Groups</CardTitle>
            <CardDescription className="mb-4">
              Create condition groups to build complex logical expressions
            </CardDescription>
            <Button onClick={addConditionGroup}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          {conditionGroups.map((group, index) => renderConditionGroup(group, index))}
          
          {conditionGroups.length > 1 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Zap className="h-4 w-4" />
                <span className="font-medium">Logic Flow:</span>
                <span>
                  Groups are evaluated with AND logic - all groups must be true for the condition to pass
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConditionBuilder;