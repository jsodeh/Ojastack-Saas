import { 
  ToolParameter, 
  ToolDefinition, 
  ToolCall, 
  ToolExecutionContext, 
  ToolExecutionResult 
} from './tool-types';

// Re-export types for backward compatibility
export type {
  ToolParameter,
  ToolDefinition,
  ToolCall,
  ToolExecutionContext,
  ToolExecutionResult
};

/**
 * Tool System
 * Manages tool definitions, execution, and integration with agents
 */
export class ToolSystem {
  private tools: Map<string, ToolDefinition> = new Map();
  private executionQueue: Map<string, ToolCall> = new Map();
  private executionHistory: ToolCall[] = [];

  private enhancedToolRegistry: any; // Will be initialized lazily

  constructor() {
    this.initializeBuiltInTools();
  }

  /**
   * Get enhanced tool registry (lazy initialization)
   */
  private async getEnhancedToolRegistry() {
    if (!this.enhancedToolRegistry) {
      const { EnhancedToolRegistry } = await import('./tools/enhanced-tool-registry');
      this.enhancedToolRegistry = new EnhancedToolRegistry();
    }
    return this.enhancedToolRegistry;
  }

  /**
   * Initialize built-in tools
   */
  private async initializeBuiltInTools() {
    const builtInTools: ToolDefinition[] = [
      {
        id: 'web_search',
        name: 'Web Search',
        description: 'Search the web for current information',
        category: 'search',
        provider: 'built-in',
        version: '1.0.0',
        parameters: [
          {
            name: 'query',
            type: 'string',
            description: 'Search query',
            required: true,
          },
          {
            name: 'num_results',
            type: 'number',
            description: 'Number of results to return',
            required: false,
            default: 5,
          },
        ],
        configuration: {
          endpoint: 'https://api.duckduckgo.com/',
          method: 'GET',
          timeout: 10000,
          retries: 2,
        },
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'weather',
        name: 'Weather Information',
        description: 'Get current weather information for a location',
        category: 'data',
        provider: 'built-in',
        version: '1.0.0',
        parameters: [
          {
            name: 'location',
            type: 'string',
            description: 'City name or coordinates',
            required: true,
          },
          {
            name: 'units',
            type: 'string',
            description: 'Temperature units',
            required: false,
            default: 'celsius',
            enum: ['celsius', 'fahrenheit', 'kelvin'],
          },
        ],
        configuration: {
          endpoint: 'https://api.openweathermap.org/data/2.5/weather',
          method: 'GET',
          timeout: 5000,
          retries: 1,
        },
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'calculator',
        name: 'Calculator',
        description: 'Perform mathematical calculations',
        category: 'utility',
        provider: 'built-in',
        version: '1.0.0',
        parameters: [
          {
            name: 'expression',
            type: 'string',
            description: 'Mathematical expression to evaluate',
            required: true,
          },
        ],
        configuration: {
          timeout: 1000,
          retries: 0,
        },
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'datetime',
        name: 'Date & Time',
        description: 'Get current date and time information',
        category: 'utility',
        provider: 'built-in',
        version: '1.0.0',
        parameters: [
          {
            name: 'timezone',
            type: 'string',
            description: 'Timezone (e.g., UTC, America/New_York)',
            required: false,
            default: 'UTC',
          },
          {
            name: 'format',
            type: 'string',
            description: 'Date format',
            required: false,
            default: 'ISO',
            enum: ['ISO', 'US', 'EU', 'timestamp'],
          },
        ],
        configuration: {
          timeout: 500,
          retries: 0,
        },
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Add additional tools from basic-tools
    try {
      const { basicTools } = await import('./basic-tools');
      const additionalTools = basicTools.getAdditionalToolDefinitions();
      builtInTools.push(...additionalTools);
    } catch (error) {
      console.warn('Could not load additional tools:', error);
    }

    builtInTools.forEach(tool => {
      this.tools.set(tool.id, tool);
    });

    // Add enhanced tools (async initialization)
    this.initializeEnhancedTools();

    console.log(`🔧 Initialized ${builtInTools.length} built-in tools`);
  }

  /**
   * Initialize enhanced tools asynchronously
   */
  private async initializeEnhancedTools() {
    try {
      const enhancedRegistry = await this.getEnhancedToolRegistry();
      const enhancedTools = enhancedRegistry.getToolDefinitions();
      enhancedTools.forEach(tool => {
        // Override basic tools with enhanced versions
        this.tools.set(tool.id, tool);
      });
      console.log(`🔧 Initialized ${enhancedTools.length} enhanced tools`);
    } catch (error) {
      console.warn('Could not load enhanced tools:', error);
    }
  }

  /**
   * Register a new tool
   */
  registerTool(tool: ToolDefinition): boolean {
    try {
      // Validate tool definition
      if (!this.validateToolDefinition(tool)) {
        console.error('Invalid tool definition:', tool);
        return false;
      }

      this.tools.set(tool.id, tool);
      console.log(`🔧 Registered tool: ${tool.name} (${tool.id})`);
      return true;
    } catch (error) {
      console.error('Error registering tool:', error);
      return false;
    }
  }

  /**
   * Get tool by ID
   */
  getTool(toolId: string): ToolDefinition | null {
    return this.tools.get(toolId) || null;
  }

  /**
   * Get all tools
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  /**
   * Get enabled tools
   */
  getEnabledTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(tool => tool.enabled);
  }

  /**
   * Execute a tool
   */
  async executeTool(
    toolId: string,
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const tool = this.getTool(toolId);
      if (!tool) {
        throw new Error(`Tool not found: ${toolId}`);
      }

      if (!tool.enabled) {
        throw new Error(`Tool is disabled: ${toolId}`);
      }

      // Validate parameters
      const validationResult = this.validateParameters(tool, parameters);
      if (!validationResult.valid) {
        throw new Error(`Invalid parameters: ${validationResult.errors.join(', ')}`);
      }

      // Create tool call record
      const toolCall: ToolCall = {
        id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        tool_id: toolId,
        conversation_id: context.conversation_id,
        parameters,
        status: 'running',
        created_at: new Date().toISOString(),
      };

      this.executionQueue.set(toolCall.id, toolCall);

      // Execute tool based on provider
      let result: any;
      switch (tool.provider) {
        case 'built-in':
          result = await this.executeBuiltInTool(tool, parameters, context);
          break;
        case 'n8n':
          result = await this.executeN8nTool(tool, parameters, context);
          break;
        case 'api':
          result = await this.executeApiTool(tool, parameters, context);
          break;
        case 'custom':
          result = await this.executeCustomTool(tool, parameters, context);
          break;
        default:
          throw new Error(`Unsupported tool provider: ${tool.provider}`);
      }

      const executionTime = Date.now() - startTime;

      // Update tool call record
      toolCall.result = result;
      toolCall.status = 'completed';
      toolCall.execution_time = executionTime;
      toolCall.completed_at = new Date().toISOString();

      this.executionQueue.delete(toolCall.id);
      this.executionHistory.push(toolCall);

      // Store in database
      await this.storeToolCall(toolCall);

      return {
        success: true,
        result,
        execution_time: executionTime,
        metadata: {
          tool_call_id: toolCall.id,
          tool_name: tool.name,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Tool execution failed for ${toolId}:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time: executionTime,
      };
    }
  }

  /**
   * Execute built-in tool
   */
  private async executeBuiltInTool(
    tool: ToolDefinition,
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<any> {
    // Try enhanced tools first
    try {
      const enhancedRegistry = await this.getEnhancedToolRegistry();
      const enhancedContext = enhancedRegistry.createExecutionContext(
        context.user_id,
        context.conversation_id,
        {
          agent_id: context.agent_id,
          customer_id: context.customer_id,
          message_context: context.message_context,
          variables: context.variables,
        }
      );

      const enhancedResult = await enhancedRegistry.executeTool(
        tool.id,
        parameters,
        enhancedContext
      );

      if (enhancedResult.success) {
        return enhancedResult.result || enhancedResult.data;
      }
    } catch (error) {
      console.warn('Enhanced tool execution failed, falling back to basic tools:', error);
    }

    // Fallback to basic tools
    const { basicTools } = await import('./basic-tools');

    switch (tool.id) {
      case 'web_search':
        return await basicTools.executeWebSearch(parameters);
      case 'weather':
        return await basicTools.executeWeatherTool(parameters);
      case 'calculator':
        return await basicTools.executeCalculator(parameters);
      case 'datetime':
        return await basicTools.executeDateTimeTool(parameters);
      case 'unit_converter':
        return await basicTools.executeUnitConverter(parameters);
      case 'text_analyzer':
        return await basicTools.executeTextAnalyzer(parameters);
      default:
        throw new Error(`Unknown built-in tool: ${tool.id}`);
    }
  }



  /**
   * Execute N8n tool
   */
  private async executeN8nTool(
    tool: ToolDefinition,
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<any> {
    // Import n8n integration dynamically
    const { n8nService } = await import('./n8n-integration');
    
    return await n8nService.executeWorkflow(tool.configuration.endpoint!, {
      ...parameters,
      context,
    });
  }

  /**
   * Execute API tool
   */
  private async executeApiTool(
    tool: ToolDefinition,
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<any> {
    const { endpoint, method = 'POST', headers = {}, authentication, timeout = 10000 } = tool.configuration;

    if (!endpoint) {
      throw new Error('API endpoint not configured');
    }

    const requestHeaders: Record<string, string> = { ...headers };

    // Add authentication
    if (authentication) {
      switch (authentication.type) {
        case 'api_key':
          requestHeaders[authentication.key || 'X-API-Key'] = authentication.value || '';
          break;
        case 'bearer':
          requestHeaders['Authorization'] = `Bearer ${authentication.value || ''}`;
          break;
        case 'basic':
          requestHeaders['Authorization'] = `Basic ${btoa(authentication.value || '')}`;
          break;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...requestHeaders,
        },
        body: method !== 'GET' ? JSON.stringify({ ...parameters, context }) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Execute custom tool
   */
  private async executeCustomTool(
    tool: ToolDefinition,
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<any> {
    // Custom tools would be implemented based on specific requirements
    throw new Error('Custom tool execution not implemented');
  }

  /**
   * Validate tool definition
   */
  private validateToolDefinition(tool: ToolDefinition): boolean {
    if (!tool.id || !tool.name || !tool.description) {
      return false;
    }

    if (!['search', 'data', 'communication', 'automation', 'utility'].includes(tool.category)) {
      return false;
    }

    if (!['built-in', 'n8n', 'custom', 'api'].includes(tool.provider)) {
      return false;
    }

    return true;
  }

  /**
   * Validate parameters
   */
  private validateParameters(tool: ToolDefinition, parameters: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const param of tool.parameters) {
      if (param.required && !(param.name in parameters)) {
        errors.push(`Missing required parameter: ${param.name}`);
        continue;
      }

      if (param.name in parameters) {
        const value = parameters[param.name];
        
        // Type validation
        if (param.type === 'string' && typeof value !== 'string') {
          errors.push(`Parameter ${param.name} must be a string`);
        } else if (param.type === 'number' && typeof value !== 'number') {
          errors.push(`Parameter ${param.name} must be a number`);
        } else if (param.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Parameter ${param.name} must be a boolean`);
        }

        // Enum validation
        if (param.enum && !param.enum.includes(value)) {
          errors.push(`Parameter ${param.name} must be one of: ${param.enum.join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Store tool call in database
   */
  private async storeToolCall(toolCall: ToolCall): Promise<void> {
    try {
      const { supabase } = await import('./agent-runtime');
      
      await supabase
        .from('tool_calls')
        .insert({
          id: toolCall.id,
          conversation_id: toolCall.conversation_id,
          message_id: toolCall.message_id,
          tool_name: toolCall.tool_id,
          parameters: toolCall.parameters,
          result: toolCall.result,
          status: toolCall.status,
          execution_time: toolCall.execution_time,
          created_at: toolCall.created_at,
          completed_at: toolCall.completed_at,
        });
    } catch (error) {
      console.error('Error storing tool call:', error);
    }
  }

  /**
   * Get tool execution history
   */
  getExecutionHistory(limit: number = 50): ToolCall[] {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Get tool statistics
   */
  async getToolStatistics() {
    const totalTools = this.tools.size;
    const enabledTools = this.getEnabledTools().length;
    const totalExecutions = this.executionHistory.length;
    const successfulExecutions = this.executionHistory.filter(call => call.status === 'completed').length;
    const averageExecutionTime = this.executionHistory.length > 0
      ? this.executionHistory.reduce((sum, call) => sum + (call.execution_time || 0), 0) / this.executionHistory.length
      : 0;

    // Get enhanced tool stats
    let enhancedStats = {};
    try {
      const enhancedRegistry = await this.getEnhancedToolRegistry();
      enhancedStats = enhancedRegistry.getToolStats();
    } catch (error) {
      console.warn('Could not get enhanced tool stats:', error);
    }

    return {
      total_tools: totalTools,
      enabled_tools: enabledTools,
      total_executions: totalExecutions,
      successful_executions: successfulExecutions,
      success_rate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      average_execution_time: averageExecutionTime,
      active_executions: this.executionQueue.size,
      enhanced_tools: enhancedStats,
    };
  }

  /**
   * Search tools using enhanced search capabilities
   */
  async searchTools(query: string): Promise<ToolDefinition[]> {
    try {
      const enhancedRegistry = await this.getEnhancedToolRegistry();
      return enhancedRegistry.searchTools(query);
    } catch (error) {
      // Fallback to basic search
      const lowerQuery = query.toLowerCase();
      return Array.from(this.tools.values()).filter(
        tool =>
          tool.name.toLowerCase().includes(lowerQuery) ||
          tool.description.toLowerCase().includes(lowerQuery) ||
          tool.id.toLowerCase().includes(lowerQuery)
      );
    }
  }

  /**
   * Batch execute multiple tools
   */
  async batchExecuteTools(
    requests: Array<{
      toolId: string;
      parameters: Record<string, any>;
      context: ToolExecutionContext;
    }>
  ): Promise<ToolExecutionResult[]> {
    try {
      const enhancedRegistry = await this.getEnhancedToolRegistry();
      const enhancedRequests = requests.map(request => ({
        toolId: request.toolId,
        parameters: request.parameters,
        context: enhancedRegistry.createExecutionContext(
          request.context.user_id,
          request.context.conversation_id,
          {
            agent_id: request.context.agent_id,
            customer_id: request.context.customer_id,
            message_context: request.context.message_context,
            variables: request.context.variables,
          }
        ),
      }));

      return await enhancedRegistry.batchExecuteTools(enhancedRequests);
    } catch (error) {
      // Fallback to sequential execution
      const results: ToolExecutionResult[] = [];
      for (const request of requests) {
        const result = await this.executeTool(request.toolId, request.parameters, request.context);
        results.push(result);
      }
      return results;
    }
  }

  /**
   * Export enhanced tool configuration
   */
  async exportEnhancedConfiguration(): Promise<Record<string, any>> {
    try {
      const enhancedRegistry = await this.getEnhancedToolRegistry();
      return enhancedRegistry.exportConfiguration();
    } catch (error) {
      return { error: 'Enhanced tools not available' };
    }
  }

  /**
   * Import enhanced tool configuration
   */
  async importEnhancedConfiguration(config: Record<string, any>): Promise<boolean> {
    try {
      const enhancedRegistry = await this.getEnhancedToolRegistry();
      return enhancedRegistry.importConfiguration(config);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get enhanced tool registry
   */
  async getEnhancedToolRegistryInstance(): Promise<any> {
    return await this.getEnhancedToolRegistry();
  }
}

// Create singleton instance
export const toolSystem = new ToolSystem();