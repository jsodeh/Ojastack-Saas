/**
 * WhatsApp Credential Manager
 * Manages user-provided WhatsApp Business API credentials
 */

import { supabase } from './supabase';
import { encryptionService } from './encryption-service';

export interface WhatsAppCredentialsInput {
  business_account_id: string;
  access_token: string;
  phone_number_id: string;
  phone_number: string;
  display_name: string;
  webhook_verify_token?: string;
}

export interface WhatsAppCredentials {
  id: string;
  user_id: string;
  business_account_id: string;
  access_token_encrypted: string;
  phone_number_id: string;
  phone_number: string;
  display_name: string;
  webhook_verify_token: string;
  status: 'active' | 'invalid' | 'expired' | 'suspended';
  last_validated: string | null;
  created_at: string;
  updated_at: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  businessInfo?: {
    name: string;
    phone_numbers: Array<{
      id: string;
      display_phone_number: string;
      verified_name: string;
    }>;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'error';
  last_check: string;
  issues: string[];
  api_limits?: {
    rate_limit_hit: boolean;
    requests_remaining: number;
    reset_time: string;
  };
}

export class WhatsAppCredentialManager {
  private static instance: WhatsAppCredentialManager;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  static getInstance(): WhatsAppCredentialManager {
    if (!WhatsAppCredentialManager.instance) {
      WhatsAppCredentialManager.instance = new WhatsAppCredentialManager();
    }
    return WhatsAppCredentialManager.instance;
  }

  /**
   * Store new WhatsApp credentials for a user
   */
  async storeCredentials(
    userId: string, 
    credentials: WhatsAppCredentialsInput
  ): Promise<WhatsAppCredentials> {
    try {
      // Validate credentials first
      const validation = await this.validateCredentials(credentials);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid credentials');
      }

      // Encrypt the access token
      const encryptedToken = await encryptionService.encrypt(
        credentials.access_token, 
        userId
      );

      // Generate webhook verify token if not provided
      const webhookVerifyToken = credentials.webhook_verify_token || 
        this.generateWebhookVerifyToken();

      // Store in database
      const { data, error } = await supabase
        .from('whatsapp_credentials')
        .insert({
          user_id: userId,
          business_account_id: credentials.business_account_id,
          access_token_encrypted: encryptedToken,
          phone_number_id: credentials.phone_number_id,
          phone_number: credentials.phone_number,
          display_name: credentials.display_name,
          webhook_verify_token: webhookVerifyToken,
          status: 'active',
          last_validated: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`WhatsApp credentials stored for user: ${userId}`);
      return data;
    } catch (error) {
      console.error('Failed to store credentials:', error);
      throw new Error(`Failed to store WhatsApp credentials: ${error.message}`);
    }
  }

  /**
   * Get WhatsApp credentials for a user
   */
  async getCredentials(
    userId: string, 
    credentialId: string
  ): Promise<WhatsAppCredentials | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('id', credentialId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get credentials:', error);
      return null;
    }
  }

