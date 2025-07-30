import { ToolDefinition, ToolExecutionResult, ToolExecutionContext } from '../tool-system';

export interface DateTimeResult {
  operation: string;
  result: any;
  timezone: string;
  format: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Enhanced Date & Time Tool
 * Comprehensive date/time operations, timezone handling, and formatting
 */
export class DateTimeTool {
  private timezones = {
    // Major timezones
    'UTC': 'UTC',
    'GMT': 'GMT',
    'EST': 'America/New_York',
    'PST': 'America/Los_Angeles',
    'CST': 'America/Chicago',
    'MST': 'America/Denver',
    'JST': 'Asia/Tokyo',
    'CET': 'Europe/Paris',
    'IST': 'Asia/Kolkata',
    'AEST': 'Australia/Sydney',
  };

  /**
   * Execute date/time operation
   */
  async execute(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const { 
      operation = 'current_time',
      timezone = 'UTC',
      format = 'ISO',
      date_input,
      target_timezone,
      calculation_type,
      amount,
      unit
    } = parameters;

    try {
      let result: DateTimeResult;

      switch (operation) {
        case 'current_time':
          result = await this.getCurrentTime(timezone, format);
          break;
        case 'convert_timezone':
          result = await this.convertTimezone(date_input, timezone, target_timezone, format);
          break;
        case 'format_date':
          result = await this.formatDate(date_input, format, timezone);
          break;
        case 'parse_date':
          result = await this.parseDate(date_input, timezone);
          break;
        case 'calculate_date':
          result = await this.calculateDate(date_input, calculation_type, amount, unit, timezone, format);
          break;
        case 'compare_dates':
          result = await this.compareDates(parameters);
          break;
        case 'business_days':
          result = await this.calculateBusinessDays(parameters);
          break;
        case 'time_until':
          result = await this.timeUntil(date_input, timezone);
          break;
        case 'timezone_info':
          result = await this.getTimezoneInfo(timezone);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      return {
        success: true,
        result,
        execution_time: Date.now() - startTime,
        metadata: {
          operation,
          timezone_used: timezone,
          format_used: format,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Date/time operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        execution_time: Date.now() - startTime,
      };
    }
  }

  /**
   * Get current time
   */
  private async getCurrentTime(timezone: string, format: string): Promise<DateTimeResult> {
    const now = new Date();
    const resolvedTimezone = this.resolveTimezone(timezone);
    
    const result = {
      current_time: this.formatDateTime(now, format, resolvedTimezone),
      timezone: resolvedTimezone,
      format,
      unix_timestamp: Math.floor(now.getTime() / 1000),
      iso_string: now.toISOString(),
      utc_offset: this.getTimezoneOffset(resolvedTimezone),
      day_of_week: now.toLocaleDateString('en-US', { weekday: 'long', timeZone: resolvedTimezone }),
      day_of_year: this.getDayOfYear(now),
      week_of_year: this.getWeekOfYear(now),
      is_dst: this.isDST(now, resolvedTimezone),
      month_name: now.toLocaleDateString('en-US', { month: 'long', timeZone: resolvedTimezone }),
      quarter: Math.ceil((now.getMonth() + 1) / 3),
    };

    return {
      operation: 'current_time',
      result,
      timezone: resolvedTimezone,
      format,
      timestamp: new Date().toISOString(),
    };
  }

  // Helper methods
  private resolveTimezone(timezone: string): string {
    return this.timezones[timezone] || timezone;
  }

  private parseInputDate(input: string | number | Date): Date {
    if (input instanceof Date) return input;
    if (typeof input === 'number') return new Date(input);
    
    const date = new Date(input);
    if (!isNaN(date.getTime())) return date;
    
    const timestamp = parseInt(input);
    if (!isNaN(timestamp)) {
      return new Date(timestamp * (timestamp.toString().length === 10 ? 1000 : 1));
    }
    
    throw new Error(`Unable to parse date: ${input}`);
  }

  private formatDateTime(date: Date, format: string, timezone: string): string {
    try {
      switch (format) {
        case 'ISO':
          return date.toISOString();
        case 'US':
          return date.toLocaleDateString('en-US', { timeZone: timezone });
        case 'EU':
        case 'UK':
          return date.toLocaleDateString('en-GB', { timeZone: timezone });
        case 'full':
          return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: timezone,
          });
        default:
          return date.toISOString();
      }
    } catch (error) {
      return date.toISOString();
    }
  }

