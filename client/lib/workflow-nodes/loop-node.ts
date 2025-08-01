/**
 * Loop Node
 * Node for iterative workflow processing with various loop types
 */

import { BaseNode, NodeExecutionContext, NodeExecutionResult } from './base-node';

export type LoopType = 'for' | 'while' | 'for_each' | 'until';

export interface LoopCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal';
  value: any;
}

export interface LoopNodeConfig {
  loopType: LoopType;
  
  // For 'for' loops
  startValue?: number;
  endValue?: number;
  stepValue?: number;
  
  // For 'while' and 'until' loops
  condition?: LoopCondition;
  
  // For 'for_each' loops
  arrayField?: string;
  itemVariable?: string;
  indexVariable?: string;
  
  // General settings
  maxIterations: number;
  breakOnError: boolean;
  collectResults: boolean;
  parallelExecution: boolean;
  batchSize?: number;
  
  // Loop body configuration
  loopBodyNodes: string[];
}

export interface LoopExecutionState {
  currentIteration: number;
  totalIterations: number;
  loopVariable: any;
  results: any[];
  errors: any[];
  startTime: string;
  isComplete: boolean;
}

export class LoopNode extends BaseNode {
  type = 'loop';
  name = 'Loop';
  description = 'Iterative processing with various loop types';
  category = 'control';
  
  config: LoopNodeConfig = {
    loopType: 'for',
    startValue: 0,
    endValue: 10,
    stepValue: 1,
    maxIterations: 1000,
    breakOnError: false,
    collectResults: true,
    parallelExecution: false,
    loopBodyNodes: []
  };

  private executionState: LoopExecutionState | null = null;

