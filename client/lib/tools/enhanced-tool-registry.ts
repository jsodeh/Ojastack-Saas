import { ToolDefinition, ToolExecutionResult, ToolExecutionContext } from '../tool-system';
import { WebSearchTool } from './web-search-tool';
import { WeatherTool } from './weather-tool';
import { CalculatorTool } from './calculator-tool';
import { DateTimeTool } from './datetime-tool';
import { FileSystemTool } from './file-system-tool';

/**
 * Enhanced Tool Registry
 * Manages all enhanced tools with improved implementations
 */
export class EnhancedToolRegistry {
  private tools: Map<string, any> = new Map();
  private toolDefinitions: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.initializeTools();
  }

  /**
   * Initialize all enhanced tools
   */
  private initializeTools(): void {
    // Web Search Tool
    const webSearchTool = new WebSearchTool();
    this.tools.set('web_search', webSearchTool);
    this.toolDefinitions.set('web_search', WebSearchTool.getDefinition());

    // Weather Tool
    const weatherTool = new WeatherTool();
    this.tools.set('weather', weatherTool);
    this.toolDefinitions.set('weather', WeatherTool.getDefinition());

    // Calculator Tool
    const calculatorTool = new CalculatorTool();
    this.tools.set('calculator', calculatorTool);
    this.toolDefinitions.set('calculator', CalculatorTool.getDefinition());

    // DateTime Tool
    const dateTimeTool = new DateTimeTool();
    this.tools.set('datetime', dateTimeTool);
    this.toolDefinitions.set('datetime', DateTimeTool.getDefinition());

    // File System Tool
    const fileSystemTool = new FileSystemTool();
    this.tools.set('file_system', fileSystemTool);
    this.toolDefinitions.set('file_system', FileSystemTool.getDefinition());
  }

  /**
   * Get all available tool definitions
   */
  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.toolDefinitions.values());
  }

  /**
   * Get specific tool definition
   */
  getToolDefinition(toolId: string): ToolDefinition | undefined {
    return this.toolDefinitions.get(toolId);
  }

  /**
   * Execute a tool
   */
  async executeTool(
    toolId: string,
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(toolId);
    
    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolId}' not found`,
        execution_time: 0,
      };
    }

    const definition = this.toolDefinitions.get(toolId);
    if (!definition) {
      return {
        success: false,
        error: `Tool definition for '${toolId}' not found`,
        execution_time: 0,
      };
    }

    // Validate parameters
    const validationResult = this.validateParameters(parameters, definition);
    if (!validationResult.valid) {
      return {
        success: false,
        error: `Parameter validation failed: ${validationResult.errors.join(', ')}`,
        execution_time: 0,
      };
    }

    try {
      // Execute the tool
      const result = await tool.execute(parameters, context);
      
      // Add tool metadata to result
      if (result.success && result.metadata) {
        result.metadata.tool_id = toolId;
        result.metadata.tool_version = definition.version;
        result.metadata.tool_provider = definition.provider;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        execution_time: 0,
      };
    }
  }

  /**
   * Validate tool parameters
   */
  private validateParameters(
    parameters: Record<string, any>,
    definition: ToolDefinition
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required parameters
    const requiredParams = definition.parameters.filter(p => p.required);
    for (const param of requiredParams) {
      if (!(param.name in parameters) || parameters[param.name] === undefined || parameters[param.name] === null) {
        errors.push(`Required parameter '${param.name}' is missing`);
      }
    }

    // Check parameter types and constraints
    for (const param of definition.parameters) {
      const value = parameters[param.name];
      
      if (value !== undefined && value !== null) {
        // Type validation
        if (!this.validateParameterType(value, param.type)) {
          errors.push(`Parameter '${param.name}' must be of type ${param.type}`);
        }

        // Enum validation
        if (param.enum && !param.enum.includes(value)) {
          errors.push(`Parameter '${param.name}' must be one of: ${param.enum.join(', ')}`);
        }

        // String length validation
        if (param.type === 'string' && typeof value === 'string') {
          if (param.min_length && value.length < param.min_length) {
            errors.push(`Parameter '${param.name}' must be at least ${param.min_length} characters long`);
          }
          if (param.max_length && value.length > param.max_length) {
            errors.push(`Parameter '${param.name}' must be at most ${param.max_length} characters long`);
          }
        }

        // Number range validation
        if (param.type === 'number' && typeof value === 'number') {
          if (param.minimum !== undefined && value < param.minimum) {
            errors.push(`Parameter '${param.name}' must be at least ${param.minimum}`);
          }
          if (param.maximum !== undefined && value > param.maximum) {
            errors.push(`Parameter '${param.name}' must be at most ${param.maximum}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate parameter type
   */
  private validateParameterType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true; // Unknown type, assume valid
    }
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): ToolDefinition[] {
    return Array.from(this.toolDefinitions.values()).filter(
      tool => tool.category === category
    );
  }

  /**
   * Search tools by name or description
   */
  searchTools(query: string): ToolDefinition[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.toolDefinitions.values()).filter(
      tool => 
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery) ||
        tool.id.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get tool usage statistics
   */
  getToolStats(): Record<string, any> {
    const stats = {
      total_tools: this.toolDefinitions.size,
      categories: {} as Record<string, number>,
      providers: {} as Record<string, number>,
      enabled_tools: 0,
      disabled_tools: 0,
    };

    for (const tool of this.toolDefinitions.values()) {
      // Count by category
      stats.categories[tool.category] = (stats.categories[tool.category] || 0) + 1;
      
      // Count by provider
      stats.providers[tool.provider] = (stats.providers[tool.provider] || 0) + 1;
      
      // Count enabled/disabled
      if (tool.enabled) {
        stats.enabled_tools++;
      } else {
        stats.disabled_tools++;
      }
    }

    return stats;
  }

  /**
   * Enable or disable a tool
   */
  setToolEnabled(toolId: string, enabled: boolean): boolean {
    const definition = this.toolDefinitions.get(toolId);
    if (definition) {
      definition.enabled = enabled;
      definition.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Update tool configuration
   */
  updateToolConfiguration(toolId: string, configuration: Record<string, any>): boolean {
    const definition = this.toolDefinitions.get(toolId);
    if (definition) {
      definition.configuration = { ...definition.configuration, ...configuration };
      definition.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Get tool execution context with enhanced features
   */
  createExecutionContext(
    userId: string,
    conversationId: string,
    additionalContext?: Record<string, any>
  ): ToolExecutionContext {
    return {
      conversation_id: conversationId,
      agent_id: additionalContext?.agent_id || 'default',
      user_id: userId,
      customer_id: additionalContext?.customer_id || userId,
      message_context: additionalContext?.message_context || '',
      variables: additionalContext?.variables || {},
    };
  }

  /**
   * Batch execute multiple tools
   */
  async batchExecuteTools(
    requests: Array<{
      toolId: string;
      parameters: Record<string, any>;
      context?: ToolExecutionContext;
    }>
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];
    
    // Execute tools in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks = this.chunkArray(requests, concurrencyLimit);
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(request => 
          this.executeTool(
            request.toolId,
            request.parameters,
            request.context || this.createExecutionContext()
          )
        )
      );
      results.push(...chunkResults);
    }
    
    return results;
  }

  /**
   * Helper method to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Export tool registry configuration
   */
  exportConfiguration(): Record<string, any> {
    const config = {
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      tools: {} as Record<string, any>,
    };

    for (const [toolId, definition] of this.toolDefinitions.entries()) {
      config.tools[toolId] = {
        ...definition,
        // Remove sensitive information
        configuration: {
          timeout: definition.configuration?.timeout,
          retries: definition.configuration?.retries,
          enabled: definition.enabled,
        },
      };
    }

    return config;
  }

  /**
   * Import tool registry configuration
   */
  importConfiguration(config: Record<string, any>): boolean {
    try {
      if (!config.tools || typeof config.tools !== 'object') {
        throw new Error('Invalid configuration format');
      }

      for (const [toolId, toolConfig] of Object.entries(config.tools)) {
        if (this.toolDefinitions.has(toolId)) {
          const definition = this.toolDefinitions.get(toolId)!;
          
          // Update configuration
          if (toolConfig.configuration) {
            definition.configuration = {
              ...definition.configuration,
              ...toolConfig.configuration,
            };
          }
          
          // Update enabled status
          if (typeof toolConfig.enabled === 'boolean') {
            definition.enabled = toolConfig.enabled;
          }
          
          definition.updated_at = new Date().toISOString();
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }
}