# License Server Setup Guide

This guide will help you set up a license server for Clerk to manage licenses and activations.

## Quick Start Options

### Option 1: Deploy to Vercel (Recommended)

1. Create a new GitHub repository and upload `license-server-example.js`

2. Create `package.json`:
```json
{
  "name": "clerk-license-server",
  "version": "1.0.0",
  "scripts": {
    "start": "node license-server-example.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
```

3. Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "license-server-example.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/license-server-example.js"
    }
  ]
}
```

4. Deploy to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Deploy automatically

5. Update your Clerk app's `.env`:
```
LICENSE_SERVER_URL=https://your-app.vercel.app
```

### Option 2: Deploy to Heroku

1. Create `Procfile`:
```
web: node license-server-example.js
```

2. Deploy:
```bash
heroku create your-clerk-license-server
git push heroku main
```

### Option 3: Self-Host with Docker

1. Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "license-server-example.js"]
```

2. Build and run:
```bash
docker build -t clerk-license-server .
docker run -p 3001:3001 clerk-license-server
```

## Production Setup

### 1. Database Integration

Replace the in-memory storage with a real database:

```javascript
// PostgreSQL example
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Replace Map operations with database queries
async function getLicense(key) {
  const result = await pool.query(
    'SELECT * FROM licenses WHERE key = $1',
    [key]
  );
  return result.rows[0];
}
```

### 2. Authentication

Protect admin endpoints:

```javascript
// Add admin authentication middleware
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization;
  if (token !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.post('/api/licenses/create', adminAuth, (req, res) => {
  // ... create license
});
```

### 3. Environment Variables

Create `.env` file:
```
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/licenses
ADMIN_TOKEN=your-secret-admin-token
CORS_ORIGIN=https://your-electron-app.com
```

### 4. Add Monitoring

```javascript
// Add logging
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log all activations
app.post('/api/activate', (req, res) => {
  logger.info('License activation attempt', { 
    key: req.body.key,
    machineId: req.body.machineId 
  });
  // ... rest of code
});
```

## License Management

### Creating Licenses

Use curl or a tool like Postman to create licenses:

```bash
curl -X POST https://your-server.com/api/licenses/create \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "name": "John Doe",
    "type": "professional",
    "seats": 5,
    "expiryDays": 365
  }'
```

### Monitoring Usage

Add endpoints to monitor license usage:

```javascript
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  const stats = {
    totalLicenses: licenses.size,
    activeTrials: Array.from(licenses.values())
      .filter(l => l.type === 'trial').length,
    totalActivations: activations.size
  };
  res.json(stats);
});
```

## Integration with Payment Systems

### Stripe Integration Example

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/purchase', async (req, res) => {
  const { paymentMethodId, email, name, licenseType } = req.body;
  
  try {
    // Create payment
    const payment = await stripe.paymentIntents.create({
      amount: getPriceByType(licenseType),
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true
    });
    
    if (payment.status === 'succeeded') {
      // Create license
      const license = await createLicense(email, name, licenseType);
      
      // Send license key via email
      await sendLicenseEmail(email, license.key);
      
      res.json({ success: true, licenseKey: license.key });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Security Best Practices

1. **Use HTTPS**: Always use SSL/TLS in production
2. **Rate Limiting**: Prevent abuse
   ```javascript
   const rateLimit = require('express-rate-limit');
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   app.use('/api/', limiter);
   ```

3. **Input Validation**: Validate all inputs
   ```javascript
   const { body, validationResult } = require('express-validator');
   
   app.post('/api/activate',
     body('key').isLength({ min: 10 }),
     body('email').isEmail(),
     body('machineId').isAlphanumeric(),
     (req, res) => {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
         return res.status(400).json({ errors: errors.array() });
       }
       // ... rest of code
     }
   );
   ```

4. **Backup**: Regular database backups
5. **Monitoring**: Use services like Sentry or LogRocket

## Testing

Create a test script:

```javascript
// test-license-server.js
const axios = require('axios');

async function testServer() {
  const baseURL = 'http://localhost:3001/api';
  
  // Test trial
  console.log('Testing trial creation...');
  const trial = await axios.post(`${baseURL}/trial`, {
    email: 'test@example.com',
    name: 'Test User',
    machineId: 'test-machine-123'
  });
  console.log('Trial:', trial.data);
  
  // Test activation
  console.log('Testing activation...');
  const activation = await axios.post(`${baseURL}/activate`, {
    key: 'TEST-1234-5678-ABCD',
    email: 'test@example.com',
    name: 'Test User',
    machineId: 'test-machine-456'
  });
  console.log('Activation:', activation.data);
}

testServer().catch(console.error);
```

## Support

For questions or issues:
1. Check the logs
2. Verify environment variables
3. Test with the provided test script
4. Contact support@clerk.app