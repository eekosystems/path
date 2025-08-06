// Debug script to test Google Drive connection
// Run this in the Electron dev console to debug

async function debugGoogleDrive() {
  console.log('=== Starting Google Drive Debug ===');
  
  // Check if API is available
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    return;
  }
  
  // Check authentication
  const authCheck = await window.electronAPI.checkAuth();
  console.log('Auth status:', authCheck);
  
  if (!authCheck.success) {
    console.error('Not authenticated');
    return;
  }
  
  // Try to fetch files
  console.log('Attempting to fetch Google Drive files...');
  const result = await window.electronAPI.fetchGoogleDriveFiles();
  console.log('Fetch result:', result);
  
  if (result.success) {
    console.log('Files found:', result.files?.length || 0);
    console.log('File details:', result.files);
  } else {
    console.error('Fetch failed:', result.error);
  }
  
  // Check store state
  const storeState = await window.electronAPI.getStoreData('appState');
  console.log('Cloud connections:', storeState?.cloudConnections);
  console.log('Available files:', storeState?.availableFiles);
}

// Run the debug function
debugGoogleDrive();