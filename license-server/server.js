const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

// PostgreSQL Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        stripe_customer_id TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id SERIAL PRIMARY KEY,
        license_key TEXT UNIQUE NOT NULL,
        customer_id INTEGER,
        stripe_subscription_id TEXT,
        status TEXT DEFAULT 'active',
        expiration_date TIMESTAMP,
        machine_ids TEXT DEFAULT '[]',
        activation_count INTEGER DEFAULT 0,
        max_activations INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS activations (
        id SERIAL PRIMARY KEY,
        license_id INTEGER,
        machine_id TEXT NOT NULL,
        activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (license_id) REFERENCES licenses(id)
      )
    `);
    
    console.log('PostgreSQL database tables initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// Initialize database on startup
initDatabase();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));

// Serve static files (for admin panel)
app.use(express.static(__dirname));

// JSON body parser
app.use(express.json());

// Generate license key
function generateLicenseKey() {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return `CLERK-${segments.join('-')}`;
}

// Get or create customer
async function getOrCreateCustomer(email, stripeCustomerId) {
  try {
    const result = await pool.query('SELECT id FROM customers WHERE email = $1', [email]);
    
    if (result.rows.length > 0) {
      if (stripeCustomerId) {
        await pool.query('UPDATE customers SET stripe_customer_id = $1 WHERE id = $2', 
          [stripeCustomerId, result.rows[0].id]);
      }
      return result.rows[0].id;
    } else {
      const insertResult = await pool.query(
        'INSERT INTO customers (email, stripe_customer_id) VALUES ($1, $2) RETURNING id',
        [email, stripeCustomerId]
      );
      return insertResult.rows[0].id;
    }
  } catch (err) {
    console.error('Error in getOrCreateCustomer:', err);
    throw err;
  }
}

// API Endpoints

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', database: pool ? 'connected' : 'disconnected' });
});

// Deactivate license
app.post('/api/deactivate-license', async (req, res) => {
  const { licenseKey, machineId } = req.body;
  
  try {
    // Find the license
    const result = await pool.query(
      'SELECT * FROM licenses WHERE license_key = $1',
      [licenseKey]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Invalid license key' });
    }
    
    const license = result.rows[0];
    const machineIds = JSON.parse(license.machine_ids || '[]');
    
    // Remove the machine ID from the list
    const updatedMachineIds = machineIds.filter(id => id !== machineId);
    
    if (machineIds.length === updatedMachineIds.length) {
      return res.json({ 
        success: false, 
        error: 'This machine was not activated with this license' 
      });
    }
    
    // Update the license with the new machine list
    await pool.query(
      'UPDATE licenses SET machine_ids = $1, activation_count = $2 WHERE id = $3',
      [JSON.stringify(updatedMachineIds), updatedMachineIds.length, license.id]
    );
    
    // Remove activation record
    await pool.query(
      'DELETE FROM activations WHERE license_id = $1 AND machine_id = $2',
      [license.id, machineId]
    );
    
    res.json({
      success: true,
      message: 'License deactivated successfully',
      remainingActivations: license.max_activations - updatedMachineIds.length
    });
  } catch (err) {
    console.error('Error deactivating license:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate license
app.post('/api/validate-license', async (req, res) => {
  const { licenseKey, machineId } = req.body;
  
  try {
    const result = await pool.query(`
      SELECT l.*, c.email 
      FROM licenses l
      JOIN customers c ON l.customer_id = c.id
      WHERE l.license_key = $1
    `, [licenseKey]);
    
    if (result.rows.length === 0) {
      return res.json({ valid: false, error: 'Invalid license key' });
    }
    
    const license = result.rows[0];
    
    // Check if license is active
    if (license.status !== 'active') {
      return res.json({ 
        valid: false, 
        error: 'License is not active',
        status: license.status 
      });
    }
    
    // Check machine activation
    const machineIds = JSON.parse(license.machine_ids || '[]');
    
    if (!machineIds.includes(machineId)) {
      if (machineIds.length >= license.max_activations) {
        return res.json({ 
          valid: false, 
          error: `Maximum activations (${license.max_activations}) reached` 
        });
      }
      
      // Add new machine
      machineIds.push(machineId);
      await pool.query('UPDATE licenses SET machine_ids = $1, activation_count = $2 WHERE id = $3',
        [JSON.stringify(machineIds), machineIds.length, license.id]);
      
      // Record activation
      await pool.query('INSERT INTO activations (license_id, machine_id) VALUES ($1, $2)',
        [license.id, machineId]);
    } else {
      // Update last seen
      await pool.query('UPDATE activations SET last_seen = CURRENT_TIMESTAMP WHERE license_id = $1 AND machine_id = $2',
        [license.id, machineId]);
    }
    
    res.json({
      valid: true,
      license: {
        key: license.license_key,
        status: license.status,
        expirationDate: license.expiration_date,
        activations: machineIds.length,
        maxActivations: license.max_activations,
        email: license.email
      }
    });
  } catch (err) {
    console.error('Error validating license:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoints
app.post('/api/admin/generate-license', async (req, res) => {
  const { email, planType = 'annual', notes, expirationDays = 365 } = req.body;
  
  // Check for admin token if set
  const adminToken = req.headers['x-admin-token'];
  if (process.env.ADMIN_TOKEN && adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const customerId = await getOrCreateCustomer(email, null);
    
    const licenseKey = generateLicenseKey();
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    
    await pool.query(`
      INSERT INTO licenses (
        license_key, customer_id, email, 
        expiration_date, status
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      licenseKey,
      customerId,
      'manual-' + Date.now(),
      planType,
      null,
      expirationDate,
      'active'
    ]);
    
    console.log(`
      ===================================
      MANUAL LICENSE GENERATED
      Email: ${email}
      License Key: ${licenseKey}
      Plan: ${planType}
      Expires: ${expirationDate.toISOString()}
      Notes: ${notes || 'N/A'}
      ===================================
    `);
    
    res.json({
      success: true,
      license: {
        key: licenseKey,
        email: email,
        planType: planType,
        expiresAt: expirationDate.toISOString(),
        notes: notes
      }
    });
  } catch (error) {
    console.error('Error generating license:', error);
    res.status(500).json({ error: 'Failed to generate license' });
  }
});

