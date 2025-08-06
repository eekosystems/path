# Cloud Storage Setup Guide

This guide will help you set up OAuth authentication for Google Drive, Dropbox, and OneDrive in the Clerk application.

## Prerequisites

1. Copy `.env.template` to `.env` in the root directory
2. Never commit the `.env` file to version control

## Google Drive Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click on it and press "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop app" as the application type
   - Name it "Clerk Desktop App"
   - Download the credentials

5. Add to your `.env` file:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

6. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Add authorized domains if needed
   - Add scopes: 
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/drive.file`

## Dropbox Setup

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click "Create app"
3. Choose:
   - API: "Scoped access"
   - Access type: "Full Dropbox" or "App folder" based on your needs
   - Name your app (e.g., "Clerk Immigration Assistant")

4. In the app settings:
   - Add redirect URI: `http://localhost:3000/oauth/dropbox/callback`
   - Generate an access token for development

5. Set permissions:
   - `files.metadata.read`
   - `files.content.read`
   - `files.content.write` (if you want upload capability)

6. Add to your `.env` file:
   ```
   DROPBOX_CLIENT_ID=your_app_key_here
   DROPBOX_CLIENT_SECRET=your_app_secret_here
   ```

## OneDrive Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
   - Name: "Clerk Desktop Application"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: 
     - Platform: "Public client/native (mobile & desktop)"
     - URI: `http://localhost:3000/oauth/onedrive/callback`

4. After creation:
   - Copy the "Application (client) ID"
   - Go to "Certificates & secrets"
   - Create a new client secret
   - Copy the secret value immediately (it won't be shown again)

5. Set API permissions:
   - Go to "API permissions"
   - Add permissions:
     - Microsoft Graph > Delegated permissions:
       - `Files.Read`
       - `Files.Read.All`
       - `offline_access`

6. Add to your `.env` file:
   ```
   ONEDRIVE_CLIENT_ID=your_application_id_here
   ONEDRIVE_CLIENT_SECRET=your_client_secret_here
   ONEDRIVE_TENANT_ID=common
   ```

## Testing the Integration

1. Start the application in development mode
2. Go to the Documents panel in the sidebar
3. Click on each cloud service to connect
4. You'll be redirected to authenticate with each service
5. After authentication, you should see your files listed

## Security Notes

- OAuth tokens are stored securely using the system keychain (via keytar)
- Access tokens are automatically refreshed when they expire
- Users can disconnect services at any time from the UI
- Each user has their own set of cloud credentials

## Troubleshooting

### Google Drive
- If you get "Access blocked" error, make sure your OAuth consent screen is configured
- For production, you'll need to verify your app with Google

### Dropbox
- Ensure the redirect URI matches exactly
- Check that all required permissions are granted

### OneDrive
- If authentication fails, verify the tenant ID (use "common" for personal accounts)
- Make sure the redirect URI is registered correctly

## Production Considerations

1. **OAuth Redirect URIs**: In production, update redirect URIs to use your production domain
2. **Security**: Ensure all tokens are encrypted and stored securely
3. **Rate Limits**: Implement proper rate limiting and caching
4. **Error Handling**: Provide clear error messages to users
5. **Compliance**: Ensure you comply with each service's terms of service and data handling requirements