import React, { useState, useEffect } from 'react';
import { X, Key, Clock, CheckCircle, AlertCircle, Shield, CreditCard, Calendar, User, Mail, RefreshCw } from 'lucide-react';
import { FormInput } from './common/FormInput';
import { useStore } from '../store';
import { LicenseInfo } from '../../main/types/ipc';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ViewMode = 'activate' | 'manage';

export function LicenseModal({ isOpen, onClose, onSuccess }: LicenseModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('activate');
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const addNotification = useStore((state) => state.addNotification);
  const user = useStore((state) => state.user);
  
  // Form fields
  const [licenseKey, setLicenseKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadLicenseInfo();
    }
  }, [isOpen]);

  const loadLicenseInfo = async () => {
    try {
      const info = await window.electronAPI.getLicenseInfo();
      setLicenseInfo(info);
      
      if (info.isLicensed) {
        setViewMode('manage');
        
      }
    } catch (error) {
      console.error('Failed to load license info:', error);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await window.electronAPI.activateLicense({
        key: licenseKey
      });

      if (result.success && result.isValid) {
        addNotification('License activated successfully!', 'success');
        onSuccess?.();
        onClose();
      } else {
        setError(result.error || 'Failed to activate license');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'past_due':
        return 'text-yellow-600';
      case 'canceled':
      case 'unpaid':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusText = status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    const colorClass = getStatusColor(status);
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} bg-opacity-10 ${colorClass.replace('text', 'bg')}`}>
        {statusText}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {viewMode === 'manage' ? 'License Management' : 'Activate License'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {viewMode === 'manage' && licenseInfo?.isLicensed ? (
            <div className="space-y-6">
              {/* License Status */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-green-800">License Active</h3>
                    <div className="mt-2 space-y-1 text-sm text-green-700">
                      <p className="flex items-center">
                        <Key className="h-4 w-4 mr-2" />
                        Key: <span className="font-mono ml-1">{licenseInfo.licenseKey?.substring(0, 19)}...</span>
                      </p>
                      {licenseInfo.email && (
                        <p className="flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          Email: <span className="font-medium ml-1">{licenseInfo.email}</span>
                        </p>
                      )}
                      {licenseInfo.activations !== undefined && (
                        <p className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Activations: <span className="font-medium ml-1">{licenseInfo.activations} of {licenseInfo.maxActivations}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>


              {/* Features */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Included Features</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {licenseInfo.features?.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      {feature.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Enter License Key</h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Activate your license to unlock all features
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleActivate} className="space-y-4">
                <FormInput
                  label="License Key"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="CLERK-XXXX-XXXX-XXXX"
                  required
                  icon={<Key className="h-5 w-5 text-gray-400" />}
                />

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <p className="ml-2 text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Activating...' : 'Activate License'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}