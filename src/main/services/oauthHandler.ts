import { BrowserWindow, shell, session } from 'electron';
import { URL } from 'url';
import crypto from 'crypto';
import keytar from 'keytar';
import log from '../log';
import { cloudServiceConfig, oauthEndpoints } from '../config/cloudServices';

const SERVICE_NAME = 'clerk-app';

export class OAuthHandler {
  private authWindow: BrowserWindow | null = null;

  // Generate PKCE challenge for enhanced security
  private generatePKCEChallenge() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    return { verifier, challenge };
  }

  // Generate state parameter for CSRF protection
  private generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  async authenticateGoogle(userId: string): Promise<string> {
    const { clientId, redirectUri, scopes } = cloudServiceConfig.googleDrive;
    const { verifier, challenge } = this.generatePKCEChallenge();
    const state = this.generateState();

    // Store verifier temporarily
    await keytar.setPassword(SERVICE_NAME, `google-pkce-${userId}`, verifier);
    await keytar.setPassword(SERVICE_NAME, `google-state-${userId}`, state);

    const authUrl = new URL(oauthEndpoints.google.authUrl);
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('code_challenge', challenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('state', state);

    return this.performOAuthFlow(authUrl.toString(), redirectUri, async (code, returnedState) => {
      // Verify state
      const savedState = await keytar.getPassword(SERVICE_NAME, `google-state-${userId}`);
      if (returnedState !== savedState) {
        throw new Error('Invalid state parameter');
      }

      // Exchange code for tokens
      const tokenResponse = await this.exchangeCodeForTokens('google', code, userId);
      
      // Store tokens securely
      await keytar.setPassword(SERVICE_NAME, `google-access-${userId}`, tokenResponse.access_token);
      if (tokenResponse.refresh_token) {
        await keytar.setPassword(SERVICE_NAME, `google-refresh-${userId}`, tokenResponse.refresh_token);
      }

      // Clean up temporary storage
      await keytar.deletePassword(SERVICE_NAME, `google-pkce-${userId}`);
      await keytar.deletePassword(SERVICE_NAME, `google-state-${userId}`);

      return tokenResponse.access_token;
    });
  }

  async authenticateDropbox(userId: string): Promise<string> {
    const { clientId, redirectUri } = cloudServiceConfig.dropbox;
    const state = this.generateState();

    await keytar.setPassword(SERVICE_NAME, `dropbox-state-${userId}`, state);

    const authUrl = new URL(oauthEndpoints.dropbox.authUrl);
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('token_access_type', 'offline');

    return this.performOAuthFlow(authUrl.toString(), redirectUri, async (code, returnedState) => {
      // Verify state
      const savedState = await keytar.getPassword(SERVICE_NAME, `dropbox-state-${userId}`);
      if (returnedState !== savedState) {
        throw new Error('Invalid state parameter');
      }

      // Exchange code for tokens
      const tokenResponse = await this.exchangeCodeForTokens('dropbox', code, userId);
      
      // Store tokens securely
      await keytar.setPassword(SERVICE_NAME, `dropbox-access-${userId}`, tokenResponse.access_token);
      if (tokenResponse.refresh_token) {
        await keytar.setPassword(SERVICE_NAME, `dropbox-refresh-${userId}`, tokenResponse.refresh_token);
      }

      // Clean up
      await keytar.deletePassword(SERVICE_NAME, `dropbox-state-${userId}`);

      return tokenResponse.access_token;
    });
  }

  async authenticateOneDrive(userId: string): Promise<string> {
    const { clientId, redirectUri, scopes, tenantId } = cloudServiceConfig.oneDrive;
    const state = this.generateState();

    await keytar.setPassword(SERVICE_NAME, `onedrive-state-${userId}`, state);

    const authUrl = new URL(oauthEndpoints.oneDrive.authUrl.replace('{tenant}', tenantId));
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('response_mode', 'query');

    // Log the URL for debugging
    log.info('OneDrive OAuth URL:', { url: authUrl.toString(), clientId, tenantId });

    return this.performOAuthFlow(authUrl.toString(), redirectUri, async (code, returnedState) => {
      // Verify state
      const savedState = await keytar.getPassword(SERVICE_NAME, `onedrive-state-${userId}`);
      if (returnedState !== savedState) {
        throw new Error('Invalid state parameter');
      }

      // Exchange code for tokens
      const tokenResponse = await this.exchangeCodeForTokens('onedrive', code, userId);
      
      // Store tokens securely
      await keytar.setPassword(SERVICE_NAME, `onedrive-access-${userId}`, tokenResponse.access_token);
      if (tokenResponse.refresh_token) {
        await keytar.setPassword(SERVICE_NAME, `onedrive-refresh-${userId}`, tokenResponse.refresh_token);
      }

      // Clean up
      await keytar.deletePassword(SERVICE_NAME, `onedrive-state-${userId}`);

      return tokenResponse.access_token;
    });
  }

  private async performOAuthFlow(
    authUrl: string,
    redirectUri: string,
    handleCallback: (code: string, state: string) => Promise<string>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create a dedicated session for OAuth
      const oauthSession = session.fromPartition('persist:oauth', { cache: true });
      
      // Configure the session to allow all cookies
      oauthSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        callback({ requestHeaders: details.requestHeaders });
      });

      // Create auth window
      this.authWindow = new BrowserWindow({
        width: 800,
        height: 900,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
          partition: 'persist:oauth',
          session: oauthSession
        }
      });

      // Configure session to handle cookies properly
      this.authWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        // Allow necessary permissions for OAuth
        if (permission === 'notifications' || permission === 'media') {
          callback(false);
        } else {
          callback(true);
        }
      });

      // Enable cookies with proper SameSite handling
      this.authWindow.webContents.session.cookies.on('changed', (event, cookie, cause, removed) => {
        if (removed) return;
        // Re-set Microsoft cookies with proper SameSite policy
        if (cookie.domain?.includes('microsoftonline.com') || cookie.domain?.includes('live.com')) {
          this.authWindow.webContents.session.cookies.set({
            ...cookie,
            sameSite: 'no_restriction'
          }).catch(err => log.debug('Cookie update:', err));
        }
      });

      // Remove CSP restrictions for OAuth window
      this.authWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': ["default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"]
          }
        });
      });

      // Add error handling for navigation
      this.authWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        log.error('OAuth window failed to load', { errorCode, errorDescription, validatedURL });
        this.authWindow?.close();
        reject(new Error(`Failed to load OAuth page: ${errorDescription}`));
      });

      // Handle navigation errors
      this.authWindow.webContents.on('did-navigate', (event, url, httpResponseCode) => {
        if (httpResponseCode >= 400) {
          log.error('OAuth navigation error', { url, httpResponseCode });
        }
      });

      this.authWindow.loadURL(authUrl).catch((error) => {
        log.error('Failed to load OAuth URL', { error: error.message, url: authUrl });
        this.authWindow?.close();
        reject(new Error(`Failed to load OAuth URL: ${error.message}`));
      });

      // Handle redirect
      this.authWindow.webContents.on('will-redirect', async (event, url) => {
        if (url.startsWith(redirectUri)) {
          event.preventDefault();
          
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          const state = urlObj.searchParams.get('state');
          const error = urlObj.searchParams.get('error');

          if (error) {
            this.authWindow?.close();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (!code) {
            this.authWindow?.close();
            reject(new Error('No authorization code received'));
            return;
          }

          try {
            const token = await handleCallback(code, state || '');
            this.authWindow?.close();
            resolve(token);
          } catch (error) {
            this.authWindow?.close();
            reject(error);
          }
        }
      });

      // Handle window closed
      this.authWindow.on('closed', () => {
        this.authWindow = null;
        reject(new Error('Authentication cancelled'));
      });
    });
  }

  private async exchangeCodeForTokens(
    service: 'google' | 'dropbox' | 'onedrive',
    code: string,
    userId: string
  ): Promise<any> {
    let tokenUrl: string;
    let params: URLSearchParams;

    switch (service) {
      case 'google': {
        const { clientId, clientSecret, redirectUri } = cloudServiceConfig.googleDrive;
        const verifier = await keytar.getPassword(SERVICE_NAME, `google-pkce-${userId}`);
        
        tokenUrl = oauthEndpoints.google.tokenUrl;
        params = new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code_verifier: verifier || ''
        });
        break;
      }
      
      case 'dropbox': {
        const { clientId, clientSecret, redirectUri } = cloudServiceConfig.dropbox;
        
        tokenUrl = oauthEndpoints.dropbox.tokenUrl;
        params = new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        });
        break;
      }
      
      case 'onedrive': {
        const { clientId, clientSecret, redirectUri, tenantId } = cloudServiceConfig.oneDrive;
        
        tokenUrl = oauthEndpoints.oneDrive.tokenUrl.replace('{tenant}', tenantId);
        params = new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          scope: cloudServiceConfig.oneDrive.scopes.join(' ')
        });
        break;
      }
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      log.error(`Token exchange failed for ${service}`, error);
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    return response.json();
  }

  async refreshToken(service: 'google' | 'dropbox' | 'onedrive', userId: string): Promise<string> {
    const refreshToken = await keytar.getPassword(SERVICE_NAME, `${service}-refresh-${userId}`);
    if (!refreshToken) {
      throw new Error(`No refresh token found for ${service}`);
    }

    let tokenUrl: string;
    let params: URLSearchParams;

    switch (service) {
      case 'google': {
        const { clientId, clientSecret } = cloudServiceConfig.googleDrive;
        tokenUrl = oauthEndpoints.google.tokenUrl;
        params = new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token'
        });
        break;
      }
      
      case 'dropbox': {
        const { clientId, clientSecret } = cloudServiceConfig.dropbox;
        tokenUrl = oauthEndpoints.dropbox.tokenUrl;
        params = new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token'
        });
        break;
      }
      
      case 'onedrive': {
        const { clientId, clientSecret, tenantId } = cloudServiceConfig.oneDrive;
        tokenUrl = oauthEndpoints.oneDrive.tokenUrl.replace('{tenant}', tenantId);
        params = new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          scope: cloudServiceConfig.oneDrive.scopes.join(' ')
        });
        break;
      }
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token for ${service}`);
    }

    const data = await response.json();
    
    // Update stored access token
    await keytar.setPassword(SERVICE_NAME, `${service}-access-${userId}`, data.access_token);
    
    return data.access_token;
  }

  async getAccessToken(service: 'google' | 'dropbox' | 'onedrive', userId: string): Promise<string> {
    const token = await keytar.getPassword(SERVICE_NAME, `${service}-access-${userId}`);
    if (!token) {
      throw new Error(`No access token found for ${service}. Please authenticate first.`);
    }
    return token;
  }

  async disconnect(service: 'google' | 'dropbox' | 'onedrive', userId: string): Promise<void> {
    await keytar.deletePassword(SERVICE_NAME, `${service}-access-${userId}`);
    await keytar.deletePassword(SERVICE_NAME, `${service}-refresh-${userId}`);
  }
}

export const oauthHandler = new OAuthHandler();