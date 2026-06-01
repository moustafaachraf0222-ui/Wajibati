$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$jdk23 = 'C:\Program Files\Java\jdk-23'
$javaHome = if (Test-Path $jdk23) { $jdk23 } else { $env:JAVA_HOME }

if (-not $javaHome -or -not (Test-Path (Join-Path $javaHome 'bin\java.exe'))) {
  throw 'JDK 23 is required for the Android build. Install JDK 23 or set JAVA_HOME to a compatible JDK.'
}

if (-not (Test-Path $androidSdk)) {
  throw "Android SDK was not found at $androidSdk. Install Android SDK command-line tools or Android Studio first."
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidSdk
$env:ANDROID_SDK_ROOT = $androidSdk
$env:Path = "$javaHome\bin;$androidSdk\cmdline-tools\latest\bin;$androidSdk\platform-tools;$env:Path"

Push-Location $projectRoot
try {
  npm run android:sync
  Push-Location (Join-Path $projectRoot 'android')
  try {
    .\gradlew.bat assembleDebug
  } finally {
    Pop-Location
  }

  $apkSource = Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
  $apkDir = Join-Path $projectRoot 'apk'
  $apkTarget = Join-Path $apkDir 'Wajibati-debug.apk'
  New-Item -ItemType Directory -Path $apkDir -Force | Out-Null
  Copy-Item -LiteralPath $apkSource -Destination $apkTarget -Force
  Write-Host "APK created: $apkTarget"
} finally {
  Pop-Location
}
