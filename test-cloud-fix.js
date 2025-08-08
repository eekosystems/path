// Test script to verify and fix cloud connection issues
const keytar = require('keytar');

const SERVICE_NAME = 'clerk-app';

async function clearAllCloudTokens() {
  console.log('Clearing all cloud service tokens...');
  
  try {
    const allCreds = await keytar.findCredentials(SERVICE_NAME);
    console.log(`Found ${allCreds.length} stored credentials`);
    
    for (const cred of allCreds) {
      if (cred.account.includes('onedrive') || 
          cred.account.includes('google') || 
          cred.account.includes('dropbox')) {
        console.log(`Deleting: ${cred.account}`);
        await keytar.deletePassword(SERVICE_NAME, cred.account);
      }
    }
    
    console.log('All cloud tokens cleared successfully');
    console.log('\nYou can now try connecting to cloud services again.');
    console.log('\nMake sure you have added these redirect URIs to your OAuth apps:');
    console.log('- Google: http://localhost:54321/callback');
    console.log('- Dropbox: http://localhost:54321/callback');
    console.log('- OneDrive: http://localhost:54321/callback');
    
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
}

clearAllCloudTokens();