  private getTimezoneOffset(timezone: string): string {
    try {
      const date = new Date();
      const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const local = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
      const offset = (local.getTime() - utc.getTime()) / (1000 * 60);
      const hours = Math.floor(Math.abs(offset) / 60);
      const minutes = Math.abs(offset) % 60;
      const sign = offset >= 0 ? '+' : '-';
      return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      return '+00:00';
    }
  }

  private isDST(date: Date, timezone: string): boolean {
    return false; // Simplified for now
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private getWeekOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }

  // Placeholder methods for other operations
  private async convertTimezone(dateInput: string, sourceTimezone: string, targetTimezone: string, format: string): Promise<DateTimeResult> {
    const date = this.parseInputDate(dateInput);
    const result = {
      converted_time: this.formatDateTime(date, format, this.resolveTimezone(targetTimezone)),
    };
    return {
      operation: 'convert_timezone',
      result,
      timezone: this.resolveTimezone(targetTimezone),
      format,
      timestamp: new Date().toISOString(),
    };
  }

  private async formatDate(dateInput: string, format: string, timezone: string): Promise<DateTimeResult> {
    const date = this.parseInputDate(dateInput);
    const result = {
      formatted_date: this.formatDateTime(date, format, this.resolveTimezone(timezone)),
    };
    return {
      operation: 'format_date',
      result,
      timezone: this.resolveTimezone(timezone),
      format,
      timestamp: new Date().toISOString(),
    };
  }

