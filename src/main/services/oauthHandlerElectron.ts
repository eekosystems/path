import { BrowserWindow, session } from 'electron';
import { URL } from 'url';
import crypto from 'crypto';
import keytar from 'keytar';
import log from '../log';
import { cloudServiceConfig, oauthEndpoints } from '../config/cloudServices';

const SERVICE_NAME = 'clerk-app';

export class OAuthHandlerElectron {
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

  async authenticateOneDrive(userId: string): Promise<string> {
    const { clientId, redirectUri, scopes, tenantId } = cloudServiceConfig.oneDrive;
    const state = this.generateState();

    await keytar.setPassword(SERVICE_NAME, `onedrive-state-${userId}`, state);

    // Use the native app redirect URI for better compatibility
    const nativeRedirectUri = 'https://login.microsoftonline.com/common/oauth2/nativeclient';
    
    const authUrl = new URL(oauthEndpoints.oneDrive.authUrl.replace('{tenant}', tenantId));
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', nativeRedirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('prompt', 'select_account');

    log.info('OneDrive OAuth URL:', { url: authUrl.toString() });

    return this.performOAuthFlow(authUrl.toString(), nativeRedirectUri, async (code, returnedState) => {
      // Verify state
      const savedState = await keytar.getPassword(SERVICE_NAME, `onedrive-state-${userId}`);
      if (returnedState !== savedState) {
        throw new Error('Invalid state parameter');
      }

      // Exchange code for tokens using native client flow
      const tokenResponse = await this.exchangeCodeForTokens('onedrive', code, userId, nativeRedirectUri);
      
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
      // Create a new session for OAuth
      const partition = `persist:oauth-${Date.now()}`;
      const ses = session.fromPartition(partition);

      // OPTION 3: Full security bypass for OAuth
      // Disable all security checks for this session
      ses.setPermissionCheckHandler(() => true);
      
      // Allow all permissions
      ses.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(true);
      });

      // CRITICAL: Disable SameSite cookie enforcement completely
      ses.cookies.on('changed', (event, cookie, cause, removed) => {
        if (!removed && cookie.sameSite === 'strict' || cookie.sameSite === 'lax') {
          // Force re-set the cookie without SameSite restrictions
          ses.cookies.set({
            url: `https://${cookie.domain}`,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            expirationDate: cookie.expirationDate,
            sameSite: 'no_restriction'
          }).catch(() => {});
        }
      });

      // Force accept all cookies
      ses.webRequest.onBeforeSendHeaders((details, callback) => {
        // Ensure cookies are sent with all requests
        details.requestHeaders['Cookie'] = details.requestHeaders['Cookie'] || '';
        callback({ requestHeaders: details.requestHeaders });
      });

      // Allow all cookies to be set
      ses.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = { ...details.responseHeaders };
        
        // Remove any cookie restrictions
        delete responseHeaders['X-Frame-Options'];
        delete responseHeaders['Content-Security-Policy'];
        delete responseHeaders['X-Content-Security-Policy'];
        
        // Ensure cookies can be set
        if (responseHeaders['Set-Cookie']) {
          responseHeaders['Set-Cookie'] = responseHeaders['Set-Cookie'].map(cookie => {
            // Remove SameSite restrictions
            return cookie.replace(/SameSite=\w+;?/gi, 'SameSite=None;');
          });
        }
        
        callback({ responseHeaders });
      });

      // Create auth window with better settings
      this.authWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          partition: partition,
          webSecurity: false,  // Disable web security
          allowRunningInsecureContent: true,  // Allow mixed content
          experimentalFeatures: true  // Enable experimental features
        }
      });

      // Clear session data before starting
      ses.clearStorageData();

      // Enable third-party cookies for Microsoft domains
      const microsoftDomains = [
        'https://login.microsoftonline.com',
        'https://login.live.com',
        'https://account.live.com',
        'https://login.windows.net',
        'https://aadcdn.msftauth.net',
        'https://aadcdn.msauth.net'
      ];

      // Set permissive cookie policy for Microsoft domains
      microsoftDomains.forEach(domain => {
        ses.cookies.set({
          url: domain,
          name: 'oauth_init',
          value: '1',
          secure: true,
          sameSite: 'no_restriction',
          httpOnly: false
        }).catch(() => {}); // Ignore errors
      });

      // Handle the ready-to-show event
      this.authWindow.once('ready-to-show', () => {
        this.authWindow?.show();
      });

      // Intercept navigation
      this.authWindow.webContents.on('will-navigate', async (event, url) => {
        log.info('OAuth navigation:', { url });
        
        if (url.startsWith(redirectUri) || url.includes('code=')) {
          event.preventDefault();
          
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          const state = urlObj.searchParams.get('state');
          const error = urlObj.searchParams.get('error');
          const errorDescription = urlObj.searchParams.get('error_description');

          if (error) {
            this.authWindow?.close();
            reject(new Error(`OAuth error: ${error} - ${errorDescription}`));
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

      // Also check for redirects
      this.authWindow.webContents.on('did-navigate', async (event, url) => {
        if (url.includes('code=') && url.includes('state=')) {
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          const state = urlObj.searchParams.get('state');

          if (code && state) {
            try {
              const token = await handleCallback(code, state);
              this.authWindow?.close();
              resolve(token);
            } catch (error) {
              this.authWindow?.close();
              reject(error);
            }
          }
        }
      });

      // Handle window closed
      this.authWindow.on('closed', () => {
        this.authWindow = null;
        reject(new Error('Authentication cancelled'));
      });

      // Inject JavaScript to handle cookies properly (only once on first navigation)
      this.authWindow.webContents.once('did-navigate', () => {
        this.authWindow?.webContents.executeJavaScript(`
          // Only inject if not already done
          if (!window.__oauthInjected) {
            window.__oauthInjected = true;
            
            // Ensure credentials are included in fetch requests
            if (!window.__originalFetch) {
              window.__originalFetch = window.fetch;
              window.fetch = function(...args) {
                if (args[1]) {
                  args[1].credentials = 'include';
                }
                return window.__originalFetch.apply(this, args);
              };
            }
          }
        `).catch(() => {});
      });

      // Load the auth URL
      this.authWindow.loadURL(authUrl);
    });
  }

  private async exchangeCodeForTokens(
    service: 'google' | 'dropbox' | 'onedrive',
    code: string,
    userId: string,
    redirectUri?: string
  ): Promise<any> {
    let tokenUrl: string;
    let params: URLSearchParams;

    switch (service) {
      case 'onedrive': {
        const { clientId, clientSecret, tenantId } = cloudServiceConfig.oneDrive;
        
        tokenUrl = oauthEndpoints.oneDrive.tokenUrl.replace('{tenant}', tenantId);
        params = new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri || 'https://login.microsoftonline.com/common/oauth2/nativeclient',
          grant_type: 'authorization_code'
        });
        break;
      }
      default:
        throw new Error(`Service ${service} not implemented in this handler`);
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
      default:
        throw new Error(`Service ${service} not implemented`);
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

  // Implement Google and Dropbox methods similarly...
  async authenticateGoogle(userId: string): Promise<string> {
    // Similar implementation with Google-specific details
    throw new Error('Not implemented yet');
  }

  async authenticateDropbox(userId: string): Promise<string> {
    // Similar implementation with Dropbox-specific details
    throw new Error('Not implemented yet');
  }
}

export const oauthHandlerElectron = new OAuthHandlerElectron();