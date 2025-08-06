#!/usr/bin/env node

const axios = require('axios');
const readline = require('readline');
const { config } = require('dotenv');

// Load environment variables
config();

const SERVER_URL = process.env.LICENSE_SERVER_URL || 'http://localhost:3001';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-secret-admin-token';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function generateLicense() {
  console.log('\n=== Generate Manual License ===\n');
  
  try {
    const email = await question('Email address: ');
    const planType = await question('Plan type (monthly/annual) [annual]: ') || 'annual';
    const expirationDays = await question('Days until expiration [365]: ') || '365';
    const notes = await question('Notes (optional): ');
    
    console.log('\nGenerating license...');
    
    const response = await axios.post(`${SERVER_URL}/api/admin/generate-license`, {
      email,
      planType,
      expirationDays: parseInt(expirationDays),
      notes
    }, {
      headers: {
        'x-admin-token': ADMIN_TOKEN
      }
    });
    
    if (response.data.success) {
      console.log('\n✅ License generated successfully!\n');
      console.log('License Key:', response.data.license.key);
      console.log('Email:', response.data.license.email);
      console.log('Plan:', response.data.license.planType);
      console.log('Expires:', new Date(response.data.license.expiresAt).toLocaleDateString());
      console.log('\nSend this key to the customer to activate in Clerk.');
    } else {
      console.error('Failed to generate license:', response.data.error);
    }
  } catch (error) {
    console.error('Error:', error.response?.data?.error || error.message);
  }
}

async function listLicenses() {
  console.log('\n=== All Licenses ===\n');
  
  try {
    const response = await axios.get(`${SERVER_URL}/api/admin/licenses`, {
      headers: {
        'x-admin-token': ADMIN_TOKEN
      }
    });
    
    const licenses = response.data.licenses;
    
    if (licenses.length === 0) {
      console.log('No licenses found.');
      return;
    }
    
    licenses.forEach((license, index) => {
      console.log(`${index + 1}. ${license.license_key}`);
      console.log(`   Email: ${license.email}`);
      console.log(`   Plan: ${license.plan_type}`);
      console.log(`   Status: ${license.status}`);
      console.log(`   Activations: ${license.activation_count}/${license.max_activations}`);
      console.log(`   Expires: ${new Date(license.current_period_end).toLocaleDateString()}`);
      console.log(`   Created: ${new Date(license.created_at).toLocaleDateString()}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.response?.data?.error || error.message);
  }
}

async function main() {
  console.log('Clerk License Admin Tool');
  console.log('========================\n');
  
  while (true) {
    console.log('\nOptions:');
    console.log('1. Generate new license');
    console.log('2. List all licenses');
    console.log('3. Exit');
    
    const choice = await question('\nSelect option (1-3): ');
    
    switch (choice) {
      case '1':
        await generateLicense();
        break;
      case '2':
        await listLicenses();
        break;
      case '3':
        console.log('\nGoodbye!');
        rl.close();
        process.exit(0);
      default:
        console.log('Invalid option. Please try again.');
    }
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\nGoodbye!');
  rl.close();
  process.exit(0);
});

main().catch(console.error);