const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Database } = require('sqlite3');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

// Database setup
const db = new Database(path.join(__dirname, 'licenses.db'));

// Initialize database tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      stripe_customer_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      stripe_subscription_id TEXT,
      status TEXT DEFAULT 'active',
      plan_type TEXT,
      trial_end DATETIME,
      current_period_end DATETIME,
      machine_ids TEXT DEFAULT '[]',
      activation_count INTEGER DEFAULT 0,
      max_activations INTEGER DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_id INTEGER,
      machine_id TEXT NOT NULL,
      activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (license_id) REFERENCES licenses(id)
    )
  `);
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'file://*'],
  credentials: true
}));

// Stripe webhook endpoint (raw body needed)
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      await handleCheckoutComplete(session);
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      await handleSubscriptionUpdate(subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await handleSubscriptionDeleted(subscription);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await handlePaymentFailed(invoice);
      break;
    }
  }

  res.json({ received: true });
});

// JSON body parser for other endpoints
app.use(express.json());

// Generate license key
function generateLicenseKey() {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return `CLERK-${segments.join('-')}`;
}

// Handle successful checkout
async function handleCheckoutComplete(session) {
  const { customer, subscription, customer_email, metadata } = session;
  
  // Get or create customer
  const customerId = await getOrCreateCustomer(customer_email, customer);
  
  // Get subscription details
  const sub = await stripe.subscriptions.retrieve(subscription);
  
  // Generate license
  const licenseKey = generateLicenseKey();
  const planType = metadata.plan_type || (sub.items.data[0].price.recurring.interval === 'year' ? 'annual' : 'monthly');
  
  // Save license to database
  db.run(`
    INSERT INTO licenses (
      license_key, customer_id, stripe_subscription_id, 
      plan_type, trial_end, current_period_end, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    licenseKey,
    customerId,
    subscription,
    planType,
    new Date(sub.trial_end * 1000).toISOString(),
    new Date(sub.current_period_end * 1000).toISOString(),
    sub.status
  ], (err) => {
    if (err) {
      console.error('Error creating license:', err);
      return;
    }
    
    // Send license key via email (implement your email service)
    sendLicenseEmail(customer_email, licenseKey);
  });
}

// Update subscription status
async function handleSubscriptionUpdate(subscription) {
  db.run(`
    UPDATE licenses 
    SET status = ?, current_period_end = ?, plan_type = ?
    WHERE stripe_subscription_id = ?
  `, [
    subscription.status,
    new Date(subscription.current_period_end * 1000).toISOString(),
    subscription.items.data[0].price.recurring.interval === 'year' ? 'annual' : 'monthly',
    subscription.id
  ]);
}

// Handle subscription cancellation
async function handleSubscriptionDeleted(subscription) {
  db.run(`
    UPDATE licenses 
    SET status = 'cancelled'
    WHERE stripe_subscription_id = ?
  `, [subscription.id]);
}

// Handle failed payments
async function handlePaymentFailed(invoice) {
  // Notify user about failed payment
  console.log('Payment failed for subscription:', invoice.subscription);
}

// Get or create customer
function getOrCreateCustomer(email, stripeCustomerId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM customers WHERE email = ?', [email], (err, row) => {
      if (err) return reject(err);
      
      if (row) {
        // Update stripe customer ID if needed
        if (stripeCustomerId) {
          db.run('UPDATE customers SET stripe_customer_id = ? WHERE id = ?', 
            [stripeCustomerId, row.id]);
        }
        resolve(row.id);
      } else {
        // Create new customer
        db.run('INSERT INTO customers (email, stripe_customer_id) VALUES (?, ?)',
          [email, stripeCustomerId], function(err) {
            if (err) return reject(err);
            resolve(this.lastID);
          });
      }
    });
  });
}

// API Endpoints

// Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  const { email, planType = 'monthly' } = req.body;
  
  try {
    const priceId = planType === 'annual' 
      ? process.env.STRIPE_ANNUAL_PRICE_ID 
      : process.env.STRIPE_MONTHLY_PRICE_ID;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.APP_URL}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}?cancelled=true`,
      customer_email: email,
      subscription_data: {
        trial_period_days: parseInt(process.env.TRIAL_PERIOD_DAYS || '7'),
        metadata: {
          plan_type: planType
        }
      },
      metadata: {
        plan_type: planType
      }
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate license
app.post('/api/validate-license', async (req, res) => {
  const { licenseKey, machineId } = req.body;
  
  db.get(`
    SELECT l.*, c.email 
    FROM licenses l
    JOIN customers c ON l.customer_id = c.id
    WHERE l.license_key = ?
  `, [licenseKey], async (err, license) => {
    if (err || !license) {
      return res.json({ valid: false, error: 'Invalid license key' });
    }
    
    // Check subscription status with Stripe
    if (license.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(license.stripe_subscription_id);
        
        // Update local status
        if (subscription.status !== license.status) {
          db.run('UPDATE licenses SET status = ? WHERE id = ?', 
            [subscription.status, license.id]);
          license.status = subscription.status;
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    }
    
    // Check if license is active
    if (license.status !== 'active' && license.status !== 'trialing') {
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
      db.run('UPDATE licenses SET machine_ids = ?, activation_count = ? WHERE id = ?',
        [JSON.stringify(machineIds), machineIds.length, license.id]);
      
      // Record activation
      db.run('INSERT INTO activations (license_id, machine_id) VALUES (?, ?)',
        [license.id, machineId]);
    } else {
      // Update last seen
      db.run('UPDATE activations SET last_seen = CURRENT_TIMESTAMP WHERE license_id = ? AND machine_id = ?',
        [license.id, machineId]);
    }
    
    res.json({
      valid: true,
      license: {
        key: license.license_key,
        status: license.status,
        planType: license.plan_type,
        trialEnd: license.trial_end,
        currentPeriodEnd: license.current_period_end,
        activations: machineIds.length,
        maxActivations: license.max_activations,
        email: license.email
      }
    });
  });
});

// Get subscription details
app.post('/api/subscription/status', async (req, res) => {
  const { licenseKey } = req.body;
  
  db.get(`
    SELECT l.*, c.email 
    FROM licenses l
    JOIN customers c ON l.customer_id = c.id
    WHERE l.license_key = ?
  `, [licenseKey], async (err, license) => {
    if (err || !license) {
      return res.status(404).json({ error: 'License not found' });
    }
    
    if (!license.stripe_subscription_id) {
      return res.json({
        status: 'no_subscription',
        license: {
          key: license.license_key,
          email: license.email
        }
      });
    }
    
    try {
      const subscription = await stripe.subscriptions.retrieve(license.stripe_subscription_id, {
        expand: ['default_payment_method', 'latest_invoice']
      });
      
      res.json({
        status: subscription.status,
        planType: license.plan_type,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        paymentMethod: subscription.default_payment_method ? {
          brand: subscription.default_payment_method.card.brand,
          last4: subscription.default_payment_method.card.last4
        } : null,
        nextInvoice: subscription.latest_invoice ? {
          amountDue: subscription.latest_invoice.amount_due / 100,
          currency: subscription.latest_invoice.currency
        } : null
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ error: 'Failed to fetch subscription details' });
    }
  });
});

// Create customer portal session
app.post('/api/subscription/portal-session', async (req, res) => {
  const { licenseKey } = req.body;
  
  db.get(`
    SELECT c.stripe_customer_id 
    FROM licenses l
    JOIN customers c ON l.customer_id = c.id
    WHERE l.license_key = ?
  `, [licenseKey], async (err, result) => {
    if (err || !result || !result.stripe_customer_id) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: result.stripe_customer_id,
        return_url: process.env.APP_URL || 'http://localhost:5173'
      });
      
      res.json({ url: session.url });
    } catch (error) {
      console.error('Error creating portal session:', error);
      res.status(500).json({ error: 'Failed to create portal session' });
    }
  });
});

// Admin endpoints (protect these in production!)
app.post('/api/admin/generate-license', async (req, res) => {
  const { email, planType = 'annual', notes, expirationDays = 365 } = req.body;
  
  // In production, add authentication here
  const adminToken = req.headers['x-admin-token'];
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Check if customer exists
    const customerId = await getOrCreateCustomer(email, null);
    
    // Generate license
    const licenseKey = generateLicenseKey();
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    
    // Save license to database
    db.run(`
      INSERT INTO licenses (
        license_key, customer_id, stripe_subscription_id, 
        plan_type, trial_end, current_period_end, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      licenseKey,
      customerId,
      'manual-' + Date.now(), // Manual license indicator
      planType,
      null, // No trial for manual licenses
      expirationDate.toISOString(),
      'active'
    ], (err) => {
      if (err) {
        console.error('Error creating license:', err);
        return res.status(500).json({ error: 'Failed to create license' });
      }
      
      // Log the license generation
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
    });
  } catch (error) {
    console.error('Error generating license:', error);
    res.status(500).json({ error: 'Failed to generate license' });
  }
});

// Get all licenses (admin endpoint)
app.get('/api/admin/licenses', async (req, res) => {
  const adminToken = req.headers['x-admin-token'];
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  db.all(`
    SELECT l.*, c.email 
    FROM licenses l
    JOIN customers c ON l.customer_id = c.id
    ORDER BY l.created_at DESC
  `, (err, licenses) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch licenses' });
    }
    
    res.json({ licenses });
  });
});

// Mock email function (implement with your email service)
function sendLicenseEmail(email, licenseKey) {
  console.log(`
    ===================================
    License Email (implement email service)
    To: ${email}
    Subject: Your Clerk License Key
    
    Thank you for subscribing to Clerk!
    
    Your license key is: ${licenseKey}
    
    To activate:
    1. Open Clerk
    2. Go to Settings > License
    3. Enter your license key
    
    Your 7-day free trial starts now.
    ===================================
  `);
}

app.listen(PORT, () => {
  console.log(`License server running on port ${PORT}`);
  console.log('Make sure to set these environment variables:');
  console.log('- STRIPE_SECRET_KEY');
  console.log('- STRIPE_WEBHOOK_SECRET');
  console.log('- STRIPE_MONTHLY_PRICE_ID');
  console.log('- STRIPE_ANNUAL_PRICE_ID');
  console.log('- APP_URL');
});