  /**
   * Get all WhatsApp credentials for a user
   */
  async getUserCredentials(userId: string): Promise<WhatsAppCredentials[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_credentials')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get user credentials:', error);
      return [];
    }
  }

  /**
   * Update WhatsApp credentials
   */
  async updateCredentials(
    credentialId: string, 
    updates: Partial<WhatsAppCredentialsInput>
  ): Promise<WhatsAppCredentials> {
    try {
      // Get existing credential to get user_id
      const { data: existing, error: fetchError } = await supabase
        .from('whatsapp_credentials')
        .select('user_id')
        .eq('id', credentialId)
        .single();

      if (fetchError || !existing) {
        throw new Error('Credential not found');
      }

      const updateData: any = { updated_at: new Date().toISOString() };

      // Encrypt access token if provided
      if (updates.access_token) {
        updateData.access_token_encrypted = await encryptionService.encrypt(
          updates.access_token,
          existing.user_id
        );
      }

      // Update other fields
      if (updates.business_account_id) updateData.business_account_id = updates.business_account_id;
      if (updates.phone_number_id) updateData.phone_number_id = updates.phone_number_id;
      if (updates.phone_number) updateData.phone_number = updates.phone_number;
      if (updates.display_name) updateData.display_name = updates.display_name;
      if (updates.webhook_verify_token) updateData.webhook_verify_token = updates.webhook_verify_token;

      // Validate if access token is being updated
      if (updates.access_token) {
        const validation = await this.validateCredentials({
          ...updates,
          access_token: updates.access_token
        } as WhatsAppCredentialsInput);

        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid credentials');
        }

        updateData.status = 'active';
        updateData.last_validated = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('whatsapp_credentials')
        .update(updateData)
        .eq('id', credentialId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`WhatsApp credentials updated: ${credentialId}`);
      return data;
    } catch (error) {
      console.error('Failed to update credentials:', error);
      throw new Error(`Failed to update WhatsApp credentials: ${error.message}`);
    }
  }

  /**
   * Delete WhatsApp credentials
   */
  async deleteCredentials(credentialId: string): Promise<void> {
    try {
      // Delete associated webhooks first
      await supabase
        .from('whatsapp_webhooks')
        .delete()
        .eq('credential_id', credentialId);

      // Delete agent configurations
      await supabase
        .from('agent_whatsapp_configs')
        .delete()
        .eq('credential_id', credentialId);

      // Delete the credential
      const { error } = await supabase
        .from('whatsapp_credentials')
        .delete()
        .eq('id', credentialId);

      if (error) {
        throw error;
      }

      console.log(`WhatsApp credentials deleted: ${credentialId}`);
    } catch (error) {
      console.error('Failed to delete credentials:', error);
      throw new Error(`Failed to delete WhatsApp credentials: ${error.message}`);
    }
  }

  /**
   * Validate WhatsApp credentials against the API
   */
  async validateCredentials(credentials: WhatsAppCredentialsInput): Promise<ValidationResult> {
    try {
      // Test the access token by fetching business account info
      const response = await fetch(
        `${this.baseUrl}/${credentials.business_account_id}?fields=name,phone_numbers`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          valid: false,
          error: errorData.error?.message || `API Error: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();

      // Verify the phone number ID exists
      const phoneNumber = data.phone_numbers?.find(
        (pn: any) => pn.id === credentials.phone_number_id
      );

      if (!phoneNumber) {
        return {
          valid: false,
          error: 'Phone number ID not found in business account'
        };
      }

      return {
        valid: true,
        businessInfo: {
          name: data.name,
          phone_numbers: data.phone_numbers
        }
      };
    } catch (error) {
      console.error('Credential validation failed:', error);
      return {
        valid: false,
        error: `Validation failed: ${error.message}`
      };
    }
  }

  /**
   * Check health status of credentials
   */
  async checkCredentialHealth(credentialId: string): Promise<HealthStatus> {
    try {
      const credential = await this.getCredentialWithDecryptedToken(credentialId);
      if (!credential) {
        return {
          status: 'error',
          last_check: new Date().toISOString(),
          issues: ['Credential not found']
        };
      }

      // Test API connectivity
      const response = await fetch(
        `${this.baseUrl}/${credential.business_account_id}`,
        {
          headers: {
            'Authorization': `Bearer ${credential.decrypted_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const issues: string[] = [];
      let status: 'healthy' | 'warning' | 'error' = 'healthy';

      if (!response.ok) {
        status = 'error';
        issues.push(`API Error: ${response.status} ${response.statusText}`);
      }

      // Check rate limiting headers
      const rateLimitRemaining = response.headers.get('X-Business-Use-Case-Usage');
      if (rateLimitRemaining) {
        try {
          const usage = JSON.parse(rateLimitRemaining);
          if (usage.call_count > 80) { // Warning at 80% usage
            status = status === 'error' ? 'error' : 'warning';
            issues.push('Approaching rate limit');
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Update last validated timestamp
      await supabase
        .from('whatsapp_credentials')
        .update({ 
          last_validated: new Date().toISOString(),
          status: status === 'error' ? 'invalid' : 'active'
        })
        .eq('id', credentialId);

      return {
        status,
        last_check: new Date().toISOString(),
        issues
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'error',
        last_check: new Date().toISOString(),
        issues: [`Health check failed: ${error.message}`]
      };
    }
  }

  /**
   * Get credential with decrypted access token (for internal use)
   */
  async getCredentialWithDecryptedToken(credentialId: string): Promise<{
    credential: WhatsAppCredentials;
    decrypted_token: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_credentials')
        .select('*')
        .eq('id', credentialId)
        .single();

      if (error || !data) {
        return null;
      }

      const decryptedToken = await encryptionService.decrypt(
        data.access_token_encrypted,
        data.user_id
      );

      return {
        credential: data,
        decrypted_token: decryptedToken
      };
    } catch (error) {
      console.error('Failed to get credential with decrypted token:', error);
      return null;
    }
  }

  /**
   * Generate a secure webhook verify token
   */
  private generateWebhookVerifyToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/[+/]/g, '')
      .substring(0, 32);
  }

  /**
   * Get credential statistics for monitoring
   */
  async getCredentialStats(userId?: string): Promise<{
    total_credentials: number;
    active_credentials: number;
    invalid_credentials: number;
    last_validation: string | null;
  }> {
    try {
      let query = supabase.from('whatsapp_credentials').select('status, last_validated');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const stats = {
        total_credentials: data?.length || 0,
        active_credentials: data?.filter(c => c.status === 'active').length || 0,
        invalid_credentials: data?.filter(c => c.status === 'invalid').length || 0,
        last_validation: data?.reduce((latest, current) => {
          if (!current.last_validated) return latest;
          if (!latest) return current.last_validated;
          return current.last_validated > latest ? current.last_validated : latest;
        }, null as string | null)
      };

      return stats;
    } catch (error) {
      console.error('Failed to get credential stats:', error);
      return {
        total_credentials: 0,
        active_credentials: 0,
        invalid_credentials: 0,
        last_validation: null
      };
    }
  }
}

// Export singleton instance
export const whatsappCredentialManager = WhatsAppCredentialManager.getInstance();