  private async parseDate(dateInput: string, timezone: string): Promise<DateTimeResult> {
    const date = this.parseInputDate(dateInput);
    const result = {
      parsed_date: date.toISOString(),
      unix_timestamp: Math.floor(date.getTime() / 1000),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
    return {
      operation: 'parse_date',
      result,
      timezone: this.resolveTimezone(timezone),
      format: 'parsed',
      timestamp: new Date().toISOString(),
    };
  }

  private async calculateDate(dateInput: string, calculationType: string, amount: number, unit: string, timezone: string, format: string): Promise<DateTimeResult> {
    const date = this.parseInputDate(dateInput);
    let calculatedDate = new Date(date);
    const multiplier = calculationType === 'subtract' ? -1 : 1;
    const adjustedAmount = amount * multiplier;

    switch (unit) {
      case 'days':
        calculatedDate.setDate(calculatedDate.getDate() + adjustedAmount);
        break;
      case 'hours':
        calculatedDate.setHours(calculatedDate.getHours() + adjustedAmount);
        break;
      case 'minutes':
        calculatedDate.setMinutes(calculatedDate.getMinutes() + adjustedAmount);
        break;
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }

    const result = {
      original_date: this.formatDateTime(date, format, this.resolveTimezone(timezone)),
      calculated_date: this.formatDateTime(calculatedDate, format, this.resolveTimezone(timezone)),
      calculation: `${calculationType} ${amount} ${unit}`,
    };

    return {
      operation: 'calculate_date',
      result,
      timezone: this.resolveTimezone(timezone),
      format,
      timestamp: new Date().toISOString(),
    };
  }

  private async compareDates(parameters: Record<string, any>): Promise<DateTimeResult> {
    const { date1, date2, timezone = 'UTC' } = parameters;
    const firstDate = this.parseInputDate(date1);
    const secondDate = this.parseInputDate(date2);
    const diffMs = secondDate.getTime() - firstDate.getTime();
    
    const result = {
      date1: firstDate.toISOString(),
      date2: secondDate.toISOString(),
      comparison: diffMs === 0 ? 'equal' : diffMs > 0 ? 'date2_is_later' : 'date1_is_later',
      difference_days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
    };

    return {
      operation: 'compare_dates',
      result,
      timezone: this.resolveTimezone(timezone),
      format: 'comparison',
      timestamp: new Date().toISOString(),
    };
  }

  private async calculateBusinessDays(parameters: Record<string, any>): Promise<DateTimeResult> {
    const { start_date, end_date } = parameters;
    const startDate = this.parseInputDate(start_date);
    const endDate = this.parseInputDate(end_date);
    
    let businessDays = 0;
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        businessDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const result = {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      business_days: businessDays,
    };

    return {
      operation: 'business_days',
      result,
      timezone: 'UTC',
      format: 'business_calculation',
      timestamp: new Date().toISOString(),
    };
  }

  private async timeUntil(targetDate: string, timezone: string): Promise<DateTimeResult> {
    const now = new Date();
    const target = this.parseInputDate(targetDate);
    const diffMs = target.getTime() - now.getTime();
    const days = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
    
    const result = {
      target_date: target.toISOString(),
      days_until: diffMs > 0 ? days : -days,
      is_past: diffMs < 0,
    };

    return {
      operation: 'time_until',
      result,
      timezone: this.resolveTimezone(timezone),
      format: 'countdown',
      timestamp: new Date().toISOString(),
    };
  }

  private async getTimezoneInfo(timezone: string): Promise<DateTimeResult> {
    const resolvedTimezone = this.resolveTimezone(timezone);
    const now = new Date();
    
    const result = {
      timezone: resolvedTimezone,
      current_time: this.formatDateTime(now, 'full', resolvedTimezone),
      utc_offset: this.getTimezoneOffset(resolvedTimezone),
    };

    return {
      operation: 'timezone_info',
      result,
      timezone: resolvedTimezone,
      format: 'info',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get tool definition
   */
  static getDefinition(): ToolDefinition {
    return {
      id: 'datetime',
      name: 'Date & Time Operations',
      description: 'Comprehensive date/time operations, timezone conversions, and calculations',
      category: 'utility',
      provider: 'built-in',
      version: '2.0.0',
      parameters: [
        {
          name: 'operation',
          type: 'string',
          description: 'Type of date/time operation',
          required: false,
          default: 'current_time',
          enum: [
            'current_time',
            'convert_timezone',
            'format_date',
            'parse_date',
            'calculate_date',
            'compare_dates',
            'business_days',
            'time_until',
            'timezone_info',
          ],
        },
        {
          name: 'date_input',
          type: 'string',
          description: 'Input date (ISO string, timestamp, or natural language)',
          required: false,
        },
        {
          name: 'timezone',
          type: 'string',
          description: 'Source timezone (IANA timezone or common abbreviation)',
          required: false,
          default: 'UTC',
        },
        {
          name: 'target_timezone',
          type: 'string',
          description: 'Target timezone for conversion',
          required: false,
        },
        {
          name: 'format',
          type: 'string',
          description: 'Output format',
          required: false,
          default: 'ISO',
          enum: ['ISO', 'US', 'EU', 'UK', 'full', 'short', 'time', 'time12', 'date', 'timestamp', 'relative'],
        },
        {
          name: 'calculation_type',
          type: 'string',
          description: 'Type of date calculation',
          required: false,
          enum: ['add', 'subtract'],
        },
        {
          name: 'amount',
          type: 'number',
          description: 'Amount to add/subtract',
          required: false,
        },
        {
          name: 'unit',
          type: 'string',
          description: 'Time unit for calculation',
          required: false,
          enum: ['milliseconds', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'],
        },
      ],
      configuration: {
        timeout: 5000,
        retries: 1,
      },
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}