# Clerk Licensing Implementation Guide

## Overview

The licensing system for Clerk includes:
- License key generation and validation
- Machine fingerprinting for activation
- Feature gating based on license type
- Trial period support
- Offline validation with periodic online verification

## License Types & Features

### Trial (7 days)
- Basic features
- Document templates
- AI generation
- Limited to 50 letters
- Credit card required (charged after trial)

### Standard ($99/user/month)
- All Trial features
- Cloud storage integration
- PDF & Word export
- Unlimited letters

### Professional ($149/user/month)
- All Standard features
- Custom templates
- Priority support
- Advanced AI models

### Enterprise ($249/user/month)
- All Professional features
- API access
- White labeling
- SLA guarantee

## Implementation

### 1. Check License on App Start

The app automatically checks for a valid license after login:

```typescript
// In App.tsx
useEffect(() => {
  const checkLicense = async () => {
    const licenseInfo = await window.electronAPI.getLicenseInfo();
    if (!licenseInfo.isLicensed) {
      setShowLicenseModal(true);
    }
  };
  checkLicense();
}, []);
```

### 2. Feature Gating

Use the `useLicenseFeature` hook to check if a feature is available:

```typescript
import { useLicenseFeature } from '../hooks/useLicenseFeature';

function CloudStoragePanel() {
  const { hasFeature, isChecking } = useLicenseFeature('cloud-storage');
  
  if (isChecking) return <LoadingSpinner />;
  
  if (!hasFeature) {
    return (
      <div className="p-4 bg-gray-100 rounded">
        <p>Cloud storage requires a Standard license or higher.</p>
        <button onClick={() => setShowLicenseModal(true)}>
          Upgrade Now
        </button>
      </div>
    );
  }
  
  // Show cloud storage UI
  return <CloudStorageUI />;
}
```

### 3. Restrict Actions

Check features before allowing actions:

```typescript
const handleExportPDF = async () => {
  // Check if user has export feature
  const { hasFeature } = await window.electronAPI.checkFeature('export-pdf');
  
  if (!hasFeature) {
    store.addNotification(
      'PDF export requires a Standard license or higher',
      'warning'
    );
    setShowLicenseModal(true);
    return;
  }
  
  // Proceed with export
  await exportToPDF();
};
```

### 4. License Management UI

Users can manage their license from Settings:

1. View current license status
2. See days remaining
3. Upgrade or renew
4. Start a free trial

## API Integration

### Activating a License

```typescript
const activateLicense = async (key: string) => {
  const result = await window.electronAPI.activateLicense({
    key,
    email: user.email,
    name: user.name
  });
  
  if (result.isValid) {
    console.log('License activated!');
  } else {
    console.error('Activation failed:', result.error);
  }
};
```

### Starting a Trial

```typescript
const startTrial = async () => {
  const result = await window.electronAPI.startTrial({
    email: user.email,
    name: user.name
  });
  
  if (result.isValid) {
    console.log('Trial started for 14 days');
  }
};
```

## License Server Setup

1. Deploy the provided `license-server-example.js`
2. Set `LICENSE_SERVER_URL` in your `.env`
3. Generate license keys using the admin API
4. Distribute keys to customers

## Security Considerations

1. **Machine Binding**: Licenses are tied to machine IDs
2. **Offline Grace Period**: App works offline for 7 days
3. **Tamper Detection**: License data is encrypted
4. **Rate Limiting**: Prevents activation abuse

## Testing

### Development Mode
- All features are enabled by default
- No license checks in browser mode

### Test License
Use this test key for development:
```
TEST-1234-5678-ABCD
```

### Simulating License States

```typescript
// Force show license modal
setShowLicenseModal(true);

// Test expired license
const mockExpiredLicense = {
  isLicensed: true,
  type: 'standard',
  expiresAt: '2023-01-01',
  daysRemaining: -30
};
```

## Distribution

### For Direct Sales
1. Customer purchases on your website
2. Generate license key via admin API
3. Email key to customer
4. Customer activates in app

### For App Stores
1. Use in-app purchases
2. Validate receipt server-side
3. Generate and activate license automatically

## Troubleshooting

### "License already activated on another machine"
- Each license has a seat limit
- Deactivate on old machine first
- Or purchase additional seats

### "Failed to connect to license server"
- Check internet connection
- Verify LICENSE_SERVER_URL
- App continues working offline for 7 days

### "Invalid license key"
- Verify key format: XXXX-XXXX-XXXX-XXXX
- Check for typos
- Ensure key hasn't expired

## Revenue Tracking

Track these metrics:
- Monthly Recurring Revenue (MRR)
- License activation rate
- Trial-to-paid conversion
- Churn rate
- Feature usage by license type

## Support

For license issues:
1. Check license status in Settings
2. Verify with `license-debug.js` tool
3. Contact support@clerk.app with:
   - License key (first 4 characters)
   - Error message
   - Machine ID