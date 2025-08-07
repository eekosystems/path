// Bulk license generator
const https = require('https');

// CONFIGURATION
const LICENSE_SERVER_URL = 'your-app.railway.app'; // Without https://
const ADMIN_TOKEN = 'your-admin-token-here';

// List of users to generate licenses for
const USERS = [
  { email: 'user1@example.com', planType: 'annual' },
  { email: 'user2@example.com', planType: 'monthly' },
  { email: 'user3@example.com', planType: 'annual' },
];

const generatedLicenses = [];

async function generateLicense(userData) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: userData.email,
      planType: userData.planType,
      expirationDays: userData.planType === 'annual' ? 365 : 30
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
        const response = JSON.parse(responseData);
        if (response.success) {
          resolve(response.license);
        } else {
          reject(new Error(response.error || 'Failed to generate license'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function generateAllLicenses() {
  console.log('Starting bulk license generation...\n');
  
  for (const user of USERS) {
    try {
      console.log(`Generating license for ${user.email}...`);
      const license = await generateLicense(user);
      generatedLicenses.push(license);
      console.log(`✓ Success: ${license.key}\n`);
    } catch (error) {
      console.error(`✗ Failed for ${user.email}: ${error.message}\n`);
    }
  }
  
  // Output all licenses in CSV format
  console.log('\n=================================');
  console.log('ALL GENERATED LICENSES (CSV Format):');
  console.log('=================================');
  console.log('Email,License Key,Plan Type,Expires At');
  generatedLicenses.forEach(license => {
    console.log(`${license.email},${license.key},${license.planType},${license.expiresAt}`);
  });
  
  // Save to file
  const fs = require('fs');
  const csv = 'Email,License Key,Plan Type,Expires At\n' + 
    generatedLicenses.map(l => `${l.email},${l.key},${l.planType},${l.expiresAt}`).join('\n');
  
  fs.writeFileSync('generated-licenses.csv', csv);
  console.log('\n✓ Licenses saved to generated-licenses.csv');
}

generateAllLicenses();