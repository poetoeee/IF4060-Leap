$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$venv = Join-Path $root '.venv-leap'
$bindings = Join-Path $root 'leapc-python-bindings'

$win = if ($null -ne $IsWindows) { $IsWindows } else { $env:OS -eq 'Windows_NT' }
$mac = if ($null -ne $IsMacOS) { $IsMacOS } else { $false }

$python = if ($win) {
  Join-Path $venv 'Scripts\python.exe'
} else {
  Join-Path $venv 'bin/python'
}

if (-not (Test-Path $python)) {
  if ($win) {
    $launcher = Get-Command py -ErrorAction SilentlyContinue
    if ($launcher) {
      & py -3.8 -m venv $venv
      if ($LASTEXITCODE -ne 0) {
        & py -3 -m venv $venv
      }
    } elseif (Get-Command python -ErrorAction SilentlyContinue) {
      & python -m venv $venv
    } else {
      throw 'Python is required. Install 64-bit Python 3.8+ and run this script again.'
    }
  } else {
    $pyCmd = Get-Command python3.8 -ErrorAction SilentlyContinue
    if (-not $pyCmd) { $pyCmd = Get-Command python3 -ErrorAction SilentlyContinue }
    if (-not $pyCmd) { $pyCmd = Get-Command python -ErrorAction SilentlyContinue }
    if (-not $pyCmd) {
      throw 'Python 3.8+ is required. Install python3 and python3-venv and run this script again.'
    }
    & $pyCmd.Source -m venv $venv
  }
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $python)) {
    throw 'Failed to create virtual environment at .venv-leap.'
  }
}

if (-not (Test-Path $bindings) -or -not (Test-Path (Join-Path $bindings 'requirements.txt'))) {
  if (Test-Path $bindings) { Remove-Item -Recurse -Force $bindings }
  git clone https://github.com/ultraleap/leapc-python-bindings $bindings
}

if ($win) {
  $sdk = if ($env:LEAPSDK_INSTALL_LOCATION) {
    $env:LEAPSDK_INSTALL_LOCATION
  } else {
    'C:\Program Files\Ultraleap\LeapSDK'
  }
  if (-not (Test-Path (Join-Path $sdk 'include\LeapC.h'))) {
    throw "Leap SDK not found at '$sdk'. Install Ultraleap Tracking Software or set LEAPSDK_INSTALL_LOCATION."
  }
  $env:LEAPSDK_INSTALL_LOCATION = $sdk
} elseif ($mac) {
  $sdk = if ($env:LEAPSDK_INSTALL_LOCATION) {
    $env:LEAPSDK_INSTALL_LOCATION
  } else {
    '/Applications/Ultraleap Hand Tracking.app/Contents/LeapSDK'
  }
  if (-not (Test-Path (Join-Path $sdk 'include/LeapC.h'))) {
    throw "Leap SDK not found at '$sdk'. Install Ultraleap Tracking Software or set LEAPSDK_INSTALL_LOCATION."
  }
  $env:LEAPSDK_INSTALL_LOCATION = $sdk
} else {
  $header = if ($env:LEAPC_HEADER_OVERRIDE) {
    $env:LEAPC_HEADER_OVERRIDE
  } elseif ($env:LEAPSDK_INSTALL_LOCATION -and (Test-Path (Join-Path $env:LEAPSDK_INSTALL_LOCATION 'include/LeapC.h'))) {
    Join-Path $env:LEAPSDK_INSTALL_LOCATION 'include/LeapC.h'
  } elseif ($env:LEAPSDK_INSTALL_LOCATION -and (Test-Path (Join-Path $env:LEAPSDK_INSTALL_LOCATION 'LeapC.h'))) {
    Join-Path $env:LEAPSDK_INSTALL_LOCATION 'LeapC.h'
  } elseif (Test-Path '/usr/include/LeapC.h') {
    '/usr/include/LeapC.h'
  } elseif (Test-Path '/opt/ultraleap/LeapSDK/include/LeapC.h') {
    '/opt/ultraleap/LeapSDK/include/LeapC.h'
  } elseif (Test-Path '/mnt/c/Program Files/Ultraleap/LeapSDK/include/LeapC.h') {
    '/mnt/c/Program Files/Ultraleap/LeapSDK/include/LeapC.h'
  } else {
    throw 'LeapC.h not found. Install Ultraleap Tracking Software or set LEAPSDK_INSTALL_LOCATION / LEAPC_HEADER_OVERRIDE.'
  }
}

& $python -m pip install -r (Join-Path $bindings 'requirements.txt')
& $python -m pip install -r (Join-Path $root 'bridge/requirements.txt')
& $python -m pip install -e (Join-Path $bindings 'leapc-cffi')
& $python -m pip install -e (Join-Path $bindings 'leapc-python-api')
if ($LASTEXITCODE -ne 0) { throw 'Leap Python bindings installation failed.' }

& $python -c "import leap; print('Leap bindings ready:', leap.__file__)"
if ($LASTEXITCODE -ne 0) { throw 'Leap bindings could not be imported.' }

Write-Host ''
Write-Host 'Leap setup complete. Start the bridge with:'
if ($win) {
  Write-Host '.venv-leap\Scripts\python.exe bridge\leap_bridge.py'
} else {
  Write-Host '.venv-leap/bin/python bridge/leap_bridge.py'
}

