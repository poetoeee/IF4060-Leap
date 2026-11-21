$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$venv = Join-Path $root '.venv-leap'
$python = Join-Path $venv 'Scripts\python.exe'
$bindings = Join-Path $root 'leapc-python-bindings'
$sdk = if ($env:LEAPSDK_INSTALL_LOCATION) {
  $env:LEAPSDK_INSTALL_LOCATION
} else {
  'C:\Program Files\Ultraleap\LeapSDK'
}

if (-not (Test-Path $python)) {
  $launcher = Get-Command py -ErrorAction SilentlyContinue
  if (-not $launcher) {
    throw 'Python is required. Install 64-bit Python 3.8+ and run this script again.'
  }
  & py -3.8 -m venv $venv
  if ($LASTEXITCODE -ne 0) {
    & py -3 -m venv $venv
  }
}

if (-not (Test-Path $bindings)) {
  git clone https://github.com/ultraleap/leapc-python-bindings $bindings
}

if (-not (Test-Path (Join-Path $sdk 'include\LeapC.h'))) {
  throw "Leap SDK not found at '$sdk'. Install Ultraleap Tracking Software or set LEAPSDK_INSTALL_LOCATION."
}

$env:LEAPSDK_INSTALL_LOCATION = $sdk
& $python -m pip install -r (Join-Path $bindings 'requirements.txt')
& $python -m pip install -r (Join-Path $root 'bridge\requirements.txt')
& $python -m pip install -e (Join-Path $bindings 'leapc-cffi')
& $python -m pip install -e (Join-Path $bindings 'leapc-python-api')
if ($LASTEXITCODE -ne 0) { throw 'Leap Python bindings installation failed.' }

& $python -c "import leap; print('Leap bindings ready:', leap.__file__)"
if ($LASTEXITCODE -ne 0) { throw 'Leap bindings could not be imported.' }

Write-Host ''
Write-Host 'Leap setup complete. Start the bridge with:'
Write-Host '.venv-leap\Scripts\python.exe bridge\leap_bridge.py'
