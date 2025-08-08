# Installation Troubleshooting Guide

## If the installer won't run on another PC:

### 1. **Windows SmartScreen Filter**
**Most Common Issue** - Windows blocks unsigned apps

**Solution:**
1. Right-click the downloaded file
2. Select "Properties"
3. Check "Unblock" at the bottom
4. Click "Apply" then "OK"
5. Now try running the installer

**Alternative:**
1. When you run the installer, Windows shows "Windows protected your PC"
2. Click **"More info"**
3. Click **"Run anyway"**

### 2. **Antivirus Software**
Some antivirus software blocks unsigned executables.

**Solution:**
1. Temporarily disable antivirus
2. Install DocWriter
3. Re-enable antivirus
4. Add DocWriter to antivirus exceptions

### 3. **Missing Visual C++ Redistributables**
The app needs Visual C++ runtime libraries.

**Solution:**
Download and install from Microsoft:
https://aka.ms/vs/17/release/vc_redist.x64.exe

### 4. **Administrator Rights**
The previous version required admin rights, new version doesn't.

**Solution:**
1. Use the newly built installer (with `asInvoker` setting)
2. It should install without admin rights

### 5. **Corrupted Download**
File might be corrupted during download.

**Solution:**
1. Clear browser cache
2. Re-download the installer
3. Check file size (should be ~116 MB)

## Quick Test Method:

### On the PC where it won't run:
1. Download the **portable version** instead: `DocWriter 1.0.1.exe`
2. This doesn't need installation - just runs directly
3. If portable works, the issue is with installer permissions

## For Your Website:

Add these instructions to your download page:

```markdown
## Installation Instructions

1. Download DocWriter Setup 1.0.1.exe
2. If Windows blocks the file:
   - Right-click → Properties → Check "Unblock" → Apply
3. Run the installer
4. If you see "Windows protected your PC":
   - Click "More info" → "Run anyway"

### Alternative: Portable Version
If installer doesn't work, try the portable version:
- Download: DocWriter 1.0.1.exe (no installation needed)
- Just run it directly from your Downloads folder
```

## Developer Note:

The new build has:
- `requestedExecutionLevel: asInvoker` (no admin needed)
- `signAndEditExecutable: false` (less restrictive)
- `runAfterFinish: true` (auto-starts after install)
- `createDesktopShortcut: true` (adds desktop icon)

This should work on most Windows PCs without issues!