import { useState, useEffect } from 'react';

export function useLicenseFeature(feature: string) {
  const [hasFeature, setHasFeature] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkFeature = async () => {
      if (!window.electronAPI) {
        // Development mode - allow all features
        setHasFeature(true);
        setIsChecking(false);
        return;
      }

      try {
        const result = await window.electronAPI.checkFeature(feature);
        setHasFeature(result.hasFeature);
      } catch (error) {
        console.error('Failed to check feature:', error);
        setHasFeature(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkFeature();
  }, [feature]);

  return { hasFeature, isChecking };
}