# Building DocWriter for All Platforms

## ✅ Cross-Platform Ready

The app now has **hardcoded OAuth credentials** that work on:
- ✅ Windows
- ✅ macOS  
- ✅ Linux

No .env files needed - credentials are built into the code!

## Building the Installer

### On Windows (builds Windows installer):
```bash
npm run build
```
Creates: `dist\DocWriter Setup 1.0.1.exe`

### On Mac (builds Mac installer):
```bash
npm run build
```
Creates: `dist\DocWriter-1.0.1.dmg`

### On Linux (builds Linux installer):
```bash
npm run build
```
Creates: `dist\DocWriter-1.0.1.AppImage`

## How It Works

1. **OAuth credentials are hardcoded** in `src/main/main.ts`
2. **They load BEFORE anything else** - guaranteed to work
3. **Same credentials work everywhere** - Windows, Mac, Linux
4. **No configuration files needed** - works out of the box

## Testing

After building, test on each platform:
1. Install the app
2. Open it (no configuration needed)
3. Click "Connect to Google Drive"
4. Should open browser for authentication
5. User logs in with their account
6. Files appear in the app

## Distribution

Upload these files to your website:
- **Windows users**: `DocWriter Setup 1.0.1.exe`
- **Mac users**: `DocWriter-1.0.1.dmg`
- **Linux users**: `DocWriter-1.0.1.AppImage`

Each installer is self-contained with all credentials built-in!