  constructor(id: string, position: { x: number; y: number }) {
    super(id, position);
    
    this.inputs = [
      {
        id: 'input',
        name: 'Input',
        type: 'flow',
        required: true
      }
    ];

    this.outputs = [
      {
        id: 'loop_body',
        name: 'Loop Body',
        type: 'flow'
      },
      {
        id: 'completed',
        name: 'Completed',
        type: 'flow'
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
      
      // Initialize execution state
      this.executionState = {
        currentIteration: 0,
        totalIterations: 0,
        loopVariable: null,
        results: [],
        errors: [],
        startTime: new Date().toISOString(),
        isComplete: false
      };

      // Determine loop parameters based on type
      const loopParams = this.getLoopParameters(data, variables);
      if (!loopParams.isValid) {
        throw new Error(loopParams.error);
      }

      this.executionState.totalIterations = loopParams.totalIterations;

      // Execute loop based on type
      let loopResult: any;
      
      if (this.config.parallelExecution && this.config.loopType === 'for_each') {
        loopResult = await this.executeParallelLoop(loopParams, context);
      } else {
        loopResult = await this.executeSequentialLoop(loopParams, context);
      }

      this.executionState.isComplete = true;

      return {
        success: true,
        data: {
          ...data,
          loopResult: {
            iterations: this.executionState.currentIteration,
            results: this.config.collectResults ? this.executionState.results : [],
            errors: this.executionState.errors,
            executionTime: Date.now() - new Date(this.executionState.startTime).getTime(),
            completed: true
          }
        },
        nextNodes: ['completed'],
        logs: [{
          level: 'info',
          message: `Loop completed: ${this.executionState.currentIteration} iterations`,
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
          message: `Loop execution failed: ${error.message}`,
          timestamp: new Date().toISOString()
        }]
      };
    }
  }

  private getLoopParameters(data: any, variables: Record<string, any>) {
    switch (this.config.loopType) {
      case 'for':
        return {
          isValid: true,
          totalIterations: Math.ceil((this.config.endValue! - this.config.startValue!) / this.config.stepValue!),
          iterationData: this.generateForLoopData()
        };

      case 'for_each':
        const arrayData = this.getFieldValue(this.config.arrayField!, data, variables);
        if (!Array.isArray(arrayData)) {
          return {
            isValid: false,
            error: `Field ${this.config.arrayField} is not an array`
          };
        }
        return {
          isValid: true,
          totalIterations: arrayData.length,
          iterationData: arrayData
        };

      case 'while':
      case 'until':
        return {
          isValid: true,
          totalIterations: this.config.maxIterations, // Maximum possible
          iterationData: null
        };

      default:
        return {
          isValid: false,
          error: `Unsupported loop type: ${this.config.loopType}`
        };
    }
  }

  private generateForLoopData(): number[] {
    const data: number[] = [];
    const start = this.config.startValue!;
    const end = this.config.endValue!;
    const step = this.config.stepValue!;

    for (let i = start; i < end; i += step) {
      data.push(i);
    }

    return data;
  }

  private async executeSequentialLoop(loopParams: any, context: NodeExecutionContext): Promise<any> {
    const { data, variables } = context;
    
    while (this.shouldContinueLoop(data, variables) && 
           this.executionState!.currentIteration < this.config.maxIterations) {
      
      try {
        // Prepare iteration context
        const iterationContext = this.prepareIterationContext(
          loopParams, 
          this.executionState!.currentIteration, 
          context
        );

        // Execute loop body (simulated)
        const iterationResult = await this.executeLoopBody(iterationContext);

        if (this.config.collectResults) {
          this.executionState!.results.push(iterationResult);
        }

        this.executionState!.currentIteration++;

        // Break on error if configured
        if (!iterationResult.success && this.config.breakOnError) {
          this.executionState!.errors.push(iterationResult.error);
          break;
        }

      } catch (error) {
        this.executionState!.errors.push(error.message);
        
        if (this.config.breakOnError) {
          break;
        }
        
        this.executionState!.currentIteration++;
      }
    }

    return {
      completed: true,
      iterations: this.executionState!.currentIteration
    };
  }

  private async executeParallelLoop(loopParams: any, context: NodeExecutionContext): Promise<any> {
    const batchSize = this.config.batchSize || 10;
    const totalItems = loopParams.iterationData.length;
    const batches: any[][] = [];

    // Create batches
    for (let i = 0; i < totalItems; i += batchSize) {
      batches.push(loopParams.iterationData.slice(i, i + batchSize));
    }

    // Execute batches in parallel
    for (const batch of batches) {
      const batchPromises = batch.map(async (item, index) => {
        const iterationIndex = this.executionState!.currentIteration + index;
        const iterationContext = this.prepareIterationContext(
          { iterationData: [item] }, 
          iterationIndex, 
          context
        );

        try {
          const result = await this.executeLoopBody(iterationContext);
          return { success: true, result, index: iterationIndex };
        } catch (error) {
          return { success: false, error: error.message, index: iterationIndex };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Process batch results
      for (const batchResult of batchResults) {
        if (batchResult.success) {
          if (this.config.collectResults) {
            this.executionState!.results.push(batchResult.result);
          }
        } else {
          this.executionState!.errors.push(batchResult.error);
        }
      }

      this.executionState!.currentIteration += batch.length;
    }

    return {
      completed: true,
      iterations: this.executionState!.currentIteration
    };
  }

  private shouldContinueLoop(data: any, variables: Record<string, any>): boolean {
    switch (this.config.loopType) {
      case 'for':
        const currentValue = this.config.startValue! + 
          (this.executionState!.currentIteration * this.config.stepValue!);
        return currentValue < this.config.endValue!;

      case 'for_each':
        return this.executionState!.currentIteration < this.executionState!.totalIterations;

      case 'while':
        return this.config.condition ? 
          this.evaluateCondition(this.config.condition, data, variables) : false;

      case 'until':
        return this.config.condition ? 
          !this.evaluateCondition(this.config.condition, data, variables) : false;

      default:
        return false;
    }
  }

  private prepareIterationContext(
    loopParams: any, 
    iterationIndex: number, 
    baseContext: NodeExecutionContext
  ): NodeExecutionContext {
    const iterationVariables = { ...baseContext.variables };

    switch (this.config.loopType) {
      case 'for':
        iterationVariables['i'] = this.config.startValue! + (iterationIndex * this.config.stepValue!);
        iterationVariables['iteration'] = iterationIndex;
        break;

      case 'for_each':
        if (loopParams.iterationData && loopParams.iterationData[iterationIndex]) {
          iterationVariables[this.config.itemVariable || 'item'] = loopParams.iterationData[iterationIndex];
          iterationVariables[this.config.indexVariable || 'index'] = iterationIndex;
        }
        break;

      case 'while':
      case 'until':
        iterationVariables['iteration'] = iterationIndex;
        break;
    }

    return {
      ...baseContext,
      variables: iterationVariables
    };
  }

  private async executeLoopBody(context: NodeExecutionContext): Promise<any> {
    // In a real implementation, this would execute the connected loop body nodes
    // For now, we'll simulate the execution
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate processing time

    return {
      success: true,
      data: {
        processed: true,
        iteration: context.variables.iteration || 0,
        timestamp: new Date().toISOString()
      }
    };
  }

  private evaluateCondition(condition: LoopCondition, data: any, variables: Record<string, any>): boolean {
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

  getExecutionState(): LoopExecutionState | null {
    return this.executionState;
  }

  stopExecution(): void {
    if (this.executionState) {
      this.executionState.isComplete = true;
    }
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate based on loop type
    switch (this.config.loopType) {
      case 'for':
        if (this.config.startValue === undefined) {
          errors.push('Start value is required for for loops');
        }
        if (this.config.endValue === undefined) {
          errors.push('End value is required for for loops');
        }
        if (this.config.stepValue === undefined || this.config.stepValue <= 0) {
          errors.push('Step value must be positive for for loops');
        }
        if (this.config.startValue !== undefined && this.config.endValue !== undefined && 
            this.config.startValue >= this.config.endValue) {
          errors.push('Start value must be less than end value');
        }
        break;

      case 'for_each':
        if (!this.config.arrayField) {
          errors.push('Array field is required for for_each loops');
        }
        if (!this.config.itemVariable) {
          errors.push('Item variable name is required for for_each loops');
        }
        break;

      case 'while':
      case 'until':
        if (!this.config.condition) {
          errors.push(`Condition is required for ${this.config.loopType} loops`);
        } else {
          if (!this.config.condition.field) {
            errors.push('Condition field is required');
          }
          if (this.config.condition.value === undefined) {
            errors.push('Condition value is required');
          }
        }
        break;
    }

    // General validations
    if (this.config.maxIterations <= 0) {
      errors.push('Max iterations must be positive');
    }

    if (this.config.parallelExecution && this.config.loopType !== 'for_each') {
      errors.push('Parallel execution is only supported for for_each loops');
    }

    if (this.config.batchSize !== undefined && this.config.batchSize <= 0) {
      errors.push('Batch size must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  clone(): LoopNode {
    const cloned = new LoopNode(
      `${this.id}_copy`,
      { x: this.position.x + 50, y: this.position.y + 50 }
    );
    
    cloned.config = JSON.parse(JSON.stringify(this.config));
    
    return cloned;
  }
}

export default LoopNode;