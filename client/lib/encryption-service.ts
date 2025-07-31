/**
 * Encryption Service for User Credentials
 * Provides secure encryption/decryption for sensitive user data
 */

import { supabase } from './supabase';

interface UserEncryptionKey {
  user_id: string;
  key_hash: string;
  salt: string;
  created_at: string;
  updated_at: string;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private keyCache = new Map<string, CryptoKey>();

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Encrypt sensitive data for a specific user
   */
  async encrypt(data: string, userId: string): Promise<string> {
    try {
      const key = await this.getUserKey(userId);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);
      
      // Return base64 encoded result
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data for a specific user
   */
  async decrypt(encryptedData: string, userId: string): Promise<string> {
    try {
      const key = await this.getUserKey(userId);
      
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generate or retrieve user-specific encryption key
   */
  async generateUserKey(userId: string): Promise<string> {
    try {
      // Check if key already exists
      const { data: existingKey } = await supabase
        .from('user_encryption_keys')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingKey) {
        return existingKey.key_hash;
      }

      // Generate new key
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        crypto.getRandomValues(new Uint8Array(32)),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // Export key for storage
      const exportedKey = await crypto.subtle.exportKey('raw', key);
      const keyHash = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
      const saltString = btoa(String.fromCharCode(...salt));

      // Store in database
      const { error } = await supabase
        .from('user_encryption_keys')
        .insert({
          user_id: userId,
          key_hash: keyHash,
          salt: saltString
        });

      if (error) {
        throw error;
      }

      return keyHash;
    } catch (error) {
      console.error('Key generation failed:', error);
      throw new Error('Failed to generate user key');
    }
  }

  /**
   * Rotate user encryption key
   */
  async rotateUserKey(userId: string): Promise<void> {
    try {
      // Remove from cache
      this.keyCache.delete(userId);

      // Delete existing key
      await supabase
        .from('user_encryption_keys')
        .delete()
        .eq('user_id', userId);

      // Generate new key
      await this.generateUserKey(userId);

      console.log(`Encryption key rotated for user: ${userId}`);
    } catch (error) {
      console.error('Key rotation failed:', error);
      throw new Error('Failed to rotate user key');
    }
  }

  /**
   * Get or create user encryption key
   */
  private async getUserKey(userId: string): Promise<CryptoKey> {
    // Check cache first
    if (this.keyCache.has(userId)) {
      return this.keyCache.get(userId)!;
    }

    try {
      // Get key from database
      const { data: keyData, error } = await supabase
        .from('user_encryption_keys')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !keyData) {
        // Generate new key if not found
        await this.generateUserKey(userId);
        return this.getUserKey(userId); // Recursive call to get the new key
      }

      // Import key from stored data
      const keyBuffer = new Uint8Array(
        atob(keyData.key_hash).split('').map(char => char.charCodeAt(0))
      );

      const key = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );

      // Cache the key
      this.keyCache.set(userId, key);

      return key;
    } catch (error) {
      console.error('Failed to get user key:', error);
      throw new Error('Failed to retrieve user encryption key');
    }
  }

  /**
   * Clear key cache (for security)
   */
  clearKeyCache(userId?: string): void {
    if (userId) {
      this.keyCache.delete(userId);
    } else {
      this.keyCache.clear();
    }
  }

  /**
   * Validate encryption/decryption functionality
   */
  async validateEncryption(userId: string): Promise<boolean> {
    try {
      const testData = 'test-encryption-data-' + Date.now();
      const encrypted = await this.encrypt(testData, userId);
      const decrypted = await this.decrypt(encrypted, userId);
      return testData === decrypted;
    } catch (error) {
      console.error('Encryption validation failed:', error);
      return false;
    }
  }

  /**
   * Get encryption statistics for monitoring
   */
  async getEncryptionStats(): Promise<{
    totalUsers: number;
    cacheSize: number;
    lastActivity: string;
  }> {
    try {
      const { count } = await supabase
        .from('user_encryption_keys')
        .select('*', { count: 'exact', head: true });

      return {
        totalUsers: count || 0,
        cacheSize: this.keyCache.size,
        lastActivity: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get encryption stats:', error);
      return {
        totalUsers: 0,
        cacheSize: this.keyCache.size,
        lastActivity: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();