// Get all licenses
app.get('/api/admin/licenses', async (req, res) => {
  const adminToken = req.headers['x-admin-token'];
  if (process.env.ADMIN_TOKEN && adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await pool.query(`
      SELECT l.*, c.email 
      FROM licenses l
      JOIN customers c ON l.customer_id = c.id
      ORDER BY l.created_at DESC
    `);
    
    res.json({ licenses: result.rows });
  } catch (err) {
    console.error('Error fetching licenses:', err);
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>DocWriter License Server</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .status { color: green; font-weight: bold; }
        ul { line-height: 1.8; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <h1>DocWriter License Server</h1>
      <p class="status">✓ Server is running on port ${PORT}</p>
      <h2>API Endpoints:</h2>
      <ul>
        <li><code>POST /api/validate-license</code> - Validate a license key</li>
        <li><code>POST /api/admin/generate-license</code> - Generate new license (requires admin token)</li>
        <li><code>GET /api/admin/licenses</code> - List all licenses (requires admin token)</li>
        <li><code>GET /api/health</code> - Health check</li>
      </ul>
      <h2>Quick Test:</h2>
      <p>Generate a license using curl:</p>
      <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">
curl -X POST ${process.env.APP_URL || 'http://localhost:' + PORT}/api/admin/generate-license \\
  -H "Content-Type: application/json" \\
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \\
  -d '{"email":"test@example.com","planType":"annual"}'
      </pre>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`License server running on port ${PORT}`);
  console.log('PostgreSQL database connected');
  console.log('Environment variables status:');
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Not set');
  console.log('- ADMIN_TOKEN:', process.env.ADMIN_TOKEN ? '✓ Set' : '✗ Not set (optional)');
});