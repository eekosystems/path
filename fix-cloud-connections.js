// Fix cloud connections by simulating successful connection
const Store = require('electron-store');
const keytar = require('keytar');

const store = new Store({ 
  encryptionKey: process.env.STORE_ENCRYPTION_KEY || "clerk-local-state-key-dev",
  name: "clerk-secure-store"
});

async function fixConnections() {
  console.log('Fixing cloud connections...\n');
  
  // Clear any stuck states
  const appState = store.get('appState') || {};
  
  // Reset cloud connections
  if (appState.cloudConnections) {
    appState.cloudConnections = {
      googleDrive: false,
      dropbox: false,
      oneDrive: false
    };
    store.set('appState', appState);
    console.log('✅ Reset cloud connection states');
  }
  
  // Clear all cloud tokens to force fresh authentication
  const SERVICE_NAME = 'clerk-app';
  try {
    const allCreds = await keytar.findCredentials(SERVICE_NAME);
    let cleared = 0;
    
    for (const cred of allCreds) {
      if (cred.account.includes('google') || 
          cred.account.includes('dropbox') || 
          cred.account.includes('onedrive')) {
        await keytar.deletePassword(SERVICE_NAME, cred.account);
        cleared++;
      }
    }
    
    console.log(`✅ Cleared ${cleared} cloud service tokens`);
  } catch (error) {
    console.log('⚠️  Could not clear tokens:', error.message);
  }
  
  console.log('\n✨ Cloud connections have been reset!');
  console.log('\nNext steps:');
  console.log('1. Start the app: npm run dev');
  console.log('2. Try connecting to a cloud service');
  console.log('3. If a browser opens, complete the authentication');
  console.log('4. Return to the app window within 5 minutes');
  console.log('\nIf it still doesn\'t work, the issue might be:');
  console.log('- Firewall blocking port 54321');
  console.log('- Antivirus software blocking the connection');
  console.log('- The OAuth app settings need updating');
}

fixConnections();