// Test script to generate a license
const https = require('https');

// REPLACE THESE WITH YOUR ACTUAL VALUES
const LICENSE_SERVER_URL = 'your-app.railway.app'; // Without https://
const ADMIN_TOKEN = 'your-admin-token-here'; // Set this in Railway env vars
const USER_EMAIL = 'test@example.com';

const data = JSON.stringify({
  email: USER_EMAIL,
  planType: 'annual',
  expirationDays: 365
});

const options = {
  hostname: LICENSE_SERVER_URL,
  port: 443,
  path: '/api/admin/generate-license',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-token': ADMIN_TOKEN,
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
    const response = JSON.parse(responseData);
    if (response.success) {
      console.log('\n=================================');
      console.log('LICENSE GENERATED SUCCESSFULLY!');
      console.log('=================================');
      console.log('Email:', response.license.email);
      console.log('License Key:', response.license.key);
      console.log('Plan Type:', response.license.planType);
      console.log('Expires:', response.license.expiresAt);
      console.log('=================================\n');
      console.log('Use this license key in your DocWriter app!');
    } else {
      console.error('Failed to generate license:', response.error);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();