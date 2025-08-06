import crypto from 'crypto';
import { machineIdSync } from 'node-machine-id';
import Store from 'electron-store';
import axios from 'axios';
import log from '../log';
import keytar from 'keytar';

interface License {
  key: string;
  email: string;
  name: string;
  company?: string;
  type: 'trial' | 'standard' | 'professional' | 'enterprise';
  seats: number;
  activatedAt: string;
  expiresAt: string;
  machineId: string;
  features: string[];
}

interface LicenseValidation {
  isValid: boolean;
  license?: License;
  error?: string;
}

const SERVICE_NAME = 'clerk-app';
const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://license.clerk.app/api';

class LicenseManager {
  private store: Store;
  private machineId: string;
  private cachedLicense: License | null = null;

  constructor() {
    this.store = new Store({
      name: 'clerk-license',
      encryptionKey: process.env.LICENSE_ENCRYPTION_KEY || 'clerk-license-key-dev'
    });
    
    try {
      this.machineId = machineIdSync();
    } catch (error) {
      log.error('Failed to get machine ID', error);
      // Fallback to a generated ID
      this.machineId = this.generateFallbackMachineId();
    }
  }

  private generateFallbackMachineId(): string {
    const stored = this.store.get('fallbackMachineId') as string;
    if (stored) return stored;
    
    const id = crypto.randomBytes(16).toString('hex');
    this.store.set('fallbackMachineId', id);
    return id;
  }

  /**
   * Generate a license key (for your license server)
   */
  static generateLicenseKey(email: string, type: string): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    const hash = crypto.createHash('sha256')
      .update(`${email}-${type}-${timestamp}`)
      .digest('hex')
      .substring(0, 8);
    
