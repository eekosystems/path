# DocWriter - Build Signed Installer PowerShell Script

Write-Host "========================================"
Write-Host "DocWriter - Building Signed Installer"
Write-Host "========================================"
Write-Host ""

# Get the certificate password
$certificatePassword = Read-Host -AsSecureString "Enter certificate password"
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($certificatePassword)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Set environment variables
$env:CSC_LINK = "$PSScriptRoot\certificate.pfx"
$env:CSC_KEY_PASSWORD = $plainPassword

Write-Host "Certificate: $env:CSC_LINK"
Write-Host ""

# Clean previous builds
Write-Host "Cleaning previous builds..."
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "dist-electron") {
    Remove-Item -Path "dist-electron" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Installing dependencies..."
npm install

Write-Host ""
Write-Host "Building application with code signing..."
npm run build

# Clear sensitive environment variables
$env:CSC_KEY_PASSWORD = ""
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

Write-Host ""
Write-Host "========================================"
Write-Host "Build Complete!"
Write-Host "========================================"
Write-Host ""
Write-Host "Installers created in the 'dist' folder:"
Write-Host "- DocWriter Setup.exe (NSIS Installer)"
Write-Host "- DocWriter Portable.exe (Portable Version)"
Write-Host ""
Write-Host "The installers are signed with your certificate."
Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")