// Simple License Server Example
// Deploy this to Vercel, Netlify Functions, or any Node.js hosting

const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In production, use a real database (PostgreSQL, MongoDB, etc.)
const licenses = new Map();
const activations = new Map();

// Helper to generate license keys
function generateLicenseKey() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('sha256')
    .update(`${timestamp}-${random}`)
    .digest('hex')
    .substring(0, 8);
  
  return `${hash.toUpperCase()}-${random.substring(0, 4).toUpperCase()}-${random.substring(4, 8).toUpperCase()}-${timestamp.toUpperCase()}`;
}

// Create a new license (admin endpoint - protect this!)
app.post('/api/licenses/create', (req, res) => {
  const { email, name, type, seats = 1, expiryDays = 365 } = req.body;
  
  const key = generateLicenseKey();
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  
  const license = {
    key,
    email,
    name,
    type, // 'standard', 'professional', 'enterprise'
    seats,
    activations: 0,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    features: getFeaturesByType(type)
  };
  
  licenses.set(key, license);
  
  res.json({ success: true, license });
});

// Activate a license
app.post('/api/activate', (req, res) => {
  const { key, email, name, machineId } = req.body;
  
  const license = licenses.get(key);
  
  if (!license) {
    return res.status(404).json({ 
      success: false, 
      error: 'Invalid license key' 
    });
  }
  
  // Check if expired
  if (new Date(license.expiresAt) < new Date()) {
    return res.status(410).json({ 
      success: false, 
      error: 'License has expired' 
    });
  }
  
  // Check if already activated on this machine
  const existingActivation = activations.get(`${key}-${machineId}`);
  if (existingActivation) {
    return res.json({ 
      success: true, 
      license: {
        ...license,
        machineId,
        activatedAt: existingActivation.activatedAt
      }
    });
  }
  
  // Check seat limit
  const keyActivations = Array.from(activations.values())
    .filter(a => a.licenseKey === key);
  
  if (keyActivations.length >= license.seats) {
    return res.status(409).json({ 
      success: false, 
      error: 'License seat limit reached' 
    });
  }
  
  // Activate the license
  const activation = {
    licenseKey: key,
    machineId,
    email,
    name,
    activatedAt: new Date().toISOString()
  };
  
  activations.set(`${key}-${machineId}`, activation);
  license.activations += 1;
  
  res.json({
    success: true,
    license: {
      ...license,
      machineId,
      activatedAt: activation.activatedAt
    }
  });
});

// Verify a license
app.post('/api/verify', (req, res) => {
  const { key, machineId } = req.body;
  
  const license = licenses.get(key);
  const activation = activations.get(`${key}-${machineId}`);
  
  if (!license || !activation) {
    return res.json({ 
      valid: false, 
      reason: 'License not found or not activated' 
    });
  }
  
  if (new Date(license.expiresAt) < new Date()) {
    return res.json({ 
      valid: false, 
      reason: 'License has expired' 
    });
  }
  
  res.json({ valid: true });
});

// Start a trial
app.post('/api/trial', (req, res) => {
  const { email, name, machineId } = req.body;
  
  // Check if trial already exists for this machine
  const existingTrial = Array.from(licenses.values())
    .find(l => l.type === 'trial' && 
      Array.from(activations.values())
        .some(a => a.licenseKey === l.key && a.machineId === machineId)
    );
  
  if (existingTrial) {
    return res.json({
      success: false,
      error: 'Trial already used on this machine'
    });
  }
  
  // Create trial license
  const key = 'TRIAL-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
  
  const license = {
    key,
    email,
    name,
    type: 'trial',
    seats: 1,
    activations: 1,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    features: ['basic', 'templates', 'ai-generation'],
    machineId,
    activatedAt: new Date().toISOString()
  };
  
  licenses.set(key, license);
  activations.set(`${key}-${machineId}`, {
    licenseKey: key,
    machineId,
    email,
    name,
    activatedAt: license.activatedAt
  });
  
  res.json({ success: true, license });
});

// Helper function
function getFeaturesByType(type) {
  const features = {
    trial: ['basic', 'templates', 'ai-generation'],
    standard: ['basic', 'templates', 'ai-generation', 'cloud-storage', 'export-pdf'],
    professional: [
      'basic', 'templates', 'ai-generation', 'cloud-storage', 
      'export-pdf', 'custom-templates', 'priority-support'
    ],
    enterprise: [
      'basic', 'templates', 'ai-generation', 'cloud-storage', 
      'export-pdf', 'custom-templates', 'priority-support', 
      'api-access', 'white-label'
    ]
  };
  
  return features[type] || features.standard;
}

// Example: Initialize with some test licenses
if (process.env.NODE_ENV !== 'production') {
  // Test license
  const testKey = 'TEST-1234-5678-ABCD';
  licenses.set(testKey, {
    key: testKey,
    email: 'test@example.com',
    name: 'Test User',
    type: 'professional',
    seats: 3,
    activations: 0,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    features: getFeaturesByType('professional')
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`License server running on port ${PORT}`);
});

// For Vercel deployment, export the app
module.exports = app;