# Clerk License Server with Stripe Integration

This server handles license management and Stripe subscription integration for the Clerk application.

## Setup Instructions

### 1. Install Dependencies

```bash
cd license-server
npm install
```

### 2. Create Stripe Products

1. Log into your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Products** and create a new product called "Clerk Professional"
3. Add two prices:
   - **Monthly**: $65/month (recurring)
   - **Annual**: $540/year (recurring)
4. Save the price IDs (they look like `price_1234567890`)

### 3. Configure Webhooks

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Add endpoint: `https://your-server.com/webhook/stripe`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the webhook signing secret

### 4. Environment Setup

Create a `.env` file in the license-server directory:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id
STRIPE_ANNUAL_PRICE_ID=price_your_annual_price_id

# App Configuration
APP_URL=http://localhost:5173
PORT=3001

# JWT Secret for API authentication
JWT_SECRET=your_jwt_secret_key_here
```

### 5. Run the Server

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### Create Checkout Session
```
POST /api/create-checkout-session
Body: { email: string, planType: 'monthly' | 'annual' }
```

### Validate License
```
POST /api/validate-license
Body: { licenseKey: string, machineId: string }
```

### Get Subscription Status
```
POST /api/subscription/status
Body: { licenseKey: string }
```

### Create Portal Session
```
POST /api/subscription/portal-session
Body: { licenseKey: string }
```

## Testing Stripe Integration

1. Use Stripe test mode with test API keys
2. Test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
3. Test webhook events using Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3001/webhook/stripe
   ```

## Database Schema

The server uses SQLite with the following tables:

- **customers**: Stores customer email and Stripe customer ID
- **licenses**: Stores license keys, subscription info, and activation details
- **activations**: Tracks machine-specific activations

## License Key Format

License keys are generated in the format: `CLERK-XXXX-XXXX-XXXX`

## Production Deployment

1. Use HTTPS for the server
2. Set up proper CORS origins
3. Use environment variables for all secrets
4. Set up database backups
5. Monitor webhook failures
6. Implement rate limiting

## Manual License Generation

You have three ways to generate licenses manually:

### 1. Web Admin Panel (Recommended)
Open `admin-panel.html` in a browser:
1. Enter your server URL and admin token
2. Fill in the license details
3. Click "Generate License"
4. Copy the license key to send to your customer

### 2. Command Line Tool
```bash
node admin-tool.js
```
Follow the prompts to generate licenses or view existing ones.

### 3. Direct API Call
```bash
curl -X POST http://localhost:3001/api/admin/generate-license \
  -H "Content-Type: application/json" \
  -H "x-admin-token: your_admin_token" \
  -d '{
    "email": "customer@example.com",
    "planType": "annual",
    "expirationDays": 365,
    "notes": "Special promotion"
  }'
```

## Manual License Features

- **No Stripe Required**: Perfect for special deals, beta testers, or offline sales
- **Custom Expiration**: Set any expiration period (default 365 days)
- **Plan Types**: Support both monthly and annual plans
- **Notes Field**: Track why the license was issued
- **Same Features**: Manual licenses have the same features as Stripe-generated ones

## Security

Always protect your admin token! In production:
1. Use a strong, random admin token
2. Restrict access to admin endpoints by IP
3. Use HTTPS for all API calls
4. Consider adding additional authentication layers

## Troubleshooting

### License not activating
- Check server logs for validation errors
- Verify machine ID is being sent correctly
- Check if maximum activations reached

### Webhook failures
- Verify webhook secret is correct
- Check server logs for signature verification errors
- Ensure server is accessible from Stripe

### Subscription status not updating
- Check if webhooks are properly configured
- Verify Stripe API keys are correct
- Look for failed webhook events in Stripe dashboard