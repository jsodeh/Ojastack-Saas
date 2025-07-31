import { ToolDefinition, ToolExecutionResult, ToolExecutionContext } from '../tool-types';

export class WeatherTool {
  static getDefinition(): ToolDefinition {
    return {
      id: 'weather',
      name: 'weather',
      description: 'Get current weather information for a location',
      category: 'data',
      provider: 'built-in',
      version: '1.0.0',
      parameters: [
        {
          name: 'location',
          type: 'string',
          description: 'The location to get weather for (city, country)',
          required: true
        },
        {
          name: 'units',
          type: 'string',
          description: 'Temperature units (celsius, fahrenheit)',
          required: false,
          default: 'celsius',
          enum: ['celsius', 'fahrenheit']
        }
      ],
      configuration: {
        timeout: 10000,
        retries: 2
      },
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    try {
      const { location, units = 'celsius' } = params;
      
      // Mock implementation - in production, integrate with weather API
      const weatherData = {
        location,
        temperature: units === 'celsius' ? 22 : 72,
        units,
        condition: 'Partly cloudy',
        humidity: 65,
        wind_speed: 10,
        description: `Current weather in ${location}: Partly cloudy with a temperature of ${units === 'celsius' ? '22°C' : '72°F'}`
      };

      return {
        success: true,
        data: weatherData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Weather lookup failed'
      };
    }
  }
}