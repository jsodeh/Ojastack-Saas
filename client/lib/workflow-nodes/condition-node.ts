/**
 * Condition Nodes for Workflow System
 * Handle workflow branching logic
 */

import { BaseWorkflowNode, ExecutionContext } from './base-node';
import { NodePort, ValidationResult } from '@/lib/workflow-types';

export class ConditionNode extends BaseWorkflowNode {
  async execute(input: any, context: ExecutionContext): Promise<any> {
    context.log('info', 'Condition node executing', { input });

    const value = input.value;
    const operator = this.node.configuration.operator || 'equals';
    const compareValue = this.node.configuration.compare_value;
    const caseSensitive = this.node.configuration.case_sensitive !== false;

    let result = false;

    try {
      result = this.evaluateCondition(value, operator, compareValue, caseSensitive);

      context.log('info', 'Condition evaluated', {
        value,
        operator,
        compareValue,
        result
      });

      context.setVariable('condition_result', result);
      context.setVariable('condition_value', value);

      context.emit('condition_evaluated', {
        value,
        operator,
        compareValue,
        result
      });

      return {
        result,
        value,
        operator,
        compareValue
      };
    } catch (error) {
      context.log('error', 'Condition evaluation failed', { error: error.message });
      throw new Error(`Condition evaluation failed: ${error.message}`);
    }
  }

