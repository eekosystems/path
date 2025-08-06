// Test script to debug IPC issues
// Run this in the Electron app's console (Ctrl+Shift+I)

async function testLicenseIPC() {
  console.log('Testing License IPC Handlers...\n');
  
  // Check if electronAPI exists
  if (!window.electronAPI) {
    console.error('❌ window.electronAPI is not defined!');
    return;
  }
  console.log('✅ window.electronAPI exists');
  
  // Check if license methods exist
  const methods = [
    'getLicenseInfo',
    'activateLicense', 
    'validateLicense',
    'startTrial',
    'checkFeature'
  ];
  
  for (const method of methods) {
    if (typeof window.electronAPI[method] === 'function') {
      console.log(`✅ ${method} is defined`);
    } else {
      console.error(`❌ ${method} is NOT defined!`);
    }
  }
  
  // Try to call getLicenseInfo
  console.log('\nTesting getLicenseInfo...');
  try {
    const info = await window.electronAPI.getLicenseInfo();
    console.log('✅ getLicenseInfo successful:', info);
  } catch (error) {
    console.error('❌ getLicenseInfo failed:', error);
  }
  
  // List all available methods
  console.log('\nAll available electronAPI methods:');
  Object.keys(window.electronAPI).forEach(key => {
    console.log(`- ${key}`);
  });
}

// Run the test
testLicenseIPC();