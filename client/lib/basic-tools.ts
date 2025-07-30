import type { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from './tool-system';

/**
 * Basic Tools Implementation
 * Enhanced implementations of core tools for the agent platform
 */
export class BasicTools {
  private googleApiKey: string;
  private weatherApiKey: string;

  constructor() {
    this.googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY || '';
    this.weatherApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY || '';
  }

  /**
   * Enhanced Web Search Tool using Google Custom Search API
   */
  async executeWebSearch(parameters: Record<string, any>): Promise<any> {
    const { query, num_results = 5, safe_search = 'moderate', language = 'en' } = parameters;

    try {
      // Try Google Custom Search API first (if API key available)
      if (this.googleApiKey) {
        return await this.googleCustomSearch(query, num_results, safe_search, language);
      }

      // Fallback to DuckDuckGo
      return await this.duckDuckGoSearch(query, num_results);
    } catch (error) {
      console.error('Web search failed:', error);
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Google Custom Search implementation
   */
  private async googleCustomSearch(query: string, numResults: number, safeSearch: string, language: string): Promise<any> {
    const searchEngineId = import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID || '';
    
    if (!searchEngineId) {
      throw new Error('Google Search Engine ID not configured');
    }

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', this.googleApiKey);
    url.searchParams.set('cx', searchEngineId);
    url.searchParams.set('q', query);
    url.searchParams.set('num', Math.min(numResults, 10).toString());
    url.searchParams.set('safe', safeSearch);
    url.searchParams.set('lr', `lang_${language}`);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Google Search API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    const results = (data.items || []).map((item: any) => ({
      title: item.title,
      snippet: item.snippet,
      url: item.link,
      source: item.displayLink,
      image: item.pagemap?.cse_image?.[0]?.src,
    }));

    return {
      query,
      results,
      total_results: data.searchInformation?.totalResults || 0,
      search_time: data.searchInformation?.searchTime || 0,
      provider: 'Google Custom Search',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * DuckDuckGo search fallback
   */
  private async duckDuckGoSearch(query: string, numResults: number): Promise<any> {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );

    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status}`);
    }

    const data = await response.json();
    const results = [];

    // Add abstract if available
    if (data.AbstractText) {
      results.push({
        title: data.Heading || 'Summary',
        snippet: data.AbstractText,
        url: data.AbstractURL,
        source: data.AbstractSource,
      });
    }

    // Add related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, numResults - 1).forEach((topic: any) => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0],
            snippet: topic.Text,
            url: topic.FirstURL,
            source: 'DuckDuckGo',
          });
        }
      });
    }

    return {
      query,
      results: results.slice(0, numResults),
      total_results: results.length,
      provider: 'DuckDuckGo',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Enhanced Weather Tool using OpenWeatherMap API
   */
  async executeWeatherTool(parameters: Record<string, any>): Promise<any> {
    const { location, units = 'metric', include_forecast = false } = parameters;

    try {
      if (this.weatherApiKey) {
        return await this.openWeatherMapSearch(location, units, include_forecast);
      }

      // Return mock data if no API key
      return this.getMockWeatherData(location, units);
    } catch (error) {
      console.error('Weather search failed:', error);
      throw new Error(`Weather search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * OpenWeatherMap API implementation
   */
  private async openWeatherMapSearch(location: string, units: string, includeForecast: boolean): Promise<any> {
    const baseUrl = 'https://api.openweathermap.org/data/2.5';
    
    // Get current weather
    const currentUrl = `${baseUrl}/weather?q=${encodeURIComponent(location)}&appid=${this.weatherApiKey}&units=${units}`;
    const currentResponse = await fetch(currentUrl);

    if (!currentResponse.ok) {
      const errorData = await currentResponse.json().catch(() => ({}));
      throw new Error(`Weather API error: ${currentResponse.status} - ${errorData.message || 'Unknown error'}`);
    }

    const currentData = await currentResponse.json();

    const result: any = {
      location: {
        name: currentData.name,
        country: currentData.sys.country,
        coordinates: {
          lat: currentData.coord.lat,
          lon: currentData.coord.lon,
        },
      },
      current: {
        temperature: Math.round(currentData.main.temp),
        feels_like: Math.round(currentData.main.feels_like),
        condition: currentData.weather[0].main,
        description: currentData.weather[0].description,
        humidity: currentData.main.humidity,
        pressure: currentData.main.pressure,
        wind_speed: currentData.wind.speed,
        wind_direction: currentData.wind.deg,
        visibility: currentData.visibility / 1000, // Convert to km
        uv_index: null, // Not available in current weather endpoint
      },
      units: {
        temperature: units === 'metric' ? '°C' : units === 'imperial' ? '°F' : 'K',
        wind_speed: units === 'metric' ? 'm/s' : 'mph',
        visibility: 'km',
      },
      timestamp: new Date().toISOString(),
      provider: 'OpenWeatherMap',
    };

    // Add forecast if requested
    if (includeForecast) {
      const forecastUrl = `${baseUrl}/forecast?q=${encodeURIComponent(location)}&appid=${this.weatherApiKey}&units=${units}`;
      const forecastResponse = await fetch(forecastUrl);

      if (forecastResponse.ok) {
        const forecastData = await forecastResponse.json();
        result.forecast = forecastData.list.slice(0, 8).map((item: any) => ({
          datetime: item.dt_txt,
          temperature: Math.round(item.main.temp),
          condition: item.weather[0].main,
          description: item.weather[0].description,
          humidity: item.main.humidity,
          wind_speed: item.wind.speed,
        }));
      }
    }

    return result;
  }

  /**
   * Mock weather data fallback
   */
  private getMockWeatherData(location: string, units: string): any {
    const tempUnit = units === 'metric' ? '°C' : units === 'imperial' ? '°F' : 'K';
    const baseTemp = units === 'metric' ? 22 : units === 'imperial' ? 72 : 295;

    return {
      location: {
        name: location,
        country: 'Unknown',
        coordinates: { lat: 0, lon: 0 },
      },
      current: {
        temperature: baseTemp,
        feels_like: baseTemp + 2,
        condition: 'Partly Cloudy',
        description: 'partly cloudy',
        humidity: 65,
        pressure: 1013,
        wind_speed: 12,
        wind_direction: 180,
        visibility: 10,
        uv_index: 5,
      },
      units: {
        temperature: tempUnit,
        wind_speed: units === 'metric' ? 'm/s' : 'mph',
        visibility: 'km',
      },
      timestamp: new Date().toISOString(),
      provider: 'Mock Data',
      note: 'This is mock weather data. Configure OpenWeatherMap API key for real data.',
    };
  }

  /**
   * Enhanced Calculator with more operations
   */
  async executeCalculator(parameters: Record<string, any>): Promise<any> {
    const { expression, precision = 10 } = parameters;

    try {
      // Enhanced expression evaluator with more functions
      const result = this.evaluateExpression(expression);
      
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid calculation result');
      }

      // Round to specified precision
      const roundedResult = Math.round(result * Math.pow(10, precision)) / Math.pow(10, precision);

      return {
        expression,
        result: roundedResult,
        formatted_result: this.formatNumber(roundedResult),
        type: 'number',
        precision,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Calculation failed: ${error instanceof Error ? error.message : 'Invalid expression'}`);
    }
  }

  /**
   * Safe expression evaluator with mathematical functions
   */
  private evaluateExpression(expression: string): number {
    // Remove any non-mathematical characters
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    
    if (sanitized !== expression) {
      throw new Error('Expression contains invalid characters');
    }

    // Use Function constructor for safe evaluation
    try {
      return Function(`"use strict"; return (${sanitized})`)();
    } catch (error) {
      throw new Error('Invalid mathematical expression');
    }
  }

  /**
   * Format number with appropriate notation
   */
  private formatNumber(num: number): string {
    if (Math.abs(num) >= 1e6) {
      return num.toExponential(3);
    } else if (Math.abs(num) < 0.001 && num !== 0) {
      return num.toExponential(3);
    } else {
      return num.toString();
    }
  }

  /**
   * Enhanced Date/Time tool with timezone support
   */
  async executeDateTimeTool(parameters: Record<string, any>): Promise<any> {
    const { 
      timezone = 'UTC', 
      format = 'ISO', 
      operation = 'current',
      date_input,
      offset_days = 0,
      offset_hours = 0 
    } = parameters;

    try {
      let targetDate: Date;

      switch (operation) {
        case 'current':
          targetDate = new Date();
          break;
        case 'parse':
          if (!date_input) {
            throw new Error('date_input required for parse operation');
          }
          targetDate = new Date(date_input);
          if (isNaN(targetDate.getTime())) {
            throw new Error('Invalid date input');
          }
          break;
        case 'offset':
          targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + offset_days);
          targetDate.setHours(targetDate.getHours() + offset_hours);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // Apply timezone offset (simplified - in production use proper timezone library)
      const timezoneOffset = this.getTimezoneOffset(timezone);
      const adjustedDate = new Date(targetDate.getTime() + timezoneOffset * 60000);

      let formattedDate: string;
      switch (format) {
        case 'US':
          formattedDate = adjustedDate.toLocaleDateString('en-US');
          break;
        case 'EU':
          formattedDate = adjustedDate.toLocaleDateString('en-GB');
          break;
        case 'timestamp':
          formattedDate = adjustedDate.getTime().toString();
          break;
        case 'relative':
          formattedDate = this.getRelativeTime(adjustedDate);
          break;
        default:
          formattedDate = adjustedDate.toISOString();
      }

      return {
        operation,
        input: date_input || 'current time',
        result: formattedDate,
        timezone,
        format,
        details: {
          iso_string: adjustedDate.toISOString(),
          unix_timestamp: adjustedDate.getTime(),
          day_of_week: adjustedDate.toLocaleDateString('en-US', { weekday: 'long' }),
          month: adjustedDate.toLocaleDateString('en-US', { month: 'long' }),
          year: adjustedDate.getFullYear(),
          quarter: Math.ceil((adjustedDate.getMonth() + 1) / 3),
          week_of_year: this.getWeekOfYear(adjustedDate),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Date/time operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get timezone offset (simplified implementation)
   */
  private getTimezoneOffset(timezone: string): number {
    const offsets: Record<string, number> = {
      'UTC': 0,
      'EST': -300, // UTC-5
      'PST': -480, // UTC-8
      'GMT': 0,
      'CET': 60,   // UTC+1
      'JST': 540,  // UTC+9
    };

    return offsets[timezone] || 0;
  }

  /**
   * Get relative time description
   */
  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (Math.abs(diffMinutes) < 1) {
      return 'now';
    } else if (Math.abs(diffMinutes) < 60) {
      return diffMinutes > 0 ? `in ${diffMinutes} minutes` : `${Math.abs(diffMinutes)} minutes ago`;
    } else if (Math.abs(diffHours) < 24) {
      return diffHours > 0 ? `in ${diffHours} hours` : `${Math.abs(diffHours)} hours ago`;
    } else {
      return diffDays > 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`;
    }
  }

  /**
   * Get week of year
   */
  private getWeekOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }

  /**
   * Unit Conversion Tool
   */
  async executeUnitConverter(parameters: Record<string, any>): Promise<any> {
    const { value, from_unit, to_unit, category } = parameters;

    try {
      const numericValue = parseFloat(value);
      if (isNaN(numericValue)) {
        throw new Error('Invalid numeric value');
      }

      const result = this.convertUnits(numericValue, from_unit, to_unit, category);

      return {
        input: {
          value: numericValue,
          unit: from_unit,
          category,
        },
        output: {
          value: result.value,
          unit: to_unit,
          formatted: `${result.value} ${to_unit}`,
        },
        conversion_factor: result.factor,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Unit conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert between units
   */
  private convertUnits(value: number, fromUnit: string, toUnit: string, category: string): { value: number; factor: number } {
    const conversions: Record<string, Record<string, number>> = {
      length: {
        mm: 0.001, cm: 0.01, m: 1, km: 1000,
        inch: 0.0254, ft: 0.3048, yard: 0.9144, mile: 1609.34,
      },
      weight: {
        mg: 0.000001, g: 0.001, kg: 1, ton: 1000,
        oz: 0.0283495, lb: 0.453592,
      },
      temperature: {
        celsius: (c: number) => c,
        fahrenheit: (f: number) => (f - 32) * 5/9,
        kelvin: (k: number) => k - 273.15,
      },
      volume: {
        ml: 0.001, l: 1, m3: 1000,
        cup: 0.236588, pint: 0.473176, quart: 0.946353, gallon: 3.78541,
      },
    };

    if (!conversions[category]) {
      throw new Error(`Unsupported category: ${category}`);
    }

    const categoryConversions = conversions[category];

    if (category === 'temperature') {
      // Special handling for temperature
      let celsius: number;
      
      switch (fromUnit) {
        case 'celsius':
          celsius = value;
          break;
        case 'fahrenheit':
          celsius = (value - 32) * 5/9;
          break;
        case 'kelvin':
          celsius = value - 273.15;
          break;
        default:
          throw new Error(`Unsupported temperature unit: ${fromUnit}`);
      }

      let result: number;
      switch (toUnit) {
        case 'celsius':
          result = celsius;
          break;
        case 'fahrenheit':
          result = celsius * 9/5 + 32;
          break;
        case 'kelvin':
          result = celsius + 273.15;
          break;
        default:
          throw new Error(`Unsupported temperature unit: ${toUnit}`);
      }

      return { value: Math.round(result * 100) / 100, factor: result / value };
    } else {
      // Standard unit conversion
      if (!categoryConversions[fromUnit] || !categoryConversions[toUnit]) {
        throw new Error(`Unsupported units: ${fromUnit} or ${toUnit}`);
      }

      const baseValue = value * categoryConversions[fromUnit];
      const convertedValue = baseValue / categoryConversions[toUnit];
      const factor = categoryConversions[fromUnit] / categoryConversions[toUnit];

      return { 
        value: Math.round(convertedValue * 1000000) / 1000000, 
        factor: Math.round(factor * 1000000) / 1000000 
      };
    }
  }

  /**
   * Get additional tool definitions
   */
  getAdditionalToolDefinitions(): ToolDefinition[] {
    return [
      {
        id: 'unit_converter',
        name: 'Unit Converter',
        description: 'Convert between different units of measurement',
        category: 'utility',
        provider: 'built-in',
        version: '1.0.0',
        parameters: [
          {
            name: 'value',
            type: 'number',
            description: 'Value to convert',
            required: true,
          },
          {
            name: 'from_unit',
            type: 'string',
            description: 'Source unit',
            required: true,
          },
          {
            name: 'to_unit',
            type: 'string',
            description: 'Target unit',
            required: true,
          },
          {
            name: 'category',
            type: 'string',
            description: 'Unit category',
            required: true,
            enum: ['length', 'weight', 'temperature', 'volume'],
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
        id: 'text_analyzer',
        name: 'Text Analyzer',
        description: 'Analyze text for various metrics and properties',
        category: 'utility',
        provider: 'built-in',
        version: '1.0.0',
        parameters: [
          {
            name: 'text',
            type: 'string',
            description: 'Text to analyze',
            required: true,
          },
          {
            name: 'analysis_type',
            type: 'string',
            description: 'Type of analysis to perform',
            required: false,
            default: 'basic',
            enum: ['basic', 'detailed', 'sentiment', 'readability'],
          },
        ],
        configuration: {
          timeout: 5000,
          retries: 1,
        },
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  /**
   * Execute text analyzer
   */
  async executeTextAnalyzer(parameters: Record<string, any>): Promise<any> {
    const { text, analysis_type = 'basic' } = parameters;

    try {
      const basicStats = this.getBasicTextStats(text);
      
      let result: any = {
        text_length: text.length,
        ...basicStats,
        analysis_type,
        timestamp: new Date().toISOString(),
      };

      if (analysis_type === 'detailed' || analysis_type === 'readability') {
        result = { ...result, ...this.getDetailedTextStats(text) };
      }

      if (analysis_type === 'sentiment') {
        result = { ...result, ...this.analyzeSentiment(text) };
      }

      return result;
    } catch (error) {
      throw new Error(`Text analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get basic text statistics
   */
  private getBasicTextStats(text: string): any {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    return {
      character_count: text.length,
      character_count_no_spaces: text.replace(/\s/g, '').length,
      word_count: words.length,
      sentence_count: sentences.length,
      paragraph_count: paragraphs.length,
      average_words_per_sentence: sentences.length > 0 ? Math.round((words.length / sentences.length) * 100) / 100 : 0,
    };
  }

  /**
   * Get detailed text statistics
   */
  private getDetailedTextStats(text: string): any {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordFrequency: Record<string, number> = {};
    
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    const sortedWords = Object.entries(wordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const avgWordLength = words.length > 0 
      ? Math.round((words.reduce((sum, word) => sum + word.length, 0) / words.length) * 100) / 100
      : 0;

    return {
      unique_words: Object.keys(wordFrequency).length,
      most_common_words: sortedWords.map(([word, count]) => ({ word, count })),
      average_word_length: avgWordLength,
      lexical_diversity: words.length > 0 ? Math.round((Object.keys(wordFrequency).length / words.length) * 100) / 100 : 0,
    };
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(text: string): any {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'pleased'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'angry', 'disappointed', 'frustrated'];

    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;

    let sentiment: string;
    let confidence: number;

    if (positiveCount > negativeCount) {
      sentiment = 'positive';
      confidence = Math.min(0.9, 0.5 + (positiveCount - negativeCount) / words.length);
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
      confidence = Math.min(0.9, 0.5 + (negativeCount - positiveCount) / words.length);
    } else {
      sentiment = 'neutral';
      confidence = 0.5;
    }

    return {
      sentiment,
      confidence: Math.round(confidence * 100) / 100,
      positive_indicators: positiveCount,
      negative_indicators: negativeCount,
      sentiment_score: Math.round(((positiveCount - negativeCount) / Math.max(words.length, 1)) * 100) / 100,
    };
  }
}

// Create singleton instance
export const basicTools = new BasicTools();