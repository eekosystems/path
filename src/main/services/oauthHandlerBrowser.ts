import { shell } from 'electron';
import { URL } from 'url';
import crypto from 'crypto';
import keytar from 'keytar';
import log from '../log';
import { getCloudServiceConfig, oauthEndpoints } from '../config/cloudServices';
import http from 'http';
import { AddressInfo } from 'net';

const SERVICE_NAME = 'clerk-app';

export class OAuthHandlerBrowser {
  private server: http.Server | null = null;
  private serverPort: number = 0;
  private lastRedirectUri: string = '';

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

  // Start local HTTP server to receive OAuth callback
  private async startCallbackServer(): Promise<{ port: number; url: string }> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer();
      
      // Use fixed port 54321 for OAuth callbacks (register this in Azure/Google/Dropbox)
      const OAUTH_CALLBACK_PORT = 54321;
      
      this.server.listen(OAUTH_CALLBACK_PORT, '127.0.0.1', () => {
        const address = this.server!.address() as AddressInfo;
        this.serverPort = address.port;
        const url = `http://localhost:${this.serverPort}/callback`;
        this.lastRedirectUri = url;
        log.info(`OAuth callback server started on ${url}`);
        resolve({ port: this.serverPort, url });
      });

      this.server.on('error', reject);
    });
  }

  // Stop the callback server
  private stopCallbackServer() {
    if (this.server) {
      this.server.close();
      this.server = null;
      log.info('OAuth callback server stopped');
    }
  }

  // Handle OAuth callback
  private async handleOAuthCallback(expectedState: string): Promise<{ code: string; state: string }> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        reject(new Error('Callback server not started'));
        return;
      }

      let isResolved = false;
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          this.stopCallbackServer();
          reject(new Error('OAuth callback timeout'));
        }
      }, 300000); // 5 minute timeout

      const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
        try {
          const url = new URL(req.url!, `http://localhost:${this.serverPort}`);
          
          if (url.pathname === '/callback') {
            const code = url.searchParams.get('code');
            const state = url.searchParams.get('state');
            const error = url.searchParams.get('error');

            // Always send response headers first
            res.writeHead(200, { 'Content-Type': 'text/html' });
            
            if (error) {
              res.end(`
                <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                  <div style="text-align: center;">
                    <h2 style="color: #e74c3c;">Authentication Failed</h2>
                    <p>Error: ${error}</p>
                    <p style="color: #666;">You can close this window and return to the app.</p>
                  </div>
                </body>
                </html>
              `);
              
              // Wait for response to be sent before cleanup
              res.on('finish', () => {
                if (!isResolved) {
                  isResolved = true;
                  clearTimeout(timeout);
                  setTimeout(() => this.stopCallbackServer(), 100);
                  reject(new Error(`OAuth error: ${error}`));
                }
              });
            } else if (code && state) {
              res.end(`
                <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                  <div style="text-align: center;">
                    <h2 style="color: #27ae60;">Authentication Successful!</h2>
                    <p>You can close this window and return to the app.</p>
                    <script>
                      // Try to close the window after 2 seconds
                      setTimeout(() => { window.close(); }, 2000);
                    </script>
                  </div>
                </body>
                </html>
              `);
              
              // Wait for response to be sent before cleanup
              res.on('finish', () => {
                if (!isResolved) {
                  isResolved = true;
                  clearTimeout(timeout);
                  setTimeout(() => this.stopCallbackServer(), 100);
                  resolve({ code, state });
                }
              });
            } else {
              res.end(`
                <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                  <div style="text-align: center;">
                    <h2 style="color: #e74c3c;">Invalid Response</h2>
                    <p>Missing authorization code or state.</p>
                  </div>
                </body>
                </html>
              `);
              
              // Wait for response to be sent before cleanup
              res.on('finish', () => {
                if (!isResolved) {
                  isResolved = true;
                  clearTimeout(timeout);
                  setTimeout(() => this.stopCallbackServer(), 100);
                  reject(new Error('Missing authorization code or state'));
                }
              });
            }
          } else {
            res.writeHead(404);
            res.end('Not found');
          }
        } catch (error) {
          // Always send a response even on error
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
          }
          res.end('Internal Server Error');
          
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            this.stopCallbackServer();
            reject(error);
          }
        }
      };

      // Remove any existing listeners and add our handler
      this.server.removeAllListeners('request');
      this.server.on('request', requestHandler);
    });
  }

  async authenticateGoogle(userId: string): Promise<string> {
    const cloudServiceConfig = getCloudServiceConfig();
    const { clientId, scopes } = cloudServiceConfig.googleDrive;
    const { verifier, challenge } = this.generatePKCEChallenge();
    const state = this.generateState();

    // Start callback server
    const { url: redirectUri } = await this.startCallbackServer();

    // Store verifier, state, and redirect URI temporarily
    await keytar.setPassword(SERVICE_NAME, `google-pkce-${userId}`, verifier);
    await keytar.setPassword(SERVICE_NAME, `google-state-${userId}`, state);
    await keytar.setPassword(SERVICE_NAME, `google-redirect-${userId}`, redirectUri);

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

    // Open in system browser
    await shell.openExternal(authUrl.toString());
    log.info('Opened Google OAuth in system browser');

    try {
      // Wait for callback
      const { code, state: returnedState } = await this.handleOAuthCallback(state);

      // Verify state
      const savedState = await keytar.getPassword(SERVICE_NAME, `google-state-${userId}`);
      if (returnedState !== savedState) {
        throw new Error('State mismatch - possible CSRF attack');
      }

      // Clean up temporary storage
      await keytar.deletePassword(SERVICE_NAME, `google-state-${userId}`);

      // Return the authorization code
      return code;
    } catch (error) {
      // Clean up on error
      this.stopCallbackServer();
      await keytar.deletePassword(SERVICE_NAME, `google-pkce-${userId}`);
      await keytar.deletePassword(SERVICE_NAME, `google-state-${userId}`);
      throw error;
    }
  }

  async authenticateOneDrive(userId: string): Promise<string> {
    const cloudServiceConfig = getCloudServiceConfig();
    const { clientId, scopes } = cloudServiceConfig.oneDrive;
    const { verifier, challenge } = this.generatePKCEChallenge();
    const state = this.generateState();

    // Start callback server
    const { url: redirectUri } = await this.startCallbackServer();

    // Store verifier, state, and redirect URI temporarily
    await keytar.setPassword(SERVICE_NAME, `onedrive-pkce-${userId}`, verifier);
    await keytar.setPassword(SERVICE_NAME, `onedrive-state-${userId}`, state);
    await keytar.setPassword(SERVICE_NAME, `onedrive-redirect-${userId}`, redirectUri);

    const authUrl = new URL(oauthEndpoints.microsoft.authUrl);
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('response_mode', 'query');
    authUrl.searchParams.append('code_challenge', challenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('state', state);

    // Open in system browser
    await shell.openExternal(authUrl.toString());
    log.info('Opened OneDrive OAuth in system browser');

    try {
      // Wait for callback
      const { code, state: returnedState } = await this.handleOAuthCallback(state);

      // Verify state
      const savedState = await keytar.getPassword(SERVICE_NAME, `onedrive-state-${userId}`);
      if (returnedState !== savedState) {
        throw new Error('State mismatch - possible CSRF attack');
      }

      // Clean up temporary storage
      await keytar.deletePassword(SERVICE_NAME, `onedrive-state-${userId}`);

      // Return the authorization code
      return code;
    } catch (error) {
      // Clean up on error
      this.stopCallbackServer();
      await keytar.deletePassword(SERVICE_NAME, `onedrive-pkce-${userId}`);
      await keytar.deletePassword(SERVICE_NAME, `onedrive-state-${userId}`);
      throw error;
    }
  }

  async authenticateDropbox(userId: string): Promise<string> {
    const cloudServiceConfig = getCloudServiceConfig();
    const { clientId, scopes } = cloudServiceConfig.dropbox;
    const { verifier, challenge } = this.generatePKCEChallenge();
    const state = this.generateState();

    // Start callback server
    const { url: redirectUri } = await this.startCallbackServer();

    // Store verifier, state, and redirect URI temporarily
    await keytar.setPassword(SERVICE_NAME, `dropbox-pkce-${userId}`, verifier);
    await keytar.setPassword(SERVICE_NAME, `dropbox-state-${userId}`, state);
    await keytar.setPassword(SERVICE_NAME, `dropbox-redirect-${userId}`, redirectUri);

    const authUrl = new URL(oauthEndpoints.dropbox.authUrl);
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('token_access_type', 'offline');
    authUrl.searchParams.append('code_challenge', challenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('state', state);
    
    // Dropbox uses space-separated scopes in the URL
    if (scopes.length > 0) {
      authUrl.searchParams.append('scope', scopes.join(' '));
    }

    // Open in system browser
    await shell.openExternal(authUrl.toString());
    log.info('Opened Dropbox OAuth in system browser');

    try {
      // Wait for callback
      const { code, state: returnedState } = await this.handleOAuthCallback(state);

      // Verify state
      const savedState = await keytar.getPassword(SERVICE_NAME, `dropbox-state-${userId}`);
      if (returnedState !== savedState) {
        throw new Error('State mismatch - possible CSRF attack');
      }

      // Clean up temporary storage
      await keytar.deletePassword(SERVICE_NAME, `dropbox-state-${userId}`);

      // Return the authorization code
      return code;
    } catch (error) {
      // Clean up on error
      this.stopCallbackServer();
      await keytar.deletePassword(SERVICE_NAME, `dropbox-pkce-${userId}`);
      await keytar.deletePassword(SERVICE_NAME, `dropbox-state-${userId}`);
      throw error;
    }
  }
}