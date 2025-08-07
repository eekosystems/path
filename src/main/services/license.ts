import { app } from 'electron';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import Store from 'electron-store';
import axios from 'axios';
import { machineIdSync } from 'node-machine-id';
import log from '../log';
import { SubscriptionInfo, LicenseInfo } from '../types/ipc';

interface LicenseData {
  licenseKey: string;
  firmName: string;
  firmId: string;
  expirationDate: string;
  maxUsers?: number;
  features?: string[];
  signature: string;
  stripeSubscriptionId?: string;
  planType?: 'monthly' | 'annual';
  status?: string;
  email?: string;
  activations?: number;
  maxActivations?: number;
}

interface LicenseValidation {
  isValid: boolean;
  isExpired: boolean;
  firmName?: string;
  daysRemaining?: number;
  error?: string;
}

class LicenseService {
  private store: Store;
  private publicKey: string;
  private licenseServerUrl: string;
  private machineId: string;
  
  constructor() {
    this.store = new Store({ 
      name: 'license-store',
      encryptionKey: process.env.LICENSE_ENCRYPTION_KEY || 'default-license-key'
    });
    
    // License server URL - change to production URL when deployed
    this.licenseServerUrl = process.env.LICENSE_SERVER_URL || 'https://pathlicense-production.up.railway.app/';
    
    // Get unique machine ID
    this.machineId = machineIdSync();
    
    // This would be your public key for verifying signatures
    // In production, this should be embedded during build
    this.publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`;
  }

  async validateLicense(licenseKey: string): Promise<LicenseValidation> {
    try {
      // First check with license server
      const response = await axios.post(`${this.licenseServerUrl}/api/validate-license`, {
        licenseKey,
        machineId: this.machineId
      });
      
      if (!response.data.valid) {
        return {
          isValid: false,
          isExpired: false,
          error: response.data.error || 'Invalid license'
        };
      }
      
      const licenseData: LicenseData = {
        licenseKey: response.data.license.key,
        firmName: 'Licensed User', // Update based on your needs
        firmId: this.machineId,
        expirationDate: response.data.license.currentPeriodEnd,
        features: this.getFeaturesForPlan(response.data.license.planType),
        signature: 'stripe-validated', // Using Stripe validation instead of RSA
        stripeSubscriptionId: response.data.license.stripeSubscriptionId,
        planType: response.data.license.planType,
        status: response.data.license.status,
        email: response.data.license.email,
        activations: response.data.license.activations,
        maxActivations: response.data.license.maxActivations
      };
      
      // Check if in trial period
      const now = new Date();
      const trialEnd = response.data.license.trialEnd ? new Date(response.data.license.trialEnd) : null;
      const isInTrial = trialEnd && now < trialEnd;
      
      // Store the validated license
      await this.storeLicense(licenseData);
      
      const expirationDate = new Date(licenseData.expirationDate);
      const isExpired = now > expirationDate && !isInTrial;
      const daysRemaining = Math.floor((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        isValid: true,
        isExpired,
        firmName: licenseData.email || licenseData.firmName,
        daysRemaining: isExpired ? 0 : daysRemaining
      };
      
    } catch (error: any) {
      log.error('License validation error:', error);
      
      // Fallback to offline validation if server is unreachable
      const offlineValidation = await this.validateOffline();
      if (offlineValidation) {
        return offlineValidation;
      }
      
      return {
        isValid: false,
        isExpired: false,
        error: error.response?.data?.error || 'License validation failed'
      };
    }
  }
  
  private async validateOffline(): Promise<LicenseValidation | null> {
    const license = await this.getCurrentLicense();
    if (!license) return null;
    
    const now = new Date();
    const lastValidation = this.store.get('lastValidation') as string;
    const lastValidationDate = lastValidation ? new Date(lastValidation) : null;
    
    // Allow offline mode for up to 7 days
    if (lastValidationDate) {
      const daysSinceValidation = Math.floor((now.getTime() - lastValidationDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceValidation > 7) {
        return null; // Force online validation
      }
    }
    
    const expirationDate = new Date(license.expirationDate);
    const isExpired = now > expirationDate;
    const daysRemaining = Math.floor((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      isValid: true,
      isExpired,
      firmName: license.email || license.firmName,
      daysRemaining: isExpired ? 0 : daysRemaining
    };
  }
  
  async storeLicense(licenseData: LicenseData): Promise<void> {
    this.store.set('license', licenseData);
    this.store.set('lastValidation', new Date().toISOString());
    
    // Store hardware fingerprint for license binding
    const fingerprint = await this.generateHardwareFingerprint();
    this.store.set('fingerprint', fingerprint);
  }
  
  async getCurrentLicense(): Promise<LicenseData | null> {
    const license = this.store.get('license') as LicenseData | undefined;
    if (!license) return null;
    
    // Verify hardware fingerprint hasn't changed
    const storedFingerprint = this.store.get('fingerprint') as string;
    const currentFingerprint = await this.generateHardwareFingerprint();
    
    if (storedFingerprint !== currentFingerprint) {
      log.warn('Hardware fingerprint mismatch - license may have been moved');
      // In production, you might want to handle this more strictly
    }
    
    return license;
  }
  
  async checkLicenseStatus(): Promise<LicenseValidation> {
    const license = await this.getCurrentLicense();
    if (!license) {
      return {
        isValid: false,
        isExpired: false,
        error: 'No license found'
      };
    }
    
    const expirationDate = new Date(license.expirationDate);
    const now = new Date();
    const isExpired = now > expirationDate;
    const daysRemaining = Math.floor((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      isValid: true,
      isExpired,
      firmName: license.firmName,
      daysRemaining: isExpired ? 0 : daysRemaining
    };
  }
  
  private async generateHardwareFingerprint(): Promise<string> {
    // Combine various hardware identifiers
    const os = await import('os');
    const cpus = os.cpus();
    const networkInterfaces = os.networkInterfaces();
    
    const data = {
      platform: process.platform,
      arch: process.arch,
      cpuModel: cpus[0]?.model || 'unknown',
      totalMemory: os.totalmem(),
      // MAC addresses (excluding virtual interfaces)
      macs: Object.values(networkInterfaces)
        .flat()
        .filter(iface => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00')
        .map(iface => iface!.mac)
        .sort()
    };
    
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }
  
  async isFeatureEnabled(feature: string): Promise<boolean> {
    const license = await this.getCurrentLicense();
    if (!license || !license.features) return false; // No features without valid license
    return license.features.includes(feature);
  }
  
  private getFeaturesForPlan(planType: string): string[] {
    const featureMap: Record<string, string[]> = {
      trial: ['basic', 'templates', 'ai-generation', 'export-pdf', 'export-docx'],
      monthly: ['basic', 'templates', 'ai-generation', 'cloud-storage', 'export-pdf', 'export-docx', 'custom-templates', 'priority-support'],
      annual: ['basic', 'templates', 'ai-generation', 'cloud-storage', 'export-pdf', 'export-docx', 'custom-templates', 'priority-support', 'api-access']
    };
    
    return featureMap[planType] || featureMap.monthly;
  }
  
  async getLicenseInfo(): Promise<LicenseInfo> {
    const license = await this.getCurrentLicense();
    const status = await this.checkLicenseStatus();
    
    if (!license) {
      return {
        isLicensed: false
      };
    }
    
    // Get latest subscription info if available
    let subscription: SubscriptionInfo | undefined;
    if (license.stripeSubscriptionId) {
      try {
        const response = await axios.post(`${this.licenseServerUrl}/api/subscription/status`, {
          licenseKey: license.licenseKey
        });
        subscription = response.data;
      } catch (error) {
        log.error('Failed to fetch subscription status:', error);
      }
    }
    
    return {
      isLicensed: status.isValid && !status.isExpired,
      licenseKey: license.licenseKey,
      status: license.status,
      expiresAt: license.expirationDate,
      features: license.features,
      subscription,
      activations: license.activations,
      maxActivations: license.maxActivations,
      email: license.email
    };
  }
  
  async createCheckoutSession(email: string, planType: 'monthly' | 'annual'): Promise<{ sessionId?: string; url?: string; error?: string }> {
    try {
      const response = await axios.post(`${this.licenseServerUrl}/api/create-checkout-session`, {
        email,
        planType
      });
      
      return {
        sessionId: response.data.sessionId,
        url: response.data.url
      };
    } catch (error: any) {
      log.error('Failed to create checkout session:', error);
      return {
        error: error.response?.data?.error || 'Failed to create checkout session'
      };
    }
  }
  
  async getSubscriptionStatus(licenseKey: string): Promise<SubscriptionInfo | null> {
    try {
      const response = await axios.post(`${this.licenseServerUrl}/api/subscription/status`, {
        licenseKey
      });
      
      return response.data;
    } catch (error) {
      log.error('Failed to get subscription status:', error);
      return null;
    }
  }
  
  async createPortalSession(licenseKey: string): Promise<{ url?: string; error?: string }> {
    try {
      const response = await axios.post(`${this.licenseServerUrl}/api/subscription/portal-session`, {
        licenseKey
      });
      
      return {
        url: response.data.url
      };
    } catch (error: any) {
      log.error('Failed to create portal session:', error);
      return {
        error: error.response?.data?.error || 'Failed to create portal session'
      };
    }
  }
  
  // Check if license is expiring soon (within 30 days)
  async shouldShowExpirationWarning(): Promise<{ show: boolean; message?: string }> {
    const status = await this.checkLicenseStatus();
    
    if (!status.isValid) {
      return { show: false };
    }
    
    if (status.isExpired) {
      return {
        show: true,
        message: 'Your license has expired. Please contact support for renewal.'
      };
    }
    
    if (status.daysRemaining && status.daysRemaining <= 30) {
      return {
        show: true,
        message: `Your license expires in ${status.daysRemaining} days. Please contact support for renewal.`
      };
    }
    
    return { show: false };
  }
}

export const licenseService = new LicenseService();
