// Test OAuth flow directly
const http = require('http');
const { shell } = require('electron');
require('dotenv').config();

console.log('Environment variables loaded:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set');
console.log('DROPBOX_CLIENT_ID:', process.env.DROPBOX_CLIENT_ID ? 'Set' : 'Not set');
console.log('ONEDRIVE_CLIENT_ID:', process.env.ONEDRIVE_CLIENT_ID ? 'Set' : 'Not set');

// Test if we can start a server on port 54321
const server = http.createServer((req, res) => {
  console.log('Received request:', req.url);
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>OAuth Callback Server Working!</h1>');
});

server.listen(54321, '127.0.0.1', () => {
  console.log('\n✅ Server successfully started on http://localhost:54321');
  console.log('The OAuth callback server is working correctly.\n');
  
  // Test Google OAuth URL
  const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleUrl.searchParams.append('client_id', process.env.GOOGLE_CLIENT_ID || '');
  googleUrl.searchParams.append('redirect_uri', 'http://localhost:54321/callback');
  googleUrl.searchParams.append('response_type', 'code');
  googleUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/drive.readonly');
  googleUrl.searchParams.append('access_type', 'offline');
  
  console.log('Google OAuth URL would be:');
  console.log(googleUrl.toString());
  console.log('\nTo test: Open this URL in a browser and see if it redirects back after authentication.');
  
  setTimeout(() => {
    console.log('\nClosing test server...');
    server.close();
    process.exit(0);
  }, 10000);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('\n❌ Port 54321 is already in use!');
    console.log('This might be why OAuth is failing.');
    console.log('Try closing any other applications that might be using this port.\n');
  } else {
    console.log('\n❌ Server error:', err.message);
  }
  process.exit(1);
});