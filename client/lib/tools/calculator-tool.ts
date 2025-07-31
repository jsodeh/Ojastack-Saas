import { ToolDefinition, ToolExecutionResult, ToolExecutionContext } from '../tool-types';

export class CalculatorTool {
  static getDefinition(): ToolDefinition {
    return {
      id: 'calculator',
      name: 'calculator',
      description: 'Perform mathematical calculations',
      category: 'utility',
      provider: 'built-in',
      version: '1.0.0',
      parameters: [
        {
          name: 'expression',
          type: 'string',
          description: 'Mathematical expression to evaluate (e.g., "2 + 3 * 4")',
          required: true
        }
      ],
      configuration: {
        timeout: 5000,
        retries: 1
      },
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    try {
      const { expression } = params;
      
      // Basic calculator implementation
      // In production, use a proper math expression parser
      const result = this.evaluateExpression(expression);

      return {
        success: true,
        data: {
          expression,
          result,
          formatted: `${expression} = ${result}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calculation failed'
      };
    }
  }

  private evaluateExpression(expression: string): number {
    // Simple and safe expression evaluation
    // Remove any non-mathematical characters for security
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    
    try {
      // Use Function constructor for safe evaluation
      return Function(`"use strict"; return (${sanitized})`)();
    } catch (error) {
      throw new Error('Invalid mathematical expression');
    }
  }
}