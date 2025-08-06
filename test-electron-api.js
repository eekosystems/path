const { app, BrowserWindow } = require('electron');
const path = require('path');

let testWindow;

function createTestWindow() {
  testWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'dist-electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  console.log('Preload path:', path.join(__dirname, 'dist-electron', 'preload.js'));
  
  testWindow.loadFile('test-preload.html');
  testWindow.webContents.openDevTools();
  
  testWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console]: ${message}`);
  });
  
  testWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorDescription);
  });
}

app.whenReady().then(createTestWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});