# Script to install Android SDK and platform-tools without Android Studio on Windows
# Run this script in PowerShell to automate the download, extraction, and configuration.

$sdkRoot = "C:\Users\HP-PC\AppData\Local\Android\Sdk"
$zipUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
$zipFile = Join-Path $env:TEMP "commandlinetools-win.zip"

Write-Host "=== Android SDK Setup Script ===" -ForegroundColor Cyan
Write-Host "Target SDK Directory: $sdkRoot"

# 1. Create directory structure
if (-not (Test-Path $sdkRoot)) {
    Write-Host "Creating SDK directory..."
    New-Item -ItemType Directory -Path $sdkRoot | Out-Null
}

$cmdlineToolsDir = Join-Path $sdkRoot "cmdline-tools"
if (-not (Test-Path $cmdlineToolsDir)) {
    New-Item -ItemType Directory -Path $cmdlineToolsDir | Out-Null
}

$latestDir = Join-Path $cmdlineToolsDir "latest"
if (Test-Path $latestDir) {
    Write-Host "Existing cmdline-tools found. Cleaning up..."
    Remove-Item -Recurse -Force $latestDir
}

# 2. Download command line tools
Write-Host "Downloading Android Command Line Tools..." -ForegroundColor Yellow
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile -UseBasicParsing -ErrorAction Stop
} catch {
    Write-Host "Invoke-WebRequest failed, attempting System.Net.WebClient..." -ForegroundColor Yellow
    (New-Object System.Net.WebClient).DownloadFile($zipUrl, $zipFile)
}
Write-Host "Download completed successfully." -ForegroundColor Green

# 3. Extract command line tools
Write-Host "Extracting Command Line Tools..." -ForegroundColor Yellow
$tempExtractDir = Join-Path $env:TEMP "android-cmdline-extracted"
if (Test-Path $tempExtractDir) { Remove-Item -Recurse -Force $tempExtractDir }
New-Item -ItemType Directory -Path $tempExtractDir | Out-Null

Expand-Archive -Path $zipFile -DestinationPath $tempExtractDir -Force

# The ZIP contains a top-level folder 'cmdline-tools'
# Move its contents to Sdk/cmdline-tools/latest
Move-Item -Path "$tempExtractDir\cmdline-tools" -Destination $latestDir -Force
Write-Host "Extraction completed." -ForegroundColor Green

# 4. Verify sdkmanager exists
$sdkmanager = Join-Path $latestDir "bin\sdkmanager.bat"
if (-not (Test-Path $sdkmanager)) {
    Write-Error "sdkmanager.bat was not found at $sdkmanager. Installation aborted."
    exit 1
}

# 5. Install SDK Packages
Write-Host "Installing platform-tools, platforms, and build-tools..." -ForegroundColor Yellow
# We pass y inputs to auto-accept the licenses and run sdkmanager
$packages = @(
    "platform-tools",
    "platforms;android-34",
    "build-tools;34.0.0",
    "platforms;android-35",
    "build-tools;35.0.0"
)

$packagesArg = $packages -join " "
Write-Host "Running: sdkmanager $packagesArg"
cmd.exe /c "echo y | `"$sdkmanager`" $packagesArg"

Write-Host "Accepting all licenses..." -ForegroundColor Yellow
(1..30) | ForEach-Object { "y" } | & $sdkmanager --licenses

# 6. Configure Environment Variables for user account
Write-Host "Configuring Environment Variables..." -ForegroundColor Yellow
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkRoot, "User")

$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$sdkPaths = @(
    "$sdkRoot\platform-tools",
    "$sdkRoot\emulator",
    "$sdkRoot\cmdline-tools\latest\bin"
)

$pathsToAdd = @()
foreach ($p in $sdkPaths) {
    if ($currentPath -notlike "*$p*") {
        $pathsToAdd += $p
    }
}

if ($pathsToAdd.Count -gt 0) {
    $newPath = $currentPath + ";" + ($pathsToAdd -join ";")
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Added SDK paths to User Path variable." -ForegroundColor Green
} else {
    Write-Host "SDK paths are already in the User Path variable." -ForegroundColor Green
}

# Clean up temp files
Remove-Item -Path $zipFile -Force -ErrorAction SilentlyContinue
Remove-Item -Path $tempExtractDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host "1. Please RESTART your terminal / editor (VS Code, Cursor, Antigravity IDE, etc.) for the environment variables to take effect." -ForegroundColor Cyan
Write-Host "2. Try running 'adb version' in a new terminal to verify." -ForegroundColor Cyan
Write-Host "3. Then run 'npx expo run:android'." -ForegroundColor Cyan
