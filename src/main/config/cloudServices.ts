// Cloud service OAuth configuration
// IMPORTANT: In production, these should be stored securely and not committed to version control

// Function to validate environment variables (call this after dotenv is loaded)
export function validateCloudServiceConfig() {
  const requiredEnvVars = {
    ONEDRIVE_CLIENT_ID: process.env.ONEDRIVE_CLIENT_ID,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    DROPBOX_CLIENT_ID: process.env.DROPBOX_CLIENT_ID
  };

  console.log('Environment check:', {
    ONEDRIVE_CLIENT_ID: process.env.ONEDRIVE_CLIENT_ID,
    ONEDRIVE_TENANT_ID: process.env.ONEDRIVE_TENANT_ID,
    hasOneDriveClientId: !!process.env.ONEDRIVE_CLIENT_ID,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasDropboxClientId: !!process.env.DROPBOX_CLIENT_ID
  });

  // Warn if environment variables are missing
  if (!process.env.ONEDRIVE_CLIENT_ID) {
    console.warn('WARNING: ONEDRIVE_CLIENT_ID environment variable is not set!');
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn('WARNING: GOOGLE_CLIENT_ID environment variable is not set!');
  }
  if (!process.env.DROPBOX_CLIENT_ID) {
    console.warn('WARNING: DROPBOX_CLIENT_ID environment variable is not set!');
  }
}

export const getCloudServiceConfig = () => ({
  googleDrive: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    // redirectUri is dynamically generated in OAuth flow
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ]
  },
  dropbox: {
    clientId: process.env.DROPBOX_CLIENT_ID || '',
    clientSecret: process.env.DROPBOX_CLIENT_SECRET || '',
    scopes: [
      'files.content.read',
      'files.metadata.read'
    ]
  },
  oneDrive: {
    clientId: process.env.ONEDRIVE_CLIENT_ID || '',
    clientSecret: process.env.ONEDRIVE_CLIENT_SECRET || '',
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