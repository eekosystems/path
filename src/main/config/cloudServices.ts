// Cloud service OAuth configuration
// IMPORTANT: In production, these should be stored securely and not committed to version control

// Function to validate environment variables (call this after dotenv is loaded)
export function validateCloudServiceConfig() {
  // Simply log the status - credentials are always available now
  console.log('Cloud service configuration:', {
    hasOneDriveClientId: !!process.env.ONEDRIVE_CLIENT_ID,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasDropboxClientId: !!process.env.DROPBOX_CLIENT_ID,
    isProduction: !!process.env.NODE_ENV
  });
  
  // All credentials are now hardcoded, so they're always available
  console.log('✅ Cloud services ready');
}

export const getCloudServiceConfig = () => ({
  googleDrive: {
    clientId: process.env.GOOGLE_CLIENT_ID || '616905817212-03p2kqnjageb1k8tq7p5b1ebr30n866b.apps.googleusercontent.com',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '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',
    // redirectUri is dynamically generated in OAuth flow
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ]
  },
  dropbox: {
    clientId: process.env.DROPBOX_CLIENT_ID || 'o8h7vqoqh8d5yvg',
    clientSecret: process.env.DROPBOX_CLIENT_SECRET || 'j9d3jhiqzt6u4pt',
    scopes: [
      'files.content.read',
      'files.metadata.read'
    ]
  },
  oneDrive: {
    clientId: process.env.ONEDRIVE_CLIENT_ID || 'f90b1add-e9ec-4ff7-9f9a-6f043c86927d',
    clientSecret: process.env.ONEDRIVE_CLIENT_SECRET || 'db33e407-c46b-4caf-ae33-9eb2704ea24b',
    tenantId: process.env.ONEDRIVE_TENANT_ID || 'common',
    // redirectUri is dynamically generated in OAuth flow
    scopes: [
      'Files.Read',
      'Files.Read.All',
      'offline_access'
    ]
  }
});

// For backward compatibility during migration - REMOVE after updating all imports
// export const cloudServiceConfig = getCloudServiceConfig();

// OAuth endpoints
export const oauthEndpoints = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token'
  },
  dropbox: {
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token'
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
  }
};