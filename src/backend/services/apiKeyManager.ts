import crypto from 'crypto';
import { db } from '../database';

interface EncryptedKey {
  iv: string;
  encryptedData: string;
  keyHash: string;
}

export class APIKeyManager {
  private algorithm = 'aes-256-gcm';
  
  /**
   * Encrypts an API key for storage
   * Each organization gets a unique encryption key
   */
  async encryptAPIKey(
    orgId: string, 
    userId: string, 
    apiKey: string
  ): Promise<EncryptedKey> {
    // Get org-specific encryption key from secure storage
    const orgKey = await this.getOrgEncryptionKey(orgId);
    
    // Generate random IV
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, orgKey, iv);
    
    // Encrypt the API key
    const encrypted = Buffer.concat([
      cipher.update(apiKey, 'utf8'),
      cipher.final()
    ]);
    
    // Get auth tag for verification
    const authTag = cipher.getAuthTag();
    
    // Create hash for key rotation detection
    const keyHash = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex')
      .substring(0, 8);
    
    return {
      iv: iv.toString('hex'),
      encryptedData: Buffer.concat([authTag, encrypted]).toString('hex'),
      keyHash
    };
  }
  
  /**
   * Decrypts an API key for use
   * Only happens in memory, never logged
   */
  async decryptAPIKey(
    orgId: string,
    encryptedKey: EncryptedKey
  ): Promise<string> {
    const orgKey = await this.getOrgEncryptionKey(orgId);
    const iv = Buffer.from(encryptedKey.iv, 'hex');
    const encryptedData = Buffer.from(encryptedKey.encryptedData, 'hex');
    
    // Extract auth tag
    const authTag = encryptedData.slice(0, 16);
    const encrypted = encryptedData.slice(16);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, orgKey, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  }
  
  /**
   * Validates API key without storing it
   * Used during initial setup
   */
  async validateAPIKey(apiKey: string): Promise<{
    isValid: boolean;
    error?: string;
    metadata?: {
      hasModels: boolean;
      organization?: string;
    };
  }> {
    try {
      // Test the key with a minimal API call
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!response.ok) {
        return {
          isValid: false,
          error: response.status === 401 
            ? 'Invalid API key' 
            : 'API key validation failed'
        };
      }
      
      const data = await response.json();
      
      return {
        isValid: true,
        metadata: {
          hasModels: data.data?.length > 0,
          organization: response.headers.get('openai-organization') || undefined
        }
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to validate API key'
      };
    }
  }
  
  /**
   * Stores encrypted API key for an organization
   */
  async storeAPIKey(
    orgId: string,
    userId: string,
    apiKey: string
  ): Promise<void> {
    // Validate first
    const validation = await this.validateAPIKey(apiKey);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid API key');
    }
    
    // Encrypt
    const encrypted = await this.encryptAPIKey(orgId, userId, apiKey);
    
    // Store in database
    await db.apiKeys.upsert({
      where: { orgId },
      create: {
        orgId,
        userId,
        encryptedKey: encrypted.encryptedData,
        iv: encrypted.iv,
        keyHash: encrypted.keyHash,
        lastValidated: new Date(),
        createdAt: new Date()
      },
      update: {
        userId,
        encryptedKey: encrypted.encryptedData,
        iv: encrypted.iv,
        keyHash: encrypted.keyHash,
        lastValidated: new Date(),
        updatedAt: new Date()
      }
    });
    
    // Log audit trail (without key value)
    await db.auditLogs.create({
      data: {
        orgId,
        userId,
        action: 'API_KEY_UPDATED',
        metadata: {
          keyHash: encrypted.keyHash,
          timestamp: new Date().toISOString()
        }
      }
    });
  }
  
  /**
   * Retrieves and decrypts API key for use
   * Used by the AI generation service
   */
  async getAPIKey(orgId: string): Promise<string | null> {
    const record = await db.apiKeys.findUnique({
      where: { orgId }
    });
    
    if (!record) {
      return null;
    }
    
    // Check if key needs revalidation (every 24 hours)
    const lastValidated = new Date(record.lastValidated);
    const hoursSinceValidation = 
      (Date.now() - lastValidated.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceValidation > 24) {
      // Decrypt and revalidate
      const apiKey = await this.decryptAPIKey(orgId, {
        iv: record.iv,
        encryptedData: record.encryptedKey,
        keyHash: record.keyHash
      });
      
      const validation = await this.validateAPIKey(apiKey);
      if (!validation.isValid) {
        // Mark as invalid
        await db.apiKeys.update({
          where: { orgId },
          data: { 
            isValid: false,
            lastValidated: new Date()
          }
        });
        throw new Error('API key is no longer valid');
      }
      
      // Update validation timestamp
      await db.apiKeys.update({
        where: { orgId },
        data: { lastValidated: new Date() }
      });
    }
    
    // Decrypt and return
    return this.decryptAPIKey(orgId, {
      iv: record.iv,
      encryptedData: record.encryptedKey,
      keyHash: record.keyHash
    });
  }
  
  /**
   * Gets or creates organization-specific encryption key
   */
  private async getOrgEncryptionKey(orgId: string): Promise<Buffer> {
    // In production, this would come from a secure key management service
    // like AWS KMS, Azure Key Vault, or HashiCorp Vault
    const masterKey = process.env.MASTER_ENCRYPTION_KEY!;
    
    // Derive org-specific key
    return crypto
      .createHash('sha256')
      .update(masterKey + orgId)
      .digest();
  }
  
  /**
   * Checks if organization has a valid API key
   */
  async hasValidAPIKey(orgId: string): Promise<boolean> {
    const record = await db.apiKeys.findUnique({
      where: { orgId },
      select: { isValid: true }
    });
    
    return record?.isValid ?? false;
  }
  
  /**
   * Removes API key for an organization
   */
  async removeAPIKey(orgId: string, userId: string): Promise<void> {
    await db.apiKeys.delete({
      where: { orgId }
    });
    
    // Audit trail
    await db.auditLogs.create({
      data: {
        orgId,
        userId,
        action: 'API_KEY_REMOVED',
        metadata: {
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}

export const apiKeyManager = new APIKeyManager();