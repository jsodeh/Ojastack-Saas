/**
 * JavaScript Node
 * Node for executing custom JavaScript code in workflows
 */

import { BaseNode, NodeExecutionContext, NodeExecutionResult } from './base-node';

export interface JSNodeConfig {
  code: string;
  timeout: number;
  allowedModules: string[];
  sandboxed: boolean;
  returnVariable: string;
}

export class JSNode extends BaseNode {
  type = 'javascript';
  name = 'JavaScript';
  description = 'Execute custom JavaScript code';
  category = 'custom';
  
  config: JSNodeConfig = {
    code: '// Your JavaScript code here\nreturn data;',
    timeout: 5000,
    allowedModules: [],
    sandboxed: true,
    returnVariable: 'result'
  };

  constructor(id: string, position: { x: number; y: number }) {
    super(id, position);
    
    this.inputs = [
      {
        id: 'input',
        name: 'Input',
        type: 'data',
        required: true
      }
    ];

    this.outputs = [
      {
        id: 'output',
        name: 'Output',
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
      
      // Create execution context
      const executionContext = {
        data,
        variables,
        console: {
          log: (...args: any[]) => console.log('[JS Node]', ...args),
          error: (...args: any[]) => console.error('[JS Node]', ...args),
          warn: (...args: any[]) => console.warn('[JS Node]', ...args)
        },
        Math,
        Date,
        JSON,
        String,
        Number,
        Boolean,
        Array,
        Object
      };

      // Execute code with timeout
      const result = await this.executeWithTimeout(
        this.config.code,
        executionContext,
        this.config.timeout
      );

      return {
        success: true,
        data: result,
        nextNodes: ['output'],
        logs: [{
          level: 'info',
          message: 'JavaScript code executed successfully',
          timestamp: new Date().toISOString()
        }]
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: context.data,
        nextNodes: ['error'],
        logs: [{
          level: 'error',
          message: `JavaScript execution failed: ${error.message}`,
          timestamp: new Date().toISOString()
        }]
      };
    }
  }

  private async executeWithTimeout(
    code: string,
    context: any,
    timeout: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Code execution timed out after ${timeout}ms`));
      }, timeout);

      try {
        // Create function with context
        const func = new Function(
          ...Object.keys(context),
          code
        );

        // Execute function
        const result = func(...Object.values(context));
        
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.code.trim()) {
      errors.push('JavaScript code is required');
    }

    if (this.config.timeout <= 0) {
      errors.push('Timeout must be positive');
    }

    // Basic syntax check
    try {
      new Function(this.config.code);
    } catch (error) {
      errors.push(`Syntax error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  clone(): JSNode {
    const cloned = new JSNode(
      `${this.id}_copy`,
      { x: this.position.x + 50, y: this.position.y + 50 }
    );
    
    cloned.config = JSON.parse(JSON.stringify(this.config));
    
    return cloned;
  }
}

export default JSNode;