    // Format: XXXX-XXXX-XXXX-XXXX
    const key = `${hash.toUpperCase()}-${random.substring(0, 4).toUpperCase()}-${random.substring(4, 8).toUpperCase()}-${timestamp.toUpperCase()}`;
    return key;
  }

  /**
   * Activate a license key
   */
  async activateLicense(licenseKey: string, email: string, name: string): Promise<LicenseValidation> {
    try {
      // First check if already activated
      const existing = await this.getLicense();
      if (existing && existing.key === licenseKey) {
        return { isValid: true, license: existing };
      }

      // Call license server to activate
      const response = await axios.post(`${LICENSE_SERVER_URL}/activate`, {
        key: licenseKey,
        email,
        name,
        machineId: this.machineId,
        appVersion: process.env.npm_package_version
      });

      if (response.data.success) {
        const license: License = response.data.license;
        
        // Store license locally
        await this.storeLicense(license);
        
        // Store in keytar for extra security
        await keytar.setPassword(SERVICE_NAME, 'license-key', licenseKey);
        
        this.cachedLicense = license;
        
        log.info('License activated successfully', {
          type: license.type,
          expiresAt: license.expiresAt
        });
        
        return { isValid: true, license };
      } else {
        return { isValid: false, error: response.data.error || 'Activation failed' };
      }
    } catch (error) {
      log.error('License activation failed', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return { isValid: false, error: 'Invalid license key' };
        } else if (error.response?.status === 409) {
          return { isValid: false, error: 'License already activated on another machine' };
        } else if (error.response?.status === 410) {
          return { isValid: false, error: 'License has expired' };
        }
      }
      
      return { isValid: false, error: 'Failed to activate license. Please check your internet connection.' };
    }
  }

  /**
   * Validate current license
   */
  async validateLicense(): Promise<LicenseValidation> {
    try {
      const license = await this.getLicense();
      
      if (!license) {
        return { isValid: false, error: 'No license found' };
      }

      // Check expiration
      const now = new Date();
      const expiresAt = new Date(license.expiresAt);
      
      if (now > expiresAt) {
        return { isValid: false, error: 'License has expired' };
      }

      // Check machine ID
      if (license.machineId !== this.machineId) {
        return { isValid: false, error: 'License is not valid for this machine' };
      }

      // Periodically verify with server (every 7 days)
      const lastVerified = this.store.get('lastVerified') as string;
      const daysSinceVerification = lastVerified 
        ? (now.getTime() - new Date(lastVerified).getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;

      if (daysSinceVerification > 7) {
        const serverValidation = await this.verifyWithServer(license.key);
        if (!serverValidation.isValid) {
          await this.revokeLicense();
          return serverValidation;
        }
        this.store.set('lastVerified', now.toISOString());
      }

      return { isValid: true, license };
    } catch (error) {
      log.error('License validation failed', error);
      return { isValid: false, error: 'Failed to validate license' };
    }
  }

  /**
   * Verify license with server
   */
  private async verifyWithServer(licenseKey: string): Promise<LicenseValidation> {
    try {
      const response = await axios.post(`${LICENSE_SERVER_URL}/verify`, {
        key: licenseKey,
        machineId: this.machineId
      });

      if (response.data.valid) {
        return { isValid: true };
      } else {
        return { isValid: false, error: response.data.reason || 'License verification failed' };
      }
    } catch (error) {
      // Allow offline usage if can't reach server
      log.warn('Could not verify license with server, allowing offline usage', error);
      return { isValid: true };
    }
  }

  /**
   * Get stored license
   */
  async getLicense(): Promise<License | null> {
    if (this.cachedLicense) {
      return this.cachedLicense;
    }

    const stored = this.store.get('license') as License;
    if (stored) {
      this.cachedLicense = stored;
      return stored;
    }

    return null;
  }

  /**
   * Store license
   */
  private async storeLicense(license: License): Promise<void> {
    this.store.set('license', license);
    this.cachedLicense = license;
  }

  /**
   * Revoke license
   */
  async revokeLicense(): Promise<void> {
    this.store.delete('license');
    this.store.delete('lastVerified');
    this.cachedLicense = null;
    
    try {
      await keytar.deletePassword(SERVICE_NAME, 'license-key');
    } catch (error) {
      log.error('Failed to delete license key from keytar', error);
    }

    log.info('License revoked');
  }

  /**
   * Start a trial
   */
  async startTrial(email: string, name: string): Promise<LicenseValidation> {
    try {
      // Check if trial already used
      const trialUsed = this.store.get('trialUsed') as boolean;
      if (trialUsed) {
        return { isValid: false, error: 'Trial has already been used on this machine' };
      }

      const response = await axios.post(`${LICENSE_SERVER_URL}/trial`, {
        email,
        name,
        machineId: this.machineId
      });

      if (response.data.success) {
        const license: License = {
          ...response.data.license,
          type: 'trial',
          machineId: this.machineId
        };

        await this.storeLicense(license);
        this.store.set('trialUsed', true);

        log.info('Trial started', { expiresAt: license.expiresAt });
        
        return { isValid: true, license };
      } else {
        return { isValid: false, error: response.data.error || 'Failed to start trial' };
      }
    } catch (error) {
      log.error('Failed to start trial', error);
      
      // Allow offline trial for 14 days
      const license: License = {
        key: 'TRIAL-' + crypto.randomBytes(8).toString('hex').toUpperCase(),
        email,
        name,
        type: 'trial',
        seats: 1,
        activatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        machineId: this.machineId,
        features: ['basic']
      };

      await this.storeLicense(license);
      this.store.set('trialUsed', true);

      return { isValid: true, license };
    }
  }

  /**
   * Check if a feature is available
   */
  async hasFeature(feature: string): Promise<boolean> {
    const validation = await this.validateLicense();
    if (!validation.isValid || !validation.license) {
      return false;
    }

    // Define features by license type
    const featureMap: Record<string, string[]> = {
      trial: ['basic', 'templates', 'ai-generation'],
      standard: ['basic', 'templates', 'ai-generation', 'cloud-storage', 'export-pdf'],
      professional: ['basic', 'templates', 'ai-generation', 'cloud-storage', 'export-pdf', 'custom-templates', 'priority-support'],
      enterprise: ['basic', 'templates', 'ai-generation', 'cloud-storage', 'export-pdf', 'custom-templates', 'priority-support', 'api-access', 'white-label']
    };

    const allowedFeatures = featureMap[validation.license.type] || [];
    return allowedFeatures.includes(feature) || validation.license.features.includes(feature);
  }

  /**
   * Get license info for display
   */
  async getLicenseInfo(): Promise<{
    isLicensed: boolean;
    type?: string;
    expiresAt?: string;
    daysRemaining?: number;
    seats?: number;
    email?: string;
  }> {
    const validation = await this.validateLicense();
    
    if (!validation.isValid || !validation.license) {
      return { isLicensed: false };
    }

    const expiresAt = new Date(validation.license.expiresAt);
    const now = new Date();
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isLicensed: true,
      type: validation.license.type,
      expiresAt: validation.license.expiresAt,
      daysRemaining,
      seats: validation.license.seats,
      email: validation.license.email
    };
  }
}

export const licenseManager = new LicenseManager();
export { License, LicenseValidation };