  private evaluateCondition(
    value: any,
    operator: string,
    compareValue: any,
    caseSensitive: boolean
  ): boolean {
    // Convert values to strings for comparison if needed
    const val = caseSensitive ? String(value) : String(value).toLowerCase();
    const compVal = caseSensitive ? String(compareValue) : String(compareValue).toLowerCase();

    switch (operator) {
      case 'equals':
        return val === compVal;
      
      case 'not_equals':
        return val !== compVal;
      
      case 'contains':
        return val.includes(compVal);
      
      case 'not_contains':
        return !val.includes(compVal);
      
      case 'starts_with':
        return val.startsWith(compVal);
      
      case 'ends_with':
        return val.endsWith(compVal);
      
      case 'greater_than':
        return Number(value) > Number(compareValue);
      
      case 'less_than':
        return Number(value) < Number(compareValue);
      
      case 'greater_equal':
        return Number(value) >= Number(compareValue);
      
      case 'less_equal':
        return Number(value) <= Number(compareValue);
      
      case 'is_empty':
        return !value || String(value).trim() === '';
      
      case 'is_not_empty':
        return value && String(value).trim() !== '';
      
      case 'regex_match':
        try {
          const regex = new RegExp(compareValue, caseSensitive ? 'g' : 'gi');
          return regex.test(String(value));
        } catch (error) {
          throw new Error(`Invalid regex pattern: ${compareValue}`);
        }
      
      case 'in_list':
        if (!Array.isArray(compareValue)) {
          throw new Error('Compare value must be an array for "in_list" operator');
        }
        return compareValue.some(item => 
          caseSensitive ? String(item) === val : String(item).toLowerCase() === val
        );
      
      case 'not_in_list':
        if (!Array.isArray(compareValue)) {
          throw new Error('Compare value must be an array for "not_in_list" operator');
        }
        return !compareValue.some(item => 
          caseSensitive ? String(item) === val : String(item).toLowerCase() === val
        );
      
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  validate(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    const operator = this.node.configuration.operator;
    if (!operator) {
      errors.push({
        nodeId: this.node.id,
        type: 'missing_configuration',
        message: 'Operator is required',
        severity: 'error'
      });
    }

    const compareValue = this.node.configuration.compare_value;
    if (operator && !['is_empty', 'is_not_empty'].includes(operator) && compareValue === undefined) {
      errors.push({
        nodeId: this.node.id,
        type: 'missing_configuration',
        message: 'Compare value is required for this operator',
        severity: 'error'
      });
    }

    if (operator === 'regex_match' && compareValue) {
      try {
        new RegExp(compareValue);
      } catch (error) {
        errors.push({
          nodeId: this.node.id,
          type: 'invalid_configuration',
          message: 'Invalid regex pattern in compare value',
          severity: 'error'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  getConfigurationSchema(): any {
    return {
      type: 'object',
      properties: {
        operator: {
          type: 'string',
          title: 'Operator',
          enum: [
            'equals',
            'not_equals',
            'contains',
            'not_contains',
            'starts_with',
            'ends_with',
            'greater_than',
            'less_than',
            'greater_equal',
            'less_equal',
            'is_empty',
            'is_not_empty',
            'regex_match',
            'in_list',
            'not_in_list'
          ],
          default: 'equals'
        },
        compare_value: {
          type: 'string',
          title: 'Compare Value',
          description: 'Value to compare against (not needed for is_empty/is_not_empty)'
        },
        case_sensitive: {
          type: 'boolean',
          title: 'Case Sensitive',
          default: false,
          description: 'Whether string comparisons should be case sensitive'
        },
        data_type: {
          type: 'string',
          title: 'Data Type',
          enum: ['string', 'number', 'boolean'],
          default: 'string',
          description: 'How to interpret the input value'
        }
      },
      required: ['operator']
    };
  }

  getDefaultConfiguration(): Record<string, any> {
    return {
      operator: 'equals',
      case_sensitive: false,
      data_type: 'string'
    };
  }

  getInputPorts(): NodePort[] {
    return [
      this.createPort('value', 'data', 'any', true, 'The value to evaluate'),
      this.createPort('trigger', 'control', 'any', true, 'Control flow input')
    ];
  }

  getOutputPorts(): NodePort[] {
    return [
      this.createPort('result', 'data', 'boolean', true, 'The condition result (true/false)'),
      this.createPort('true', 'control', 'any', false, 'Control flow when condition is true'),
      this.createPort('false', 'control', 'any', false, 'Control flow when condition is false'),
      this.createPort('next', 'control', 'any', true, 'Control flow output (always)')
    ];
  }
}

export class SentimentAnalysisNode extends BaseWorkflowNode {
  async execute(input: any, context: ExecutionContext): Promise<any> {
    context.log('info', 'Sentiment Analysis node executing', { input });

    const message = input.message || input.text || '';
    const threshold = this.node.configuration.threshold || 0.5;

    if (!message) {
      throw new Error('Message is required for sentiment analysis');
    }

    try {
      const analysis = await this.analyzeSentiment(message, threshold);

      context.setVariable('sentiment', analysis.sentiment);
      context.setVariable('sentiment_confidence', analysis.confidence);
      context.setVariable('sentiment_scores', analysis.scores);

      context.emit('sentiment_analyzed', {
        message,
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
        scores: analysis.scores
      });

      return analysis;
    } catch (error) {
      context.log('error', 'Sentiment analysis failed', { error: error.message });
      throw new Error(`Sentiment analysis failed: ${error.message}`);
    }
  }

  private async analyzeSentiment(message: string, threshold: number): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    scores: { positive: number; negative: number; neutral: number };
  }> {
    // Simulate sentiment analysis
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

    // Simple keyword-based sentiment analysis for demo
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'pleased'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'disappointed', 'sad'];

    const words = message.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
    });

    const totalWords = words.length;
    const positiveRatio = positiveScore / totalWords;
    const negativeRatio = negativeScore / totalWords;
    const neutralRatio = 1 - positiveRatio - negativeRatio;

    // Determine sentiment
    let sentiment: 'positive' | 'negative' | 'neutral';
    let confidence: number;

    if (positiveRatio > negativeRatio && positiveRatio > threshold) {
      sentiment = 'positive';
      confidence = Math.min(0.95, 0.6 + positiveRatio);
    } else if (negativeRatio > positiveRatio && negativeRatio > threshold) {
      sentiment = 'negative';
      confidence = Math.min(0.95, 0.6 + negativeRatio);
    } else {
      sentiment = 'neutral';
      confidence = Math.min(0.95, 0.6 + neutralRatio);
    }

    return {
      sentiment,
      confidence,
      scores: {
        positive: positiveRatio,
        negative: negativeRatio,
        neutral: neutralRatio
      }
    };
  }

  validate(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    const threshold = this.node.configuration.threshold;
    if (threshold !== undefined && (threshold < 0 || threshold > 1)) {
      errors.push({
        nodeId: this.node.id,
        type: 'invalid_configuration',
        message: 'Threshold must be between 0 and 1',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  getConfigurationSchema(): any {
    return {
      type: 'object',
      properties: {
        threshold: {
          type: 'number',
          title: 'Confidence Threshold',
          minimum: 0,
          maximum: 1,
          default: 0.5,
          description: 'Minimum confidence required to classify as positive/negative'
        },
        language: {
          type: 'string',
          title: 'Language',
          enum: ['auto', 'en', 'es', 'fr', 'de', 'it', 'pt'],
          default: 'auto',
          description: 'Language of the text to analyze'
        },
        detailed_analysis: {
          type: 'boolean',
          title: 'Detailed Analysis',
          default: false,
          description: 'Include detailed emotion and aspect analysis'
        }
      }
    };
  }

  getDefaultConfiguration(): Record<string, any> {
    return {
      threshold: 0.5,
      language: 'auto',
      detailed_analysis: false
    };
  }

  getInputPorts(): NodePort[] {
    return [
      this.createPort('message', 'data', 'string', true, 'The message to analyze'),
      this.createPort('trigger', 'control', 'any', true, 'Control flow input')
    ];
  }

  getOutputPorts(): NodePort[] {
    return [
      this.createPort('sentiment', 'data', 'string', true, 'The detected sentiment (positive/negative/neutral)'),
      this.createPort('confidence', 'data', 'number', true, 'Confidence score of the analysis'),
      this.createPort('scores', 'data', 'object', false, 'Detailed sentiment scores'),
      this.createPort('positive', 'control', 'any', false, 'Control flow when sentiment is positive'),
      this.createPort('negative', 'control', 'any', false, 'Control flow when sentiment is negative'),
      this.createPort('neutral', 'control', 'any', false, 'Control flow when sentiment is neutral'),
      this.createPort('next', 'control', 'any', true, 'Control flow output (always)')
    